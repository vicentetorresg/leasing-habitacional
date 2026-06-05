import { Fragment } from 'react';
import { useAuth } from '@/hooks/useAuth';
import UserMenu from '@/components/UserMenu';
import GuidedTour from '@/components/GuidedTour';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, PieChart, Pie, Legend, Area, AreaChart, ComposedChart,
} from 'recharts';
import { format, subDays, subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval, parseISO, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/NavLink';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ──────────────────────────────────────────
interface ProfileData { user_id: string; full_name: string; }
interface RoleData { user_id: string; role: string; }
interface CallAttemptRow {
  id: string; lead_id: string; user_id: string; outcome: string;
  attempt_number: number; created_at: string; duration_seconds: number | null;
}

// ─── Constants ──────────────────────────────────────
const TOOLTIP_STYLE = { backgroundColor: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '8px', color: 'hsl(210, 20%, 95%)' };
const AXIS_TICK = { fill: 'hsl(215, 15%, 55%)', fontSize: 11 };
const GRID_STROKE = 'hsl(220, 15%, 18%)';
const COLORS = ['hsl(220, 70%, 55%)', 'hsl(145, 70%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(340, 70%, 55%)', 'hsl(180, 70%, 45%)', 'hsl(0, 85%, 55%)', 'hsl(270, 60%, 55%)'];

const EXEC_STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo', calling: 'Llamando', scheduled: 'Agendado', disqualified: 'No Califica',
  first_call: 'Primer Llamado', second_call: 'Segundo Llamado', bad_number: 'Nro Malo/No Invierte', answered: 'Contestó',
  no_qualify: 'No Califica', done: 'Cerrado', failed: 'Descartado', reciclado: 'Reciclado',
};

const ADVISOR_STATUS_LABELS: Record<string, string> = {
  asesoria_agendada: 'Asesoría Agendada', asesoria_concretada: 'Asesoría Concretada',
  recontactar: 'Recontactar', departamento_reservado: 'Depto. Reservado',
  cierres: 'Cierres', archived: 'Archivado',
};

const SCHEDULE: Record<number, { start: number; end: number; lunchStart?: number; lunchEnd?: number } | null> = {
  1: { start: 9, end: 18.5, lunchStart: 13, lunchEnd: 14 },
  2: { start: 9, end: 18.5, lunchStart: 13, lunchEnd: 14 },
  3: { start: 9, end: 18.5, lunchStart: 13, lunchEnd: 14 },
  4: { start: 9, end: 18.5, lunchStart: 13, lunchEnd: 14 },
  5: { start: 9, end: 14 }, 6: null, 0: null,
};

function getBusinessMinutes(from: Date, to: Date): number {
  if (from >= to) return 0;
  let minutes = 0;
  const cursor = new Date(from);
  while (cursor < to && minutes < 10000) {
    const day = cursor.getDay();
    const schedule = SCHEDULE[day];
    if (!schedule) { cursor.setDate(cursor.getDate() + 1); cursor.setHours(0, 0, 0, 0); continue; }
    const hour = cursor.getHours() + cursor.getMinutes() / 60;
    if (hour < schedule.start) { cursor.setHours(Math.floor(schedule.start), (schedule.start % 1) * 60, 0, 0); continue; }
    if (hour >= schedule.end) { cursor.setDate(cursor.getDate() + 1); cursor.setHours(0, 0, 0, 0); continue; }
    if (schedule.lunchStart && schedule.lunchEnd && hour >= schedule.lunchStart && hour < schedule.lunchEnd) { cursor.setHours(schedule.lunchEnd, 0, 0, 0); continue; }
    minutes++; cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return minutes;
}

const formatTime = (mins: number) => {
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
};

// ─── Main Component ──────────────────────────────────
const Admin = () => {
  const { signOut, user: currentUser, fullName } = useAuth();
  const { isDemo } = useDemoMode();
  const demoDisplayName = isDemo ? 'Roberto Méndez' : fullName;
  const roleLabel = isDemo ? 'Admin' : 'CEO';
  const { leads } = useLeads(undefined, true, currentUser?.email);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [attempts, setAttempts] = useState<CallAttemptRow[]>([]);
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'ejecutivas' | 'asesores'>('overview');
  const [selectedPerson, setSelectedPerson] = useState<string>('all');

  const DEMO_NAMES_MAP = ['Alejandro Reyes', 'Camila Fuentes', 'Sebastián Mora', 'Daniela Pinto', 'Valentina Herrera', 'Nicolás Díaz'];

  useEffect(() => {
    supabase.from('profiles').select('user_id, full_name').then(({ data }) => {
      if (data) {
        if (isDemo) {
          setProfiles(data.map((p, i) => ({ ...p, full_name: DEMO_NAMES_MAP[i % DEMO_NAMES_MAP.length] })));
        } else {
          setProfiles(data);
        }
      }
    });
    supabase.from('user_roles').select('user_id, role').then(({ data }) => { if (data) setRoles(data as RoleData[]); });
    supabase.from('call_attempts').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setAttempts(data as CallAttemptRow[]); });
  }, [isDemo]);

  const getName = (userId: string) => profiles.find(p => p.user_id === userId)?.full_name || userId.slice(0, 8);
  const adminIds = useMemo(() => new Set(roles.filter(r => r.role === 'admin').map(r => r.user_id)), [roles]);
  const ejecutivaIds = useMemo(() => roles.filter(r => r.role === 'ejecutiva' && !adminIds.has(r.user_id)).map(r => r.user_id), [roles, adminIds]);
  const asesorIds = useMemo(() => roles.filter(r => r.role === 'asesor').map(r => r.user_id), [roles]);

  // Filtered data
  const filteredLeads = useMemo(() => leads.filter(l => {
    const d = parseISO(l.created_at);
    return isWithinInterval(d, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
  }), [leads, dateFrom, dateTo]);

  const filteredAttempts = useMemo(() => attempts.filter(a => {
    const d = parseISO(a.created_at);
    return isWithinInterval(d, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
  }), [attempts, dateFrom, dateTo]);

  // All advisor-status leads (not date-filtered, since they persist)
  const advisorLeads = useMemo(() => leads.filter(l =>
    Object.keys(ADVISOR_STATUS_LABELS).includes(l.status)
  ), [leads]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <span className="text-2xl">📊</span>
          <h1 className="text-xl font-black text-foreground">CEO DASHBOARD</h1>
        </div>
        <div className="flex items-center gap-4">
          <NavLink to="/executive" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ejecutiva</NavLink>
          <NavLink to="/advisor" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Seguimiento</NavLink>
          <NavLink to="/backoffice" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Backoffice</NavLink>
          <UserMenu fullName={demoDisplayName} email={currentUser?.email ?? ''} roleLabel={roleLabel} onSignOut={signOut} />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Date Filter + Tabs */}
        <div data-tour="admin-date-filter" className="flex flex-wrap items-center gap-4 bg-card border border-border rounded-lg p-4">
          <span className="text-sm font-bold text-muted-foreground">Rango:</span>
          <DatePicker date={dateFrom} onChange={setDateFrom} label="Desde" />
          <span className="text-muted-foreground">→</span>
          <DatePicker date={dateTo} onChange={setDateTo} label="Hasta" />
          <div className="flex gap-2 ml-2">
            {[
              { label: 'Hoy', fn: () => { setDateFrom(new Date()); setDateTo(new Date()); } },
              { label: '7d', fn: () => { setDateFrom(subDays(new Date(), 7)); setDateTo(new Date()); } },
              { label: '30d', fn: () => { setDateFrom(subDays(new Date(), 30)); setDateTo(new Date()); } },
              { label: '3m', fn: () => { setDateFrom(subMonths(new Date(), 3)); setDateTo(new Date()); } },
            ].map(p => (
              <Button key={p.label} variant="outline" size="sm" onClick={p.fn} className="text-xs">{p.label}</Button>
            ))}
          </div>
          <div data-tour="admin-tabs" className="ml-auto flex gap-1 bg-muted rounded-lg p-1">
            {[
              { key: 'overview' as const, label: '📊 General' },
              { key: 'ejecutivas' as const, label: '📞 Ejecutivas' },
              { key: 'asesores' as const, label: '🏠 Asesores' },
            ].map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setSelectedPerson('all'); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${activeTab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <OverviewTab
            leads={filteredLeads} attempts={filteredAttempts} allAttempts={attempts}
            allLeads={leads} getName={getName} dateFrom={dateFrom} dateTo={dateTo}
          />
        )}
        {activeTab === 'ejecutivas' && (
          <EjecutivasTab
            leads={filteredLeads} attempts={filteredAttempts} allAttempts={attempts}
            ejecutivaIds={ejecutivaIds} getName={getName}
            selectedPerson={selectedPerson} setSelectedPerson={setSelectedPerson}
            dateFrom={dateFrom} dateTo={dateTo} profiles={profiles}
          />
        )}
        {activeTab === 'asesores' && (
          <AsesoresTab
            leads={leads} advisorLeads={advisorLeads}
            asesorIds={asesorIds} getName={getName}
            selectedPerson={selectedPerson} setSelectedPerson={setSelectedPerson}
            profiles={profiles}
          />
        )}
      </div>
      <GuidedTour page="admin" isDemo={isDemo} />
    </div>
  );
};

// ─── OVERVIEW TAB ───────────────────────────────────
function OverviewTab({ leads, attempts, allAttempts, allLeads, getName, dateFrom, dateTo }: {
  leads: Lead[]; attempts: CallAttemptRow[]; allAttempts: CallAttemptRow[];
  allLeads: Lead[]; getName: (id: string) => string; dateFrom: Date; dateTo: Date;
}) {
  const leadsWithAttempts = new Set(attempts.map(a => a.lead_id));
  const totalLeads = leads.length;
  const contacted = leads.filter(l => leadsWithAttempts.has(l.id)).length;
  const scheduled = leads.filter(l => l.status === 'scheduled' || l.status === 'asesoria_agendada').length;
  const sinContactar = leads.filter(l => !leadsWithAttempts.has(l.id)).length;

  // Reservados/Cierres: filter by fecha_reserva within date range, or by created_at if no fecha_reserva
  const reservadosInRange = allLeads.filter(l => {
    if (l.status !== 'departamento_reservado') return false;
    const d = l.fecha_reserva ? parseISO(l.fecha_reserva) : parseISO(l.created_at);
    return isWithinInterval(d, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
  });
  const cierresInRange = allLeads.filter(l => {
    if (l.status !== 'cierres') return false;
    const d = l.fecha_reserva ? parseISO(l.fecha_reserva) : parseISO(l.created_at);
    return isWithinInterval(d, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
  });
  const reservados = reservadosInRange.length;
  const cierres = cierresInRange.length;

  // Response times
  const responseTimes = useMemo(() => {
    const times: number[] = [];
    leads.forEach(lead => {
      const first = allAttempts.filter(a => a.lead_id === lead.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      if (first) times.push(getBusinessMinutes(new Date(lead.created_at), new Date(first.created_at)));
    });
    return times;
  }, [leads, allAttempts]);

  const avgResp = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;

  // UF totals (also date-filtered)
  const ufReservadas = [...reservadosInRange, ...cierresInRange].reduce((s, l) => s + (l.uf_sin_bp ?? 0), 0);
  const ufCerradas = cierresInRange.reduce((s, l) => s + (l.uf_sin_bp ?? 0), 0);

  // Daily trend
  const days = useMemo(() => {
    const interval = { start: startOfDay(dateFrom), end: endOfDay(dateTo) };
    return eachDayOfInterval(interval).slice(0, 60).map(day => {
      const ds = startOfDay(day); const de = endOfDay(day);
      const dayLeads = leads.filter(l => { const d = parseISO(l.created_at); return d >= ds && d <= de; });
      const dayAttempts = attempts.filter(a => { const d = parseISO(a.created_at); return d >= ds && d <= de; });
      const dayScheduled = dayAttempts.filter(a => a.outcome === 'scheduled').length;
      return { name: format(day, 'dd/MM', { locale: es }), leads: dayLeads.length, llamadas: dayAttempts.length, agendadas: dayScheduled };
    });
  }, [leads, attempts, dateFrom, dateTo]);

  // Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { const label = EXEC_STATUS_LABELS[l.status] || ADVISOR_STATUS_LABELS[l.status] || l.status; counts[label] = (counts[label] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leads]);

  // Conversion funnel
  const convPct = (v: number) => totalLeads > 0 ? Math.round((v / totalLeads) * 100) : 0;

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KPI label="Total Leads" value={totalLeads} color="primary" />
        <KPI label="Contactados" value={contacted} color="accent" />
        <KPI label="Agendados" value={scheduled} color="success" />
        <KPI label="Sin Contactar" value={sinContactar} color="destructive" />
        <KPI label="Reservados" value={reservados} color="primary" />
        <KPI label="Cierres" value={cierres} color="success" />
        <KPI label="UF Reservadas" value={ufReservadas.toLocaleString('es-CL')} color="accent" />
        <KPI label="Resp. Promedio" value={formatTime(avgResp)} color="warning" />
      </div>

      {/* Funnel */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4 text-foreground">Embudo Completo</h3>
        <div className="flex items-center gap-2">
          <FunnelStep label="Leads" value={totalLeads} pct={100} />
          <span className="text-muted-foreground text-xl">→</span>
          <FunnelStep label="Contactados" value={contacted} pct={convPct(contacted)} />
          <span className="text-muted-foreground text-xl">→</span>
          <FunnelStep label="Agendados" value={scheduled} pct={convPct(scheduled)} />
          <span className="text-muted-foreground text-xl">→</span>
          <FunnelStep label="Reservados" value={reservados} pct={convPct(reservados)} />
          <span className="text-muted-foreground text-xl">→</span>
          <FunnelStep label="Cierres" value={cierres} pct={convPct(cierres)} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Tendencia Diaria: Leads, Llamadas y Agendas">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Bar dataKey="leads" fill="hsl(0, 85%, 55%)" radius={[4, 4, 0, 0]} name="Leads" />
              <Bar dataKey="llamadas" fill="hsl(180, 70%, 45%)" radius={[4, 4, 0, 0]} name="Llamadas" />
              <Line type="monotone" dataKey="agendadas" stroke="hsl(145, 70%, 45%)" strokeWidth={2} dot={false} name="Agendadas" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribución por Estado">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* UF Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-2 text-foreground">💰 Resumen UF</h3>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-3xl font-black text-primary">{ufReservadas.toLocaleString('es-CL')}</p>
              <p className="text-xs text-muted-foreground mt-1">UF Reservadas Total</p>
            </div>
            <div className="text-center p-4 bg-green-500/10 rounded-lg">
              <p className="text-3xl font-black text-green-500">{ufCerradas.toLocaleString('es-CL')}</p>
              <p className="text-xs text-muted-foreground mt-1">UF Cerradas Total</p>
            </div>
          </div>
        </div>

        <ChartCard title="Tiempo de Respuesta">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={getResponseTimeBuckets(responseTimes.map(m => ({ minutes: m })))}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="hsl(180, 70%, 45%)" radius={[4, 4, 0, 0]} name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}

// ─── EJECUTIVAS TAB ─────────────────────────────────
interface DailyPerfRow { user_id: string; calls_made: number; calls_goal: number; calls_pct: number; scheduled_made: number; scheduled_goal: number; scheduled_pct: number; }

function EjecutivasTab({ leads, attempts, allAttempts, ejecutivaIds, getName, selectedPerson, setSelectedPerson, dateFrom, dateTo, profiles }: {
  leads: Lead[]; attempts: CallAttemptRow[]; allAttempts: CallAttemptRow[];
  ejecutivaIds: string[]; getName: (id: string) => string;
  selectedPerson: string; setSelectedPerson: (v: string) => void;
  dateFrom: Date; dateTo: Date; profiles: ProfileData[];
}) {
  const filteredAttempts = selectedPerson === 'all' ? attempts.filter(a => ejecutivaIds.includes(a.user_id)) : attempts.filter(a => a.user_id === selectedPerson);
  const ejecutivaProfiles = profiles.filter(p => ejecutivaIds.includes(p.user_id));

  // Fetch today's daily_performance for all ejecutivas
  const [dailyPerf, setDailyPerf] = useState<DailyPerfRow[]>([]);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('daily_performance')
      .select('user_id, calls_made, calls_goal, calls_pct, scheduled_made, scheduled_goal, scheduled_pct')
      .eq('date', today)
      .in('user_id', ejecutivaIds)
      .then(({ data }) => { if (data) setDailyPerf(data as DailyPerfRow[]); });
    const interval = setInterval(() => {
      supabase
        .from('daily_performance')
        .select('user_id, calls_made, calls_goal, calls_pct, scheduled_made, scheduled_goal, scheduled_pct')
        .eq('date', today)
        .in('user_id', ejecutivaIds)
        .then(({ data }) => { if (data) setDailyPerf(data as DailyPerfRow[]); });
    }, 30000);
    return () => clearInterval(interval);
  }, [ejecutivaIds]);

  // Per-person stats
  const perPerson = useMemo(() => {
    const map: Record<string, { calls: number; scheduled: number; firstCall: number; secondCall: number; badNumber: number }> = {};
    const ids = selectedPerson === 'all' ? ejecutivaIds : [selectedPerson];
    ids.forEach(id => { map[id] = { calls: 0, scheduled: 0, firstCall: 0, secondCall: 0, badNumber: 0 }; });
    filteredAttempts.forEach(a => {
      if (!map[a.user_id]) return;
      map[a.user_id].calls++;
      if (a.outcome === 'scheduled') map[a.user_id].scheduled++;
      if (a.outcome === 'first_call' || a.outcome === 'no_answer') map[a.user_id].firstCall++;
      if (a.outcome === 'second_call' || a.outcome === 'busy') map[a.user_id].secondCall++;
      if (a.outcome === 'bad_number') map[a.user_id].badNumber++;
    });
    return Object.entries(map).map(([id, s]) => ({
      name: getName(id), userId: id, ...s,
      convRate: s.calls > 0 ? Math.round((s.scheduled / s.calls) * 100) : 0,
    })).sort((a, b) => b.calls - a.calls);
  }, [filteredAttempts, ejecutivaIds, selectedPerson]);

  // Daily trend for selected
  const dailyTrend = useMemo(() => {
    return eachDayOfInterval({ start: startOfDay(dateFrom), end: endOfDay(dateTo) }).slice(0, 60).map(day => {
      const ds = startOfDay(day); const de = endOfDay(day);
      const dayAttempts = filteredAttempts.filter(a => { const d = parseISO(a.created_at); return d >= ds && d <= de; });
      return {
        name: format(day, 'dd/MM', { locale: es }),
        llamadas: dayAttempts.length,
        agendadas: dayAttempts.filter(a => a.outcome === 'scheduled').length,
        primerLlamado: dayAttempts.filter(a => a.outcome === 'first_call' || a.outcome === 'no_answer').length,
      };
    });
  }, [filteredAttempts, dateFrom, dateTo]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const months = eachMonthOfInterval({ start: startOfDay(dateFrom), end: endOfDay(dateTo) });
    return months.map(m => {
      const ms = startOfMonth(m); const me = endOfMonth(m);
      const mAttempts = filteredAttempts.filter(a => { const d = parseISO(a.created_at); return d >= ms && d <= me; });
      return {
        name: format(m, 'MMM yy', { locale: es }),
        llamadas: mAttempts.length,
        agendadas: mAttempts.filter(a => a.outcome === 'scheduled').length,
      };
    });
  }, [filteredAttempts, dateFrom, dateTo]);

  // Monthly conversion rate: leads created per month → scheduled
  const monthlyConversion = useMemo(() => {
    const months = eachMonthOfInterval({ start: startOfDay(dateFrom), end: endOfDay(dateTo) });
    return months.map(m => {
      const ms = startOfMonth(m); const me = endOfMonth(m);
      const monthLeads = leads.filter(l => {
        const d = parseISO(l.created_at);
        return d >= ms && d <= me && (selectedPerson === 'all' ? ejecutivaIds.includes(l.assigned_to || '') : l.assigned_to === selectedPerson);
      });
      const scheduled = monthLeads.filter(l => l.status === 'scheduled' || l.status === 'asesoria_agendada').length;
      const total = monthLeads.length;
      return {
        name: format(m, 'MMM yy', { locale: es }),
        leads: total,
        agendados: scheduled,
        tasa: total > 0 ? Math.round((scheduled / total) * 100) : 0,
      };
    });
  }, [leads, dateFrom, dateTo, selectedPerson, ejecutivaIds]);

  // Response times
  const responseTimes = useMemo(() => {
    const times: { name: string; minutes: number }[] = [];
    leads.forEach(lead => {
      const first = allAttempts.filter(a => a.lead_id === lead.id && (selectedPerson === 'all' ? ejecutivaIds.includes(a.user_id) : a.user_id === selectedPerson))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      if (first) times.push({ name: getName(first.user_id), minutes: getBusinessMinutes(new Date(lead.created_at), new Date(first.created_at)) });
    });
    return times;
  }, [leads, allAttempts, ejecutivaIds, selectedPerson]);

  // Outcome breakdown
  const outcomeData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAttempts.forEach(a => {
      const label = EXEC_STATUS_LABELS[a.outcome] || a.outcome;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredAttempts]);



  return (
    <>
      {/* Person filter */}
      <PersonFilter
        people={ejecutivaProfiles} selected={selectedPerson} onChange={setSelectedPerson} label="Filtrar ejecutiva"
      />

      {/* Today's Daily Goals per Ejecutiva */}
      {dailyPerf.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4 text-foreground">🎯 Metas del Día — Hoy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(selectedPerson === 'all' ? dailyPerf : dailyPerf.filter(d => d.user_id === selectedPerson)).map(dp => (
              <div key={dp.user_id} className="border border-border/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-bold text-foreground">{getName(dp.user_id)}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold w-20 shrink-0">Llamados</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${dp.calls_pct >= 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, dp.calls_pct)}%` }} />
                    </div>
                    <span className="text-sm font-black font-mono text-foreground shrink-0">{dp.calls_made}/{dp.calls_goal}</span>
                    <span className={`text-xs font-bold shrink-0 ${dp.calls_pct >= 100 ? 'text-green-500' : 'text-muted-foreground'}`}>{Math.round(dp.calls_pct)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold w-20 shrink-0">Agendados</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${dp.scheduled_pct >= 100 ? 'bg-green-500' : 'bg-accent'}`} style={{ width: `${Math.min(100, dp.scheduled_pct)}%` }} />
                    </div>
                    <span className="text-sm font-black font-mono text-foreground shrink-0">{dp.scheduled_made}/{dp.scheduled_goal}</span>
                    <span className={`text-xs font-bold shrink-0 ${dp.scheduled_pct >= 100 ? 'text-green-500' : 'text-muted-foreground'}`}>{Math.round(dp.scheduled_pct)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedPerson === 'all' && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4 text-foreground">📞 Comparación de Ejecutivas</h3>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-4">Ejecutiva</th>
                  <th className="text-right py-3 px-4">Llamadas</th>
                  <th className="text-right py-3 px-4">Agendados</th>
                  <th className="text-right py-3 px-4">1er Llamado</th>
                  <th className="text-right py-3 px-4">2do Llamado</th>
                  <th className="text-right py-3 px-4">Núm. Malo</th>
                  <th className="text-right py-3 px-4">Tasa Conv.</th>
                </tr>
              </thead>
              <tbody>
                {perPerson.map(e => (
                  <tr key={e.userId} className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer" onClick={() => setSelectedPerson(e.userId)}>
                    <td className="py-3 px-4 font-medium text-foreground">{e.name}</td>
                    <td className="py-3 px-4 text-right font-mono text-accent">{e.calls}</td>
                    <td className="py-3 px-4 text-right font-mono text-green-500">{e.scheduled}</td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">{e.firstCall}</td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">{e.secondCall}</td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">{e.badNumber}</td>
                    <td className="py-3 px-4 text-right">
                      <ConvBadge pct={e.convRate} />
                    </td>
                  </tr>
                ))}
                {perPerson.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Sin datos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily breakdown per ejecutiva */}
      {selectedPerson === 'all' && ejecutivaIds.length > 1 && (
        <DailyPerEjecutivaTable
          attempts={attempts.filter(a => ejecutivaIds.includes(a.user_id))}
          ejecutivaIds={ejecutivaIds}
          getName={getName}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Llamadas y Agendas por Día">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Area type="monotone" dataKey="llamadas" fill="hsl(180, 70%, 45%)" fillOpacity={0.2} stroke="hsl(180, 70%, 45%)" name="Llamadas" />
              <Line type="monotone" dataKey="agendadas" stroke="hsl(145, 70%, 45%)" strokeWidth={2} name="Agendadas" />
              <Line type="monotone" dataKey="primerLlamado" stroke="hsl(38, 92%, 50%)" strokeWidth={1} strokeDasharray="5 5" name="1er Llamado" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tendencia Mensual">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Bar dataKey="llamadas" fill="hsl(220, 70%, 55%)" radius={[4, 4, 0, 0]} name="Llamadas" />
              <Bar dataKey="agendadas" fill="hsl(145, 70%, 45%)" radius={[4, 4, 0, 0]} name="Agendadas" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Distribución de Resultados">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={outcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {outcomeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Llamadas y Agendadas por Mes">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Bar dataKey="llamadas" fill="hsl(220, 70%, 55%)" radius={[4, 4, 0, 0]} name="Llamadas" />
              <Bar dataKey="agendadas" fill="hsl(145, 70%, 45%)" radius={[4, 4, 0, 0]} name="Agendadas" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Conversion rate chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Tasa de Conversión Lead → Agendado por Mes">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={monthlyConversion}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis yAxisId="left" tick={AXIS_TICK} />
              <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} unit="%" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Bar yAxisId="left" dataKey="leads" fill="hsl(220, 70%, 55%)" radius={[4, 4, 0, 0]} name="Leads" />
              <Bar yAxisId="left" dataKey="agendados" fill="hsl(145, 70%, 45%)" radius={[4, 4, 0, 0]} name="Agendados" />
              <Line yAxisId="right" type="monotone" dataKey="tasa" stroke="hsl(38, 92%, 50%)" strokeWidth={2} name="Tasa %" dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* KPI cards for selected person */}
      {selectedPerson !== 'all' && perPerson.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPI label="Total Llamadas" value={perPerson[0].calls} color="accent" />
          <KPI label="Agendados" value={perPerson[0].scheduled} color="success" />
          <KPI label="1er Llamado" value={perPerson[0].firstCall} color="warning" />
          <KPI label="Tasa Conversión" value={`${perPerson[0].convRate}%`} color="primary" />
          <KPI label="Resp. Promedio" value={formatTime(responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b.minutes, 0) / responseTimes.length) : 0)} color="accent" />
        </div>
      )}
    </>
  );
}

// ─── ASESORES TAB ───────────────────────────────────
function AsesoresTab({ leads, advisorLeads, asesorIds, getName, selectedPerson, setSelectedPerson, profiles }: {
  leads: Lead[]; advisorLeads: Lead[];
  asesorIds: string[]; getName: (id: string) => string;
  selectedPerson: string; setSelectedPerson: (v: string) => void;
  profiles: ProfileData[];
}) {
  const asesorProfiles = profiles.filter(p => asesorIds.includes(p.user_id));
  const filtered = selectedPerson === 'all' ? advisorLeads : advisorLeads.filter(l => l.advisor_id === selectedPerson);

  // Independent month-range filters for Reservas and Cierres
  const [reservasDesde, setReservasDesde] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 11); return format(d, 'yyyy-MM'); });
  const [reservasHasta, setReservasHasta] = useState(() => format(new Date(), 'yyyy-MM'));
  const [cierresDesde, setCierresDesde] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 11); return format(d, 'yyyy-MM'); });
  const [cierresHasta, setCierresHasta] = useState(() => format(new Date(), 'yyyy-MM'));

  // Per-asesor stats (global, no date filter)
  const perAsesor = useMemo(() => {
    const map: Record<string, { total: number; agendada: number; concretada: number; recontactar: number; reservado: number; cierres: number; archived: number; uf: number; ufCerradas: number }> = {};
    const ids = selectedPerson === 'all' ? asesorIds : [selectedPerson];
    ids.forEach(id => { map[id] = { total: 0, agendada: 0, concretada: 0, recontactar: 0, reservado: 0, cierres: 0, archived: 0, uf: 0, ufCerradas: 0 }; });
    advisorLeads.forEach(l => {
      if (!l.advisor_id || !map[l.advisor_id]) return;
      map[l.advisor_id].total++;
      if (l.status === 'asesoria_agendada') map[l.advisor_id].agendada++;
      if (l.status === 'asesoria_concretada') map[l.advisor_id].concretada++;
      if (l.status === 'recontactar') map[l.advisor_id].recontactar++;
      if (l.status === 'departamento_reservado') { map[l.advisor_id].reservado++; map[l.advisor_id].uf += (l.uf_sin_bp ?? 0); }
      if (l.status === 'cierres') { map[l.advisor_id].cierres++; map[l.advisor_id].uf += (l.uf_sin_bp ?? 0); map[l.advisor_id].ufCerradas += (l.uf_sin_bp ?? 0); }
      if (l.status === 'archived') map[l.advisor_id].archived++;
    });
    return Object.entries(map).map(([id, s]) => ({ name: getName(id), userId: id, ...s })).sort((a, b) => b.total - a.total);
  }, [advisorLeads, asesorIds, selectedPerson]);

  // Status pie (global)
  const statusPie = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.filter(l => l.status !== 'archived').forEach(l => {
      const label = ADVISOR_STATUS_LABELS[l.status] || l.status;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Generate month keys between two yyyy-MM strings
  const getMonthRange = (from: string, to: string) => {
    const months: string[] = [];
    const [fy, fm] = from.split('-').map(Number);
    const [ty, tm] = to.split('-').map(Number);
    let y = fy, m = fm;
    while (y < ty || (y === ty && m <= tm)) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      m++; if (m > 12) { m = 1; y++; }
    }
    return months;
  };

  // Reservas por mes (with own filter)
  const reservasPorMes = useMemo(() => {
    const months = getMonthRange(reservasDesde, reservasHasta);
    const reservaLeads = filtered.filter(l => l.fecha_reserva && (l.status === 'departamento_reservado' || l.status === 'cierres'));
    return months.map(monthKey => {
      const monthLeads = reservaLeads.filter(l => {
        const d = parseISO(l.fecha_reserva!);
        return format(d, 'yyyy-MM') === monthKey;
      });
      return {
        mes: format(parseISO(`${monthKey}-01`), 'MMM yy', { locale: es }),
        cantidad: monthLeads.length,
        uf: Math.round(monthLeads.reduce((s, l) => s + (l.uf_sin_bp ?? 0), 0)),
      };
    });
  }, [filtered, reservasDesde, reservasHasta]);

  // Cierres por mes (with own filter, using mes_cierre field)
  const cierresPorMes = useMemo(() => {
    const months = getMonthRange(cierresDesde, cierresHasta);
    const cierreLeads = filtered.filter(l => l.status === 'cierres' && l.mes_cierre);
    return months.map(monthKey => {
      const label = format(parseISO(`${monthKey}-01`), 'MMM yy', { locale: es });
      const monthLeads = cierreLeads.filter(l => {
        // mes_cierre could be "MMM yy" or other format, try to match
        return l.mes_cierre === label || l.mes_cierre === monthKey;
      });
      return {
        mes: label,
        cantidad: monthLeads.length,
        uf: Math.round(monthLeads.reduce((s, l) => s + (l.uf_sin_bp ?? 0), 0)),
      };
    });
  }, [filtered, cierresDesde, cierresHasta]);

  // Funnel (global)
  const totalAssigned = filtered.filter(l => l.status !== 'archived').length;
  const totalReservados = filtered.filter(l => l.status === 'departamento_reservado' || l.status === 'cierres').length;
  const totalCierres = filtered.filter(l => l.status === 'cierres').length;
  const ufTotal = filtered.filter(l => l.status === 'departamento_reservado' || l.status === 'cierres').reduce((s, l) => s + (l.uf_sin_bp ?? 0), 0);
  const ufCerradas = filtered.filter(l => l.status === 'cierres').reduce((s, l) => s + (l.uf_sin_bp ?? 0), 0);

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <PersonFilter people={asesorProfiles} selected={selectedPerson} onChange={setSelectedPerson} label="Filtrar asesor" />
        <span className="text-[10px] text-muted-foreground italic">Este filtro aplica a toda la sección</span>
      </div>

      {/* KPIs (global) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI label="Leads Asignados" value={totalAssigned} color="primary" />
        <KPI label="Reservados" value={totalReservados} color="accent" />
        <KPI label="Cierres" value={totalCierres} color="success" />
        <KPI label="UF Reservadas" value={Math.round(ufTotal).toLocaleString('es-CL')} color="primary" />
        <KPI label="UF Cerradas" value={Math.round(ufCerradas).toLocaleString('es-CL')} color="success" />
        <KPI label="Tasa Cierre" value={totalAssigned > 0 ? `${Math.round((totalCierres / totalAssigned) * 100)}%` : '—'} color="accent" />
      </div>

      {/* Comparison table (global) */}
      {selectedPerson === 'all' && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4 text-foreground">🏠 Comparación de Asesores</h3>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-3">Asesor</th>
                  <th className="text-right py-3 px-3">Total</th>
                  <th className="text-right py-3 px-3">Agendada</th>
                  <th className="text-right py-3 px-3">Concretada</th>
                  <th className="text-right py-3 px-3">Recontactar</th>
                  <th className="text-right py-3 px-3">Reservado</th>
                  <th className="text-right py-3 px-3">Cierres</th>
                  <th className="text-right py-3 px-3">UF Total</th>
                  <th className="text-right py-3 px-3">UF Cerr.</th>
                </tr>
              </thead>
              <tbody>
                {perAsesor.map(a => (
                  <tr key={a.userId} className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer" onClick={() => setSelectedPerson(a.userId)}>
                    <td className="py-3 px-3 font-medium text-foreground">{a.name}</td>
                    <td className="py-3 px-3 text-right font-mono text-foreground">{a.total}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-400">{a.agendada}</td>
                    <td className="py-3 px-3 text-right font-mono text-green-400">{a.concretada}</td>
                    <td className="py-3 px-3 text-right font-mono text-yellow-400">{a.recontactar}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-300">{a.reservado}</td>
                    <td className="py-3 px-3 text-right font-mono text-green-500 font-bold">{a.cierres}</td>
                    <td className="py-3 px-3 text-right font-mono text-accent">{Math.round(a.uf).toLocaleString('es-CL')}</td>
                    <td className="py-3 px-3 text-right font-mono text-green-500">{Math.round(a.ufCerradas).toLocaleString('es-CL')}</td>
                  </tr>
                ))}
                {perAsesor.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Sin datos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pie chart (global) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Leads por Estado">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Funnel (global) */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4 text-foreground">Embudo Asesorías</h3>
          <div className="flex items-center gap-2">
            <FunnelStep label="Asignados" value={totalAssigned} pct={100} />
            <span className="text-muted-foreground text-xl">→</span>
            <FunnelStep label="Reservados" value={totalReservados} pct={totalAssigned > 0 ? Math.round((totalReservados / totalAssigned) * 100) : 0} />
            <span className="text-muted-foreground text-xl">→</span>
            <FunnelStep label="Cierres" value={totalCierres} pct={totalAssigned > 0 ? Math.round((totalCierres / totalAssigned) * 100) : 0} />
          </div>
        </div>
      </div>

      {/* Reservas por Mes — line chart with own filter */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-foreground">Reservas por Mes (Cantidad + UF)</h3>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Desde:</label>
            <input type="month" value={reservasDesde} onChange={e => setReservasDesde(e.target.value)}
              className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground" />
            <label className="text-xs text-muted-foreground">Hasta:</label>
            <input type="month" value={reservasHasta} onChange={e => setReservasHasta(e.target.value)}
              className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground" />
          </div>
        </div>
        {reservasPorMes.every(r => r.cantidad === 0) ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={reservasPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="mes" tick={AXIS_TICK} />
              <YAxis yAxisId="left" tick={AXIS_TICK} />
              <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="cantidad" stroke="hsl(180, 70%, 45%)" strokeWidth={2} dot={{ r: 3 }} name="Cantidad" />
              <Line yAxisId="right" type="monotone" dataKey="uf" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} name="UF" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Cierres por Mes — line chart with own filter */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-foreground">Cierres por Mes (Cantidad + UF)</h3>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Desde:</label>
            <input type="month" value={cierresDesde} onChange={e => setCierresDesde(e.target.value)}
              className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground" />
            <label className="text-xs text-muted-foreground">Hasta:</label>
            <input type="month" value={cierresHasta} onChange={e => setCierresHasta(e.target.value)}
              className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground" />
          </div>
        </div>
        {cierresPorMes.every(r => r.cantidad === 0) ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={cierresPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="mes" tick={AXIS_TICK} />
              <YAxis yAxisId="left" tick={AXIS_TICK} />
              <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="cantidad" stroke="hsl(145, 70%, 45%)" strokeWidth={2} dot={{ r: 3 }} name="Cantidad" />
              <Line yAxisId="right" type="monotone" dataKey="uf" stroke="hsl(340, 70%, 55%)" strokeWidth={2} dot={{ r: 3 }} name="UF" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}



// ─── Daily Per-Ejecutiva Table ──────────────────────
function DailyPerEjecutivaTable({ attempts, ejecutivaIds, getName, dateFrom, dateTo }: {
  attempts: CallAttemptRow[]; ejecutivaIds: string[]; getName: (id: string) => string;
  dateFrom: Date; dateTo: Date;
}) {
  const data = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfDay(dateFrom), end: endOfDay(dateTo) }).slice(-14); // last 14 days max
    return days.map(day => {
      const ds = startOfDay(day);
      const de = endOfDay(day);
      const dayAttempts = attempts.filter(a => {
        const d = parseISO(a.created_at);
        return d >= ds && d <= de;
      });
      const row: Record<string, any> = { date: format(day, 'dd/MM', { locale: es }), dateObj: day };
      let total = 0;
      ejecutivaIds.forEach(id => {
        const calls = dayAttempts.filter(a => a.user_id === id).length;
        const scheduled = dayAttempts.filter(a => a.user_id === id && a.outcome === 'scheduled').length;
        row[`calls_${id}`] = calls;
        row[`sched_${id}`] = scheduled;
        total += calls;
      });
      row.total = total;
      return row;
    }).reverse(); // most recent first
  }, [attempts, ejecutivaIds, dateFrom, dateTo]);

  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-bold mb-4 text-foreground">📅 Llamadas Diarias por Ejecutiva</h3>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-2 px-3">Día</th>
              {ejecutivaIds.map(id => (
                <th key={id} className="text-center py-2 px-3" colSpan={2}>
                  {getName(id)}
                </th>
              ))}
              <th className="text-right py-2 px-3">Total</th>
            </tr>
            <tr className="border-b border-border/50 text-muted-foreground text-[10px] uppercase">
              <th></th>
              {ejecutivaIds.map(id => (
                <Fragment key={id}>
                  <th className="text-center py-1 px-2">Llam.</th>
                  <th className="text-center py-1 px-2">Agend.</th>
                </Fragment>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-secondary/30">
                <td className="py-2 px-3 font-medium text-foreground">{row.date}</td>
                {ejecutivaIds.map(id => (
                  <Fragment key={id}>
                    <td className="py-2 px-2 text-center font-mono text-accent">{row[`calls_${id}`] || 0}</td>
                    <td className="py-2 px-2 text-center font-mono text-green-500">{row[`sched_${id}`] || 0}</td>
                  </Fragment>
                ))}
                <td className="py-2 px-3 text-right font-mono font-bold text-foreground">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Shared Components ──────────────────────────────

function PersonFilter({ people, selected, onChange, label }: { people: ProfileData[]; selected: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-bold text-muted-foreground">{label}:</span>
      <Select value={selected} onValueChange={onChange}>
        <SelectTrigger className="w-60">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {people.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
        </SelectContent>
      </Select>
      {selected !== 'all' && (
        <Button variant="ghost" size="sm" onClick={() => onChange('all')} className="text-xs">✕ Limpiar</Button>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-sm font-bold mb-4 text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colors: Record<string, string> = {
    primary: 'text-primary', success: 'text-green-500', destructive: 'text-destructive',
    warning: 'text-yellow-500', accent: 'text-accent', muted: 'text-muted-foreground',
  };
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-black ${colors[color] || 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function FunnelStep({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div className="flex-1 bg-secondary rounded-lg p-3 text-center">
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      <p className="text-xs font-bold text-accent">{pct}%</p>
    </div>
  );
}

function ConvBadge({ pct }: { pct: number }) {
  const cls = pct >= 30 ? 'bg-green-500/20 text-green-500' : pct >= 15 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-destructive/20 text-destructive';
  return <span className={`px-2 py-1 rounded text-xs font-bold ${cls}`}>{pct}%</span>;
}

function EmptyState() {
  return <p className="text-muted-foreground text-center py-12 text-sm">Sin datos aún</p>;
}

function DatePicker({ date, onChange, label }: { date: Date; onChange: (d: Date) => void; label: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal gap-2", !date && "text-muted-foreground")}>
          <CalendarIcon className="h-4 w-4" />
          {date ? format(date, 'dd MMM yyyy', { locale: es }) : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={(d) => d && onChange(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}

function getResponseTimeBuckets(times: { minutes: number }[]) {
  const buckets = [
    { name: '< 1min', max: 1 }, { name: '1-5min', max: 5 }, { name: '5-15min', max: 15 },
    { name: '15-30min', max: 30 }, { name: '30-60min', max: 60 }, { name: '1-2h', max: 120 }, { name: '> 2h', max: Infinity },
  ];
  return buckets.map((b, i) => ({
    name: b.name,
    count: times.filter(t => { const min = i > 0 ? buckets[i - 1].max : 0; return t.minutes >= min && t.minutes < b.max; }).length,
  }));
}

export default Admin;
