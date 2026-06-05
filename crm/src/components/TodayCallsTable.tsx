import type { Lead } from '@/hooks/useLeads';
import type { DailyGoals } from '@/hooks/useSettings';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function formatSource(source: string): string {
  if (source.toLowerCase().includes('facebook') || source.toLowerCase() === 'fb') return '📘 FB';
  if (source.toLowerCase().includes('instagram') || source.toLowerCase() === 'ig') return '📸 IG';
  return source;
}

interface AdvisorProfile {
  user_id: string;
  full_name: string;
}

interface CallAttemptInfo {
  outcome: string;
  duration_seconds: number | null;
  created_at: string;
}

interface ManualCallRow {
  id: string;
  phone: string;
  created_at: string;
  status: string;
}

interface IncomingCallRow {
  id: string;
  lead_name: string;
  lead_phone: string;
  lead_id: string | null;
  status: string;
  created_at: string;
}

interface TodayCallsTableProps {
  leads: Lead[];
  manualCalls?: ManualCallRow[];
  incomingCalls?: IncomingCallRow[];
  goalCalls: DailyGoals;
  goalScheduled: DailyGoals;
  onStatusChange?: (leadId: string, newStatus: string, advisorId?: string) => void;
  onSelectLead?: (leadId: string) => void;
  advisors?: AdvisorProfile[];
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  first_call: 'Primer llamado',
  second_call: 'Segundo llamado',
  scheduled: '✅ Agendado',
  asesoria_agendada: '✅ Agendado',
  disqualified: 'No califica',
  bad_number: 'Nro Malo/No Invierte',
  calling: 'Llamando',
};

const CHANGEABLE_STATUSES = ['new', 'scheduled', 'disqualified', 'first_call', 'second_call', 'bad_number'];

function getUiStatus(status: string): string {
  if (status === 'calling') return 'new';
  if (status === 'asesoria_agendada') return 'scheduled';
  return status;
}

const DAY_NAMES: string[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function getTodayGoal(goals: DailyGoals): number {
  const dayName = DAY_NAMES[new Date().getDay()] as keyof DailyGoals;
  return goals[dayName] ?? 0;
}

const CALL_OUTCOME_LABELS: Record<string, string> = {
  // Resultados reales de llamada telefónica (Twilio)
  'answered': '✅ Contestó',
  'no_answer': '📵 No contestó',
  'busy': '📳 Ocupado',
  'failed': '❌ Falló',
  'canceled': '🚫 Cancelado',
  'in-progress': '📞 En curso',
  'in_progress': '📞 En curso',
  'initiated': '📞 Llamó (sin respuesta)',
  // Disposiciones (resultado de gestión)
  'scheduled': '✅ Agendó asesoría',
  'first_call': '📞 Primer intento',
  'second_call': '📞 Segundo intento',
  'no_qualify': '🚫 No califica',
  'bad_number': '❌ Nro Malo/No Invierte',
  'answered_no_qualify': '📞 Contestó, no califica',
  'disqualified': '🚫 No califica',
};

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds === 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const TodayCallsTable = ({ leads, manualCalls = [], incomingCalls = [], goalCalls, goalScheduled, onStatusChange, onSelectLead, advisors = [] }: TodayCallsTableProps) => {
  const [filter, setFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'outgoing' | 'incoming'>('all');
  const [scheduleLeadId, setScheduleLeadId] = useState<string | null>(null);
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [callData, setCallData] = useState<Record<string, CallAttemptInfo>>({});
  // Optimistic status overrides so UI updates immediately
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, string>>({});

  // Clear optimistic overrides only when the actual lead data has caught up
  useEffect(() => {
    setOptimisticStatus(prev => {
      const next: Record<string, string> = {};
      for (const [leadId, optStatus] of Object.entries(prev)) {
        const lead = leads.find(l => l.id === leadId);
        // Keep optimistic override only if the DB hasn't caught up yet
        if (lead && getUiStatus(lead.status) !== optStatus) {
          next[leadId] = optStatus;
        }
        // If lead status matches optimistic, drop it (synced)
      }
      // Return same reference if nothing changed to avoid re-render loop
      if (Object.keys(next).length === Object.keys(prev).length &&
          Object.entries(next).every(([k, v]) => prev[k] === v)) {
        return prev;
      }
      return next;
    });
  }, [leads]);

  // Fetch latest call attempt for each lead — re-fetch when leads change
  useEffect(() => {
    if (leads.length === 0) {
      setCallData({});
      return;
    }
    const leadIds = leads.map(l => l.id);
    const fetchCallAttempts = async () => {
      const { data } = await supabase
        .from('call_attempts')
        .select('lead_id, outcome, duration_seconds, created_at')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false });
      if (data) {
        const map: Record<string, CallAttemptInfo> = {};
        for (const row of data) {
          if (!map[row.lead_id]) {
            map[row.lead_id] = {
              outcome: row.outcome,
              duration_seconds: row.duration_seconds,
              created_at: row.created_at,
            };
          }
        }
        setCallData(map);
      }
    };
    fetchCallAttempts();
  }, [leads]);

  const statuses = ['all', 'new', 'scheduled', 'disqualified', 'first_call', 'second_call', 'bad_number'];
  const filteredUnsorted = filter === 'all'
    ? leads
    : leads.filter(l => getUiStatus(l.status) === filter);
  const filtered = [...filteredUnsorted].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Metrics
  const totalCalls = leads.filter(l => l.status !== 'new').length;
  const totalScheduled = leads.filter(l => l.status === 'scheduled' || l.status === 'asesoria_agendada').length;
  const callGoal = getTodayGoal(goalCalls);
  const scheduledGoal = getTodayGoal(goalScheduled);
  const callPct = callGoal > 0 ? Math.min(100, Math.round((totalCalls / callGoal) * 100)) : 0;
  const scheduledPct = scheduledGoal > 0 ? Math.min(100, Math.round((totalScheduled / scheduledGoal) * 100)) : 0;

  const handleRowClick = (lead: Lead) => {
    onSelectLead?.(lead.id);
  };

  const handleStatusChange = (leadId: string, newStatus: string) => {
    if (newStatus === 'scheduled' && advisors.length > 0) {
      setScheduleLeadId(leadId);
      setSelectedAdvisor('');
      return;
    }
    // Optimistic update — show new status immediately
    setOptimisticStatus(prev => ({ ...prev, [leadId]: newStatus }));
    onStatusChange?.(leadId, newStatus);
  };

  const handleScheduleConfirm = () => {
    if (!scheduleLeadId || !selectedAdvisor) return;
    onStatusChange?.(scheduleLeadId, 'scheduled', selectedAdvisor);
    setScheduleLeadId(null);
    setSelectedAdvisor('');
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Compact Counters */}
      <div className="grid grid-cols-2 gap-2 px-3 py-2 border-b border-border">
        <div className="flex items-center gap-3 px-3 py-1.5 bg-primary/10 rounded-lg">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-primary">{totalCalls}</span>
            <span className="text-xs text-muted-foreground font-bold">/ {callGoal}</span>
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Llamados hoy</p>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
              <div className={`h-full rounded-full transition-all duration-500 ${callPct >= 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${callPct}%` }} />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground font-bold">{callPct}%</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-1.5 bg-success/10 rounded-lg">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-success">{totalScheduled}</span>
            <span className="text-xs text-muted-foreground font-bold">/ {scheduledGoal}</span>
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Agendados hoy</p>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
              <div className={`h-full rounded-full transition-all duration-500 ${scheduledPct >= 100 ? 'bg-success' : 'bg-accent'}`} style={{ width: `${scheduledPct}%` }} />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground font-bold">{scheduledPct}%</span>
        </div>
      </div>

      <div className="p-4 border-b border-border flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Llamados de Hoy</h3>
          <div className="flex gap-1">
            {(['all', 'outgoing', 'incoming'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDirectionFilter(d)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  directionFilter === d
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {d === 'all' ? '📞 Todos' : d === 'outgoing' ? '📤 Salientes' : '📥 Entrantes'}
              </button>
            ))}
          </div>
        </div>
        {directionFilter !== 'incoming' && (
          <div className="flex gap-1 flex-wrap">
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  filter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'all' ? 'Todos' : STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="overflow-auto max-h-64">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left py-2 px-4">Tipo</th>
              <th className="text-left py-2 px-4">Nombre</th>
              <th className="text-left py-2 px-4">Teléfono</th>
              <th className="text-left py-2 px-4">Estado</th>
              <th className="text-left py-2 px-4">Hora</th>
            </tr>
          </thead>
          <tbody>
            {/* Outgoing lead calls */}
            {directionFilter !== 'incoming' && (
              filtered.length === 0 && directionFilter === 'outgoing' ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No hay llamados salientes con este filtro
                  </td>
                </tr>
              ) : (
                filtered.map(lead => {
                  const call = callData[lead.id];
                  const displayStatus = optimisticStatus[lead.id] || getUiStatus(lead.status);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleRowClick(lead)}
                      className={`border-t border-border/30 transition-colors ${
                        displayStatus === 'scheduled'
                          ? 'bg-success/5 opacity-70'
                          : 'hover:bg-primary/5 cursor-pointer'
                      }`}
                    >
                      <td className="py-2 px-4">
                        <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">📤 Saliente</span>
                      </td>
                      <td className="py-2 px-4 font-medium text-foreground">{lead.name}</td>
                      <td className="py-2 px-4">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleRowClick(lead);
                          }}
                          className="font-mono text-accent hover:text-primary font-bold underline decoration-accent/30 hover:decoration-primary transition-colors bg-transparent border-0 cursor-pointer p-0"
                        >
                          📞 {lead.phone}
                        </button>
                      </td>
                      <td className="py-2 px-4" onClick={e => e.stopPropagation()}>
                        <Select
                          value={displayStatus}
                          onValueChange={(val) => handleStatusChange(lead.id, val)}
                        >
                          <SelectTrigger className="h-7 w-36 text-xs font-bold border-0 bg-transparent p-0 focus:ring-0">
                            <SelectValue>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusStyle(displayStatus)}`}>
                                {STATUS_LABELS[displayStatus] || STATUS_LABELS.new}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {CHANGEABLE_STATUSES.map(s => (
                              <SelectItem key={s} value={s} className="text-xs font-bold">
                                {STATUS_LABELS[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-4 text-muted-foreground text-xs">
                        {call
                          ? new Date(call.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                    </tr>
                  );
                })
              )
            )}
            {/* Manual calls rows (outgoing) */}
            {directionFilter !== 'incoming' && (filter === 'all') && manualCalls.map(mc => (
              <tr key={`manual-${mc.id}`} className="border-t border-border/30 bg-muted/30">
                <td className="py-2 px-4">
                  <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent text-[10px] font-bold">📤 Manual</span>
                </td>
                <td className="py-2 px-4 font-medium text-muted-foreground">—</td>
                <td className="py-2 px-4 font-mono text-muted-foreground">📞 {mc.phone}</td>
                <td className="py-2 px-4">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-accent/20 text-accent">Llamada manual</span>
                </td>
                <td className="py-2 px-4 text-muted-foreground text-xs">
                  {new Date(mc.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
            {/* Incoming calls rows */}
            {directionFilter !== 'outgoing' && incomingCalls.map(ic => {
              const isMissed = ic.status === 'missed' || ic.status === 'ringing';
              const isAnswered = ic.status === 'answered' || ic.status === 'completed';
              const leadFromList = ic.lead_id ? leads.find(l => l.id === ic.lead_id) : null;
              const displayName = leadFromList?.name ?? (ic.lead_name !== ic.lead_phone ? ic.lead_name : null);
              return (
                <tr
                  key={`incoming-${ic.id}`}
                  onClick={() => ic.lead_id && onSelectLead?.(ic.lead_id)}
                  className={`border-t border-border/30 transition-colors ${
                    ic.lead_id ? 'hover:bg-primary/5 cursor-pointer' : ''
                  } ${isMissed ? 'bg-destructive/5' : ''}`}
                >
                  <td className="py-2 px-4">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isMissed ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'
                    }`}>
                      📥 Entrante
                    </span>
                  </td>
                  <td className="py-2 px-4 font-medium text-foreground">
                    {displayName || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2 px-4 font-mono text-muted-foreground">📞 {ic.lead_phone}</td>
                  <td className="py-2 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      isMissed
                        ? 'bg-destructive/20 text-destructive'
                        : isAnswered
                          ? 'bg-success/20 text-success'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {isMissed ? '📵 Perdida' : isAnswered ? '✅ Contestada' : ic.status}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-muted-foreground text-xs">
                    {new Date(ic.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              );
            })}
            {/* Empty state */}
            {directionFilter === 'incoming' && incomingCalls.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No hay llamadas entrantes hoy
                </td>
              </tr>
            )}
            {directionFilter === 'all' && filtered.length === 0 && manualCalls.length === 0 && incomingCalls.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No hay llamados hoy
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Advisor Selection Dialog for scheduling from table */}
      <Dialog open={!!scheduleLeadId} onOpenChange={(open) => !open && setScheduleLeadId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">📅 Agendar con Asesor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm font-bold text-foreground">
              Lead: {leads.find(l => l.id === scheduleLeadId)?.name}
            </p>
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">¿A qué asesor se asigna?</label>
              <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar asesor..." />
                </SelectTrigger>
                <SelectContent>
                  {advisors.map(a => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {a.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={handleScheduleConfirm}
              disabled={!selectedAdvisor}
              className="w-full py-3 rounded-xl text-center text-lg font-black text-primary-foreground bg-success hover:bg-success/90 disabled:opacity-50 transition-all"
            >
              ✅ Confirmar Agendamiento
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function getStatusStyle(status: string): string {
  const styles: Record<string, string> = {
    new: 'bg-primary/20 text-primary',
    answered: 'bg-success/20 text-success',
    first_call: 'bg-warning/20 text-warning',
    second_call: 'bg-accent/20 text-accent',
    failed: 'bg-destructive/20 text-destructive',
    done: 'bg-accent/20 text-accent',
    scheduled: 'bg-success/20 text-success',
    asesoria_agendada: 'bg-success/20 text-success',
    disqualified: 'bg-muted text-muted-foreground',
    bad_number: 'bg-destructive/20 text-destructive',
    calling: 'bg-primary/20 text-primary',
  };
  return styles[status] || 'bg-muted text-muted-foreground';
}

export default TodayCallsTable;
