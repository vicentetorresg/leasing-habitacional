import { useState, useCallback, useEffect, useRef } from 'react';
import { NavLink } from '@/components/NavLink';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useAuth } from '@/hooks/useAuth';
import UserMenu from '@/components/UserMenu';
import { useLeads, useRealtimeLeads, updateLeadStatus, createCallAttempt, assignLead, deleteLead, getPendingLeads, type Lead } from '@/hooks/useLeads';
import { useSettings } from '@/hooks/useSettings';
import { useDailyPerformanceTracker } from '@/hooks/useDailyPerformanceTracker';

import { supabase } from '@/integrations/supabase/client';
import LeadPriorityPanel from '@/components/LeadPriorityPanel';
import TodayCallsTable from '@/components/TodayCallsTable';
import MetricsBar from '@/components/MetricsBar';
import DailyGoalsBar from '@/components/DailyGoalsBar';
import LeadsTable from '@/components/LeadsTable';
import GuidedTour from '@/components/GuidedTour';
import WeeklyReport from '@/components/WeeklyReport';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const Executive = () => {
  const { user, role, fullName, signOut } = useAuth();
  const { isDemo } = useDemoMode();
  const demoDisplayName = isDemo ? 'Javiera Contreras' : fullName;
  const isRecicladora = role === 'recicladora';
  const roleLabel = isDemo ? 'Admin' : role === 'admin' ? 'CEO' : role === 'ejecutiva' ? 'Telemarketing' : role === 'asesor' ? 'Asesor Inmobiliario' : role === 'recicladora' ? 'Recicladora' : '';
  const { leads, refetch } = useLeads(user?.id, role === 'admin', user?.email, isRecicladora);
  const { settings } = useSettings();
  const [flashingLead, setFlashingLead] = useState<Lead | null>(null);
  const [isOnCall, setIsOnCall] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null);
  const [skippedLeadIds, setSkippedLeadIds] = useState<Set<string>>(new Set());
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [advisorsList, setAdvisorsList] = useState<{ user_id: string; full_name: string }[]>([]);
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [showDailyPlan, setShowDailyPlan] = useState(false);
  const [dailyPlanLeads, setDailyPlanLeads] = useState<any[]>([]);
  const [dailyPlanFilter, setDailyPlanFilter] = useState('all');
  const [executiveEditorMode, setExecutiveEditorMode] = useState(false);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);

  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [todayCalledLeadIds, setTodayCalledLeadIds] = useState<Set<string>>(new Set());
  const [perfRows, setPerfRows] = useState<{ date: string; full_name: string; calls_made: number; scheduled_made: number }[] | null>(null);

  const DEMO_ADVISOR_NAMES = ['Alejandro Reyes', 'Camila Fuentes', 'Sebastián Mora', 'Daniela Pinto'];

  // Fetch advisors for scheduling
  useEffect(() => {
    let cancelled = false;
    const fetchAdvisors = async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['asesor', 'recicladora']);
      if (cancelled) return;
      if (roleData && roleData.length > 0) {
        const sortedIds = roleData.map(r => r.user_id).sort();
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', sortedIds);
        if (!cancelled) {
          const list = (profiles ?? []).sort((a, b) => a.user_id.localeCompare(b.user_id)) as { user_id: string; full_name: string }[];
          if (isDemo) {
            setAdvisorsList(list.map((a, i) => ({ ...a, full_name: DEMO_ADVISOR_NAMES[i % DEMO_ADVISOR_NAMES.length] })));
          } else {
            setAdvisorsList(list);
          }
        }
      }
    };
    fetchAdvisors();
    return () => { cancelled = true; };
  }, [isDemo]);

  // Manual & incoming calls disabled (Twilio desactivado)
  const manualCalls: { id: string; phone: string; created_at: string; status: string }[] = [];
  const incomingCalls: { id: string; lead_name: string; lead_phone: string; lead_id: string | null; status: string; created_at: string }[] = [];

  // Fetch call_attempts from today to get accurate "calls made today"
  useEffect(() => {
    if (!user?.id) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    supabase
      .from('call_attempts')
      .select('lead_id')
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString())
      .then(({ data }) => {
        if (data) setTodayCalledLeadIds(new Set(data.map(r => r.lead_id)));
      });
  }, [user?.id, leads]);

  // Fetch daily performance table (auto-refresh every 60s)
  useEffect(() => {
    const fetchPerf = async () => {
      const { data, error } = await supabase
        .from('daily_performance' as any)
        .select('date, user_id, calls_made, scheduled_made')
        .order('date', { ascending: false })
        .limit(200);
      if (error) { console.error('[perf]', error); setPerfRows([]); return; }
      if (!data) { setPerfRows([]); return; }
      const userIds = [...new Set((data as any[]).map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });
      setPerfRows((data as any[])
        .map((r: any) => ({
          date: r.date,
          full_name: nameMap[r.user_id] ?? r.user_id,
          calls_made: r.calls_made,
          scheduled_made: r.scheduled_made,
        }))
        .sort((a, b) => b.date.localeCompare(a.date) || a.full_name.localeCompare(b.full_name))
      );
    };
    fetchPerf();
    const interval = setInterval(fetchPerf, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Get ALL pending leads (carry over from previous days)
  const pendingAll = getPendingLeads(leads, user?.id);

  // Leads available for priority (exclude recently actioned ones)
  const availableForPriority = pendingAll.filter(l => !skippedLeadIds.has(l.id));
  
  // If a lead is selected (from sidebar or table), show it as priority
  const selectedLead = selectedPendingId ? (pendingAll.find(l => l.id === selectedPendingId) || leads.find(l => l.id === selectedPendingId)) ?? null : null;
  const priorityLead = flashingLead || selectedLead || (availableForPriority.length > 0 ? availableForPriority[0] : null);
  const otherPending = pendingAll.filter(l => l.id !== priorityLead?.id);

  // Only archived leads are hidden from executive view — all other advisor-stage leads
  // should remain visible as "Agendado"
  const HIDDEN_STATUSES = ['archived'];

  // All leads relevant to executive (only exclude archived)
  const executiveLeads = leads.filter(l => !HIDDEN_STATUSES.includes(l.status));

  // Today's leads — only leads with a real call_attempt today
  const todayLeads = leads.filter(l =>
    todayCalledLeadIds.has(l.id) && !HIDDEN_STATUSES.includes(l.status)
  );

  // ejecutivas ya solo tienen sus leads (filtrado en useLeads); admin ve todos
  const todayLeadsForGoals = todayLeads;

  // Metrics
  const totalToday = todayLeads.length;
  const answered = todayLeads.filter(l => l.status === 'contactado' || l.status === 'cliente_interesado' || l.status === 'solicitando_documentos' || l.status === 'esperando_documentos').length;
  const noAnswer = todayLeads.filter(l => l.status === 'recontactar' || l.status === 'no_contesta').length;
  const contactRate = totalToday > 0 ? Math.round((answered / totalToday) * 100) : 0;

  const handleNewLead = useCallback((lead: Lead) => {
    if (isOnCall) {
      refetch();
      return;
    }
    setSelectedPendingId(null);
    setSkippedLeadIds(new Set());
    setFlashingLead(lead);
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    refetch();
  }, [isOnCall, refetch]);

  useRealtimeLeads(handleNewLead, isDemo, user?.id);

  // NOTE: Removed UPDATE realtime subscription — caused double re-fetch on every action
  // (handleAction already calls refetch() explicitly after each update)

  // Track daily performance
  useDailyPerformanceTracker({
    userId: user?.id,
    todayLeads: todayLeadsForGoals,
    goalCalls: settings.daily_goal_calls,
    goalScheduled: settings.daily_goal_scheduled,
  });

  const handleAction = async (leadId: string, action: string, advisorId?: string, notes?: string) => {
    if (!user) return;

    // Reset to new — just update status, no call attempt
    if (action === 'new') {
      await supabase.from('leads').update({
        status: 'nuevo',
        advisor_id: null,
        last_attempt_at: null
      }).eq('id', leadId);
      toast.success('Lead vuelto a Nuevo');
      refetch();
      return;
    }

    let status = action;
    let outcome = action;

    switch (action) {
      case 'cliente_interesado':
        status = 'solicitando_documentos';
        outcome = 'cliente_interesado';
        break;
      case 'no_califica':
        status = 'no_califica';
        outcome = 'no_califica';
        break;
      case 'contactado':
        status = 'contactado';
        outcome = 'contactado';
        break;
      case 'recontactar':
        status = 'recontactar';
        outcome = 'recontactar';
        break;
      case 'no_contesta':
        status = 'no_contesta';
        outcome = 'no_contesta';
        break;
      case 'esperando_documentos':
        status = 'esperando_documentos';
        outcome = 'esperando_documentos';
        break;
    }

    const lead = leads.find(l => l.id === leadId);
    const updateData: any = { status, last_attempt_at: new Date().toISOString() };
    // Recicladora siempre toma posesión del lead para poder editarlo después
    if (lead && (!lead.assigned_to || isRecicladora)) updateData.assigned_to = user.id;
    if (advisorId) updateData.advisor_id = advisorId;
    console.log('[handleAction] Updating lead', leadId, 'to status:', status, 'updateData:', updateData);
    const { error: updateError } = await supabase.from('leads').update(updateData).eq('id', leadId);
    if (updateError) {
      console.error('[handleAction] DB update FAILED:', updateError);
      toast.error('Error al actualizar el estado del lead');
      return;
    }
    console.log('[handleAction] DB update SUCCESS for lead', leadId, 'status:', status);

    // SMS desactivado para reducir costos — descomentar para reactivar
    // if (status === 'first_call' || status === 'second_call') {
    //   supabase.functions.invoke('send-lead-sms', {
    //     body: { lead_id: leadId },
    //   }).then(({ data, error }) => {
    //     if (error) console.error('[SMS] Error:', error);
    //     else if (data?.skipped) console.log('[SMS] Already sent for lead', leadId);
    //     else console.log('[SMS] Sent successfully for lead', leadId);
    //   });
    // }

    // Get attempt count and save note in parallel
    const [{ data: attempts }] = await Promise.all([
      supabase
        .from('call_attempts')
        .select('attempt_number')
        .eq('lead_id', leadId)
        .order('attempt_number', { ascending: false })
        .limit(1),
      notes
        ? supabase.from('lead_notes').insert({ lead_id: leadId, user_id: user.id, note: notes })
        : Promise.resolve(null),
    ]);

    const nextAttempt = (attempts && attempts.length > 0 ? attempts[0].attempt_number : 0) + 1;
    await createCallAttempt(leadId, user.id, nextAttempt, outcome, notes);

    if (flashingLead?.id === leadId) setFlashingLead(null);
    if (selectedPendingId === leadId) setSelectedPendingId(null);
    // Skip this lead from priority so the next one takes over
    setSkippedLeadIds(prev => new Set(prev).add(leadId));
    setIsOnCall(false); // Call is done after action
    const statusLabels: Record<string, string> = {
      scheduled: 'Agendado',
      no_qualify: 'No califica',
      first_call: 'Primer llamado',
      second_call: 'Segundo llamado',
      bad_number: 'Nro Malo / No quiere invertir',
      disqualified: 'Descalificado',
      asesoria_agendada: 'Asesoría agendada',
      asesoria_concretada: 'Asesoría concretada',
      recontactar: 'Recontactar',
      esperando_documentos: 'Esperando Documentos',
      departamento_reservado: 'Departamento reservado',
      reciclado: 'Reciclado',
    };
    toast.success(`Lead marcado como: ${statusLabels[action] || action}`);
    await refetch();
  };

  // When user clicks LLAMAR on a lead, mark it as "calling" and track it
  const handleCallClick = async (leadId: string) => {
    if (!user) return;
    setIsOnCall(true);
    const lead = leads.find(l => l.id === leadId);
    if (lead && (!lead.assigned_to || isRecicladora)) {
      await assignLead(leadId, user.id);
    }
    await updateLeadStatus(leadId, 'calling');
    await refetch();
  };

  const handleDeleteLead = async (leadId: string) => {
    const { error } = await deleteLead(leadId);
    if (error) {
      toast.error('Error al eliminar lead');
    } else {
      toast.success('Lead eliminado');
      if (flashingLead?.id === leadId) setFlashingLead(null);
      if (selectedPendingId === leadId) setSelectedPendingId(null);
      refetch();
    }
    setDeleteConfirmId(null);
  };

  const DEMO_NAMES = [
    'María González', 'Pedro Muñoz', 'Carolina Silva', 'José Fernández', 'Andrea López',
    'Claudio Rojas', 'Valentina Herrera', 'Nicolás Díaz', 'Francisca Morales', 'Ignacio Vargas',
  ];

  const handleDemoNewLead = async () => {
    if (!isDemo) return;
    const name = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
    const phone = `+569${Math.floor(10000000 + Math.random() * 90000000)}`;
    await supabase.from('leads').insert({
      name,
      phone,
      source: 'demo',
      status: 'nuevo',
      priority: 'media',
      is_demo: true,
      sueldo_liquido_raw: `${(800 + Math.floor(Math.random() * 1200)) * 1000} a ${(1500 + Math.floor(Math.random() * 1000)) * 1000}`,
      proyecto: ['Edificio Parque Norte', 'Torre Central', 'Mirador del Valle'][Math.floor(Math.random() * 3)],
      rut: `${Math.floor(10000000 + Math.random() * 9000000)}-${Math.floor(Math.random() * 10)}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <span className="text-2xl">🚨</span>
          <h1 className="text-xl font-black text-gradient-brand">ALERTA DE LEADS</h1>
      {pendingAll.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold cursor-help"
              title="Leads que aún no han sido gestionados (nuevos, no contestados, ocupados o en llamada)"
            >
              {otherPending.length + (priorityLead ? 1 : 0)} leads sin gestionar
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isDemo && (
            <button
              onClick={handleDemoNewLead}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors animate-pulse"
            >
              🧪 PRUEBA UN NUEVO LEAD
            </button>
          )}
          {!isDemo && !isRecicladora && (
            <button
              onClick={() => setShowNewLeadForm(true)}
              className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-bold hover:bg-accent/90 transition-colors"
            >
              ➕ Nuevo Lead
            </button>
          )}
          {!isDemo && (
            <button
              onClick={async () => {
                const EXCLUDED = ['set_hipotecario_firmado', 'escritura_firmada', 'cbr_listo', 'rechazado', 'archived'];
                const { data } = await supabase
                  .from('leads')
                  .select('id, name, phone, status, cuando_comprar, source, created_at')
                  .eq('is_demo', false)
                  .not('cuando_comprar', 'is', null)
                  .neq('cuando_comprar', '')
                  .order('cuando_comprar', { ascending: true });
                setDailyPlanLeads((data || []).filter((l: any) => !EXCLUDED.includes(l.status)));
                setDailyPlanFilter('all');
                setShowDailyPlan(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors"
            >
              📅 Planificación Diaria
            </button>
          )}
          {!isDemo && (
            <button
              onClick={() => setShowWeeklyReport(true)}
              className="px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-600 text-sm font-bold hover:bg-violet-500/20 transition-colors"
            >
              📊 Reporte Semanal
            </button>
          )}
          <NavLink to="/viviendas" className="px-3 py-1.5 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors">
            Viviendas
          </NavLink>
          <NavLink data-tour="nav-advisor" to="/advisor" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Seguimiento
          </NavLink>
          <UserMenu
            fullName={demoDisplayName}
            email={user?.email ?? ''}
            roleLabel={roleLabel}
            onSignOut={signOut}
            executiveEditorMode={executiveEditorMode}
            onToggleExecutiveEditorMode={role === 'admin' ? () => setExecutiveEditorMode(v => !v) : undefined}
          />
        </div>
      </div>

      {/* Metrics */}
      <div data-tour="metrics-bar">
        <MetricsBar
          totalToday={totalToday}
          answered={answered}
          noAnswer={noAnswer}
          contactRate={contactRate}
        />
      </div>

      {/* Daily Goals Progress */}
      <DailyGoalsBar
        todayLeads={todayLeadsForGoals}
        goalCalls={settings.daily_goal_calls}
        goalScheduled={settings.daily_goal_scheduled}
      />

      {/* Main Content */}
      <div className="flex gap-3 p-3" style={{ minHeight: 'calc(100vh - 140px)' }}>
        {/* Left: Table + Today's Calls stacked */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Leads table or Viviendas */}
          <div style={{ height: 'calc(75vh - 70px)', minHeight: '450px' }}>
            <LeadsTable
              leads={executiveLeads}
              selectedLeadId={selectedPendingId ?? priorityLead?.id}
              onSelect={(lead) => {
                setSelectedPendingId(lead.id);
                setFlashingLead(null);
              }}
            />
          </div>

          {/* Today's Calls */}
          <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col" style={{ height: 'calc(30vh - 30px)', minHeight: '180px' }}>
            <div className="px-3 py-2 text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border shrink-0">
              📊 Llamadas de Hoy ({todayLeads.length})
            </div>
            <div className="flex-1 overflow-auto">
              <TodayCallsTable
                leads={todayLeads}
                manualCalls={manualCalls}
                incomingCalls={incomingCalls}
                goalCalls={settings.daily_goal_calls}
                goalScheduled={settings.daily_goal_scheduled}
                onStatusChange={async (leadId, newStatus, advisorId) => await handleAction(leadId, newStatus, advisorId)}
                onSelectLead={(leadId) => {
                  setSelectedPendingId(leadId);
                  setFlashingLead(null);
                }}
                advisors={advisorsList}
              />
            </div>
          </div>
        </div>

        {/* Right: Lead Detail Panel - sticky */}
        <div className="w-[440px] shrink-0 sticky top-0 self-start overflow-y-auto" style={{ maxHeight: 'calc(100vh - 155px)' }} ref={mainScrollRef}>
          <div data-tour="priority-panel">
            <LeadPriorityPanel
              lead={priorityLead}
              isFlashing={!!flashingLead}
              onAction={(leadId, action, advisorId, notes) => handleAction(leadId, action, advisorId, notes)}
              onDelete={role === 'admin' ? (leadId) => setDeleteConfirmId(leadId) : undefined}
              animationKey={`${priorityLead?.id}-${selectedPendingId}`}
              onCallClick={handleCallClick}
              onLeadUpdated={refetch}
              executiveEditorMode={executiveEditorMode}
              onCallDialogOpenChange={(open) => {
                setIsCallDialogOpen(open);
              }}
            />
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="px-3 pb-6">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">📊 Rendimiento diario</div>
        {perfRows === null ? (
          <p className="text-xs text-muted-foreground">Cargando...</p>
        ) : perfRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin datos aún.</p>
        ) : (
          <table className="text-sm border-collapse select-all" style={{ fontFamily: 'monospace' }}>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="py-1.5 pr-8">Fecha</th>
                <th className="py-1.5 pr-8">Usuario</th>
                <th className="py-1.5 pr-8 text-right">Llamados</th>
                <th className="py-1.5 text-right">Agendados</th>
              </tr>
            </thead>
            <tbody>
              {perfRows.map((r, i) => (
                <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="py-1 pr-8 text-muted-foreground">{r.date}</td>
                  <td className="py-1 pr-8 font-medium text-foreground">{r.full_name}</td>
                  <td className="py-1 pr-8 text-right">{r.calls_made}</td>
                  <td className="py-1 text-right">{r.scheduled_made}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Lead Dialog */}
      <Dialog open={showNewLeadForm} onOpenChange={setShowNewLeadForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>➕ Crear Lead Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-bold text-foreground mb-1 block">Nombre *</label>
              <input
                value={newLeadName}
                onChange={e => setNewLeadName(e.target.value)}
                placeholder="Nombre completo"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-1 block">Teléfono *</label>
              <input
                value={newLeadPhone}
                onChange={e => setNewLeadPhone(e.target.value)}
                placeholder="+56912345678"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewLeadForm(false); setNewLeadName(''); setNewLeadPhone(''); }}>Cancelar</Button>
            <Button
              disabled={!newLeadName.trim() || !newLeadPhone.trim()}
              onClick={async () => {
                if (!user?.id) {
                  toast.error('Sesión no disponible, refresca la página');
                  return;
                }
                let phone = newLeadPhone.trim().replace(/[\s\-\(\)]/g, '');
                if (/^9\d{8}$/.test(phone)) phone = '+56' + phone;
                else if (/^56\d{9}$/.test(phone)) phone = '+' + phone;
                else if (!phone.startsWith('+')) phone = '+' + phone;
                const { error } = await supabase.from('leads').insert({
                  name: newLeadName.trim(),
                  phone,
                  source: 'manual',
                  status: 'nuevo',
                  priority: 'media',
                  is_demo: false,
                  assigned_to: user?.id,
                });
                if (error) {
                  console.error('[NewLead] Insert failed:', error);
                  toast.error('Error al crear lead: ' + error.message);
                  return;
                }
                setShowNewLeadForm(false);
                setNewLeadName('');
                setNewLeadPhone('');
                toast.success('Lead creado');
                refetch();
              }}
            >
              Crear Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🗑️ ¿Estás seguro que quieres eliminar este lead?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se eliminará permanentemente el lead y todos sus datos asociados (notas, intentos de llamada). Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteLead(deleteConfirmId)}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Twilio desactivado — sin llamada manual ni botón flotante */}

      {/* Daily Plan Dialog */}
      <Dialog open={showDailyPlan} onOpenChange={setShowDailyPlan}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📅 Planificación Diaria</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 mb-4">
            {['all', ...Array.from(new Set(dailyPlanLeads.map((l: any) => l.cuando_comprar).filter(Boolean))).sort()].map((h) => (
              <button
                key={h}
                onClick={() => setDailyPlanFilter(h)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  dailyPlanFilter === h
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {h === 'all' ? 'Todos' : h === 'lo_antes_posible' ? '🔥 Lo antes posible' : h === 'dentro_3_meses' ? 'Dentro de 3 meses' : h === 'mas_3_meses' ? 'En más de 3 meses' : h}
              </button>
            ))}
          </div>
          {(() => {
            const filtered = dailyPlanFilter === 'all'
              ? dailyPlanLeads
              : dailyPlanLeads.filter((l: any) => l.cuando_comprar === dailyPlanFilter);
            if (filtered.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">No hay leads con intención de compra declarada.</p>;
            const statusLabels: Record<string, string> = {
              nuevo: '🟡 Nuevo', contactado: '🔵 Contactado', recontactar: '🟠 Recontactar',
              no_contesta: '📵 No Contesta', no_califica: '⛔ No Califica', calling: '📞 Llamando',
              esperando_documentos: '📄 Esperando Docs', interesado: '🟢 Interesado',
              cotizacion_enviada: '📧 Cotización', aprobado: '✅ Aprobado',
            };
            return (
              <div className="space-y-2">
                {filtered.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.phone}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">{l.cuando_comprar === 'lo_antes_posible' ? '🔥 Pronto' : l.cuando_comprar === 'dentro_3_meses' ? '3 meses' : l.cuando_comprar === 'mas_3_meses' ? '+3 meses' : l.cuando_comprar}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{statusLabels[l.status] || l.status}</span>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center pt-2">{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <GuidedTour page="executive" isDemo={isDemo} />
      <WeeklyReport open={showWeeklyReport} onClose={() => setShowWeeklyReport(false)} />
    </div>
  );
};

export default Executive;
