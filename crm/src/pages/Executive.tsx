import { useState, useCallback, useEffect, useRef } from 'react';
import { NavLink } from '@/components/NavLink';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useAuth } from '@/hooks/useAuth';
import UserMenu from '@/components/UserMenu';
import { useAlertSound } from '@/hooks/useAlertSound';
import UrgentCallPopup from '@/components/UrgentCallPopup';
import { useLeads, useRealtimeLeads, updateLeadStatus, createCallAttempt, assignLead, deleteLead, getPendingLeads, type Lead } from '@/hooks/useLeads';
import { useSettings } from '@/hooks/useSettings';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useDailyPerformanceTracker } from '@/hooks/useDailyPerformanceTracker';

import { supabase } from '@/integrations/supabase/client';
import LeadPriorityPanel from '@/components/LeadPriorityPanel';
import TodayCallsTable from '@/components/TodayCallsTable';
import MetricsBar from '@/components/MetricsBar';
import DailyGoalsBar from '@/components/DailyGoalsBar';
import AlertActivator from '@/components/AlertActivator';
import LeadsTable from '@/components/LeadsTable';
import LeadSuggestionPopup from '@/components/LeadSuggestionPopup';
import { useLeadSuggestion } from '@/hooks/useLeadSuggestion';
import GuidedTour from '@/components/GuidedTour';
import MissedCallsBell from '@/components/MissedCallsBell';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
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
  const { enabled: alertsEnabled, activate, deactivate, playAlert, playNewLeadChime, playReminderNudge, playCallStart, playUrgentAlarm } = useAlertSound();
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
  const [executiveEditorMode, setExecutiveEditorMode] = useState(false);

  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [urgentPopupLead, setUrgentPopupLead] = useState<Lead | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [todayCalledLeadIds, setTodayCalledLeadIds] = useState<Set<string>>(new Set());

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
  const answered = todayLeads.filter(l => l.status === 'scheduled' || l.status === 'asesoria_agendada' || l.status === 'disqualified' || l.status === 'answered' || l.status === 'done').length;
  const noAnswer = todayLeads.filter(l => l.status === 'first_call' || l.status === 'second_call').length;
  const contactRate = totalToday > 0 ? Math.round((answered / totalToday) * 100) : 0;

  const handleNewLead = useCallback((lead: Lead) => {
    if (isOnCall) {
      // Don't interrupt an active call — just refresh data, lead will appear in sidebar
      console.log('[Alerts] New lead arrived but user is on a call, not interrupting');
      if (alertsEnabled) playNewLeadChime();
      refetch();
      return;
    }
    setSelectedPendingId(null);
    setSkippedLeadIds(new Set()); // Reset skips when new lead arrives
    if (alertsEnabled) {
      console.log('[Alerts] Playing new lead chime');
      playNewLeadChime();
      setFlashingLead(lead);
    }
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    refetch();
  }, [alertsEnabled, isOnCall, playNewLeadChime, refetch]);

  useRealtimeLeads(handleNewLead, isDemo, user?.id);

  // NOTE: Removed UPDATE realtime subscription — caused double re-fetch on every action
  // (handleAction already calls refetch() explicitly after each update)

  // Lead suggestion system — suggests a random pending lead every 3 minutes
  const { suggestedLead, dismissSuggestion, resetSuggestionTimer } = useLeadSuggestion({
    intervalSeconds: 180,
    enabled: alertsEnabled && !isCallDialogOpen,
    pendingLeads: pendingAll,
    isOnCall,
    playNudge: playReminderNudge,
  });

  // Idle timer — visible counter + periodic reminder nudge every 60s

  // Track daily performance
  useDailyPerformanceTracker({
    userId: user?.id,
    todayLeads: todayLeadsForGoals,
    goalCalls: settings.daily_goal_calls,
    goalScheduled: settings.daily_goal_scheduled,
  });

  const { idleSeconds, resetIdleTimer } = useIdleTimer({
    enabled: alertsEnabled && !isCallDialogOpen,
    hasPendingLeads: pendingAll.length > 0,
    reminderIntervalSeconds: 60,
    playReminderNudge,
    urgentThresholdSeconds: 120,
    onUrgentIdle: useCallback(() => {
      playUrgentAlarm();
      // Pick a random pending lead for the popup
      if (pendingAll.length > 0) {
        const lead = pendingAll[Math.floor(Math.random() * pendingAll.length)];
        setUrgentPopupLead(lead);
      }
    }, [playUrgentAlarm, pendingAll]),
  });

  const handleAction = async (leadId: string, action: string, advisorId?: string, notes?: string) => {
    if (!user) return;

    // Reset to new — just update status, no call attempt
    if (action === 'new') {
      await supabase.from('leads').update({
        status: 'new',
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
      case 'scheduled':
        status = 'asesoria_agendada';
        outcome = 'scheduled';
        break;
      case 'no_qualify':
        status = 'disqualified';
        outcome = 'no_qualify';
        break;
      case 'first_call':
        status = 'first_call';
        outcome = 'first_call';
        break;
      case 'second_call':
        status = 'second_call';
        outcome = 'second_call';
        break;
      case 'bad_number':
        status = 'bad_number';
        outcome = 'bad_number';
        break;
      case 'reciclado':
        status = 'reciclado';
        outcome = 'reciclado';
        break;
    }

    // Combine assignment + status in a single update to avoid triggering
    // a realtime UPDATE with status still 'new'
    const lead = leads.find(l => l.id === leadId);
    const updateData: any = { status, last_attempt_at: new Date().toISOString() };
    if (status === 'asesoria_agendada') updateData.scheduled_at = new Date().toISOString();
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
    resetSuggestionTimer();
    resetIdleTimer();
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
      departamento_reservado: 'Departamento reservado',
      reciclado: 'Reciclado',
    };
    toast.success(`Lead marcado como: ${statusLabels[action] || action}`);
    await refetch();
  };

  // When user clicks LLAMAR on a lead, mark it as "calling" and track it
  const handleCallClick = async (leadId: string) => {
    if (!user) return;
    playCallStart(); // Short call-start sound
    setIsOnCall(true);
    const lead = leads.find(l => l.id === leadId);
    // Recicladora siempre toma posesión del lead para poder continuar con el flujo
    if (lead && (!lead.assigned_to || isRecicladora)) {
      await assignLead(leadId, user.id);
    }
    await updateLeadStatus(leadId, 'calling');
    resetSuggestionTimer();
    resetIdleTimer();
    await refetch();
  };

  const handleSuggestionCall = (leadId: string) => {
    dismissSuggestion();
    resetSuggestionTimer();
    resetIdleTimer();
    // Select this lead in the priority panel
    setSelectedPendingId(leadId);
    setFlashingLead(null);
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
      status: 'new',
      priority: 'media',
      is_demo: true,
      sueldo_liquido_raw: `${(800 + Math.floor(Math.random() * 1200)) * 1000} a ${(1500 + Math.floor(Math.random() * 1000)) * 1000}`,
      proyecto: ['Edificio Parque Norte', 'Torre Central', 'Mirador del Valle'][Math.floor(Math.random() * 3)],
      rut: `${Math.floor(10000000 + Math.random() * 9000000)}-${Math.floor(Math.random() * 10)}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Urgent 2-min idle popup */}
      {urgentPopupLead && (
        <UrgentCallPopup
          lead={urgentPopupLead}
          onDismiss={() => setUrgentPopupLead(null)}
          onCallNow={(leadId) => {
            setUrgentPopupLead(null);
            setSelectedPendingId(leadId);
            setFlashingLead(null);
            mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            resetIdleTimer();
          }}
        />
      )}

      {/* Lead Suggestion Popup */}
      {suggestedLead && (
        <LeadSuggestionPopup
          lead={suggestedLead}
          onDismiss={dismissSuggestion}
          onCallNow={handleSuggestionCall}
        />
      )}

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
          {!isDemo && (user?.email === 'susan.petersen@proppi.cl' || role === 'admin' || isRecicladora) && (
            <button
              onClick={async () => {
                const { data, error } = await supabase
                  .from('leads')
                  .select('*')
                  .eq('status', 'reciclado');
                if (error || !data || data.length === 0) {
                  toast.error('No hay leads reciclados para descargar');
                  return;
                }
                // Fetch ejecutiva names for all assigned_to user ids
                const userIds = [...new Set(data.map((l: any) => l.assigned_to).filter(Boolean))];
                let profileMap: Record<string, string> = {};
                if (userIds.length > 0) {
                  const { data: profiles } = await supabase
                    .from('profiles')
                    .select('user_id, full_name')
                    .in('user_id', userIds);
                  (profiles ?? []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });
                }
                const rows = data.map((l: any) => ({
                  Nombre: l.name,
                  Teléfono: l.phone,
                  Email: l.email || '',
                  RUT: l.rut || '',
                  Ejecutiva: l.assigned_to ? (profileMap[l.assigned_to] || '—') : '—',
                  Estado: 'Reciclado',
                  Fuente: l.source || '',
                  'Renta Líquida': l.sueldo_liquido_raw || (l.sueldo_liquido ? `$${l.sueldo_liquido.toLocaleString('es-CL')}` : ''),
                  DICOM: l.en_dicom ? 'Sí' : 'No',
                  Proyecto: l.proyecto || '',
                  Prioridad: l.priority || '',
                  'Fecha Creación': new Date(l.created_at).toLocaleString('es-CL'),
                  'Último Cambio': l.status_changed_at ? new Date(l.status_changed_at).toLocaleString('es-CL') : '',
                  'Último Intento': l.last_attempt_at ? new Date(l.last_attempt_at).toLocaleString('es-CL') : '',
                }));
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(rows);
                const colWidths = Object.keys(rows[0]).map(key => ({
                  wch: Math.max(key.length, ...rows.map((r: any) => String(r[key]).length).slice(0, 50)) + 2,
                }));
                ws['!cols'] = colWidths;
                XLSX.utils.book_append_sheet(wb, ws, 'Reciclados');
                const now = new Date();
                const dateStr = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
                XLSX.writeFile(wb, `RECICLADOS - ${dateStr}.xlsx`, { bookType: 'xlsx' });
                toast.success(`${data.length} leads reciclados descargados`);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              ♻️ Descargar Reciclados
            </button>
          )}
          <div data-tour="alert-activator">
            <AlertActivator
              enabled={alertsEnabled}
              onActivate={activate}
              onTest={() => playAlert(3)}
            />
          </div>
          {user && (
            <MissedCallsBell
              userId={user.id}
              onSelectLead={(leadId) => {
                setSelectedPendingId(leadId);
                setFlashingLead(null);
                mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
          <NavLink data-tour="nav-advisor" to="/advisor" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Asesorías
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
          {/* Idle Timer */}
          {pendingAll.length > 0 && idleSeconds > 0 && (
            <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
              idleSeconds >= 120
                ? 'bg-destructive/15 border-destructive/40 animate-pulse'
                : idleSeconds >= 60
                  ? 'bg-warning/15 border-warning/40'
                  : 'bg-muted border-border'
            }`}>
              <span className="text-xs">⏱️</span>
              <span className={`text-sm font-mono font-bold ${
                idleSeconds >= 120
                  ? 'text-destructive'
                  : idleSeconds >= 60
                    ? 'text-warning'
                    : 'text-muted-foreground'
              }`}>
                {Math.floor(idleSeconds / 60)}:{String(idleSeconds % 60).padStart(2, '0')} sin llamar
              </span>
            </div>
          )}

          {/* Leads table - fixed height to keep its size */}
          <div style={{ height: 'calc(60vh - 70px)', minHeight: '350px' }}>
            <LeadsTable
              leads={executiveLeads}
              selectedLeadId={selectedPendingId ?? priorityLead?.id}
              onSelect={(lead) => {
                setSelectedPendingId(lead.id);
                setFlashingLead(null);
              }}
            />
          </div>

          {/* Today's Calls - generous height */}
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
                if (!open) {
                  resetIdleTimer();
                  resetSuggestionTimer();
                }
              }}
            />
          </div>
        </div>
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
                let phone = newLeadPhone.trim().replace(/[\s\-\(\)]/g, '');
                if (/^9\d{8}$/.test(phone)) phone = '+56' + phone;
                else if (/^56\d{9}$/.test(phone)) phone = '+' + phone;
                else if (!phone.startsWith('+')) phone = '+' + phone;
                await supabase.from('leads').insert({
                  name: newLeadName.trim(),
                  phone,
                  source: 'manual',
                  status: 'new',
                  priority: 'media',
                  is_demo: false,
                  assigned_to: user?.id,
                });
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

      <GuidedTour page="executive" isDemo={isDemo} />
    </div>
  );
};

export default Executive;
