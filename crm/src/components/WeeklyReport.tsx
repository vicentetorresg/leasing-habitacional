import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { Lead } from '@/hooks/useLeads';

const STATUS_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  recontactar: 'Recontactar',
  no_contesta: 'No Contesta',
  no_califica: 'No Califica',
  esperando_documentos: 'Esperando Docs',
  solicitando_documentos: 'Doc. Incompleta',
  enviado_a_evaluar: 'Enviado a Evaluar',
  aprobado: 'Aprobado - Buscando Vivienda',
  buscando_vivienda: 'Aprobado - Quiere Mayor Monto',
  aprobado_ok: 'Aprobado OK Todo',
  rechaza_oferta: 'Aprobado - Rechaza Oferta',
  set_hipotecario_firmado: 'Set Hipotecario',
  escritura_firmada: 'Escritura Firmada',
  entregado: 'Entregado',
  reciclado: 'Reciclado',
  calling: 'Llamando',
  cbr_listo: 'CBR Listo',
  rechazado: 'Rechazado',
  archivado: 'Archivado',
  bad_number: 'Nro Malo / No Invierte',
  no_answer: 'No Contesto',
  disqualified: 'No Califica',
};

const PIE_COLORS = [
  '#2563eb', '#16a34a', '#eab308', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1',
  '#84cc16', '#f43f5e', '#0ea5e9', '#a855f7', '#22c55e',
];

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function formatDays(d: number) {
  if (d === 0) return 'Hoy';
  if (d === 1) return '1 dia';
  return `${d} dias`;
}

interface WeeklyReportProps {
  open: boolean;
  onClose: () => void;
}

export default function WeeklyReport({ open, onClose }: WeeklyReportProps) {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    // Paginated fetch to handle >1000 leads
    const fetchAll = async () => {
      let all: Lead[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabase
          .from('leads')
          .select('*')
          .eq('is_demo', false)
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (!data || data.length === 0) break;
        all = all.concat(data as Lead[]);
        if (data.length < pageSize) break;
        page++;
      }
      setAllLeads(all);
      setLoading(false);
    };
    fetchAll();
  }, [open]);

  // Filter leads by date range
  const filteredLeads = useMemo(() => {
    let result = allLeads;
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      result = result.filter(l => new Date(l.created_at) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter(l => new Date(l.created_at) <= to);
    }
    return result;
  }, [allLeads, fromDate, toDate]);

  const now = new Date();
  const hasFilter = fromDate || toDate;

  // --- Status distribution (pie chart) ---
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLeads.forEach(l => {
      const label = STATUS_LABELS[l.status] || l.status;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  // --- Leads created per day ---
  const dailyNewLeads = useMemo(() => {
    // Determine date range for the bar chart
    let startDate: Date;
    let endDate: Date = new Date(now);

    if (fromDate && toDate) {
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
    } else if (fromDate) {
      startDate = new Date(fromDate);
    } else if (toDate) {
      endDate = new Date(toDate);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
    } else {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
    }

    const totalDays = daysBetween(startDate, endDate) + 1;
    const maxBars = Math.min(totalDays, 30);
    const step = Math.max(1, Math.floor(totalDays / maxBars));

    const days: { day: string; count: number }[] = [];
    for (let i = 0; i < totalDays; i += step) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dEnd = new Date(d);
      dEnd.setDate(dEnd.getDate() + step - 1);

      const key = d.toISOString().slice(0, 10);
      const keyEnd = dEnd.toISOString().slice(0, 10);
      const label = step === 1
        ? d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
        : `${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`;

      const count = filteredLeads.filter(l => {
        const lDate = l.created_at.slice(0, 10);
        return lDate >= key && lDate <= keyEnd;
      }).length;
      days.push({ day: label, count });
    }
    return days;
  }, [filteredLeads, fromDate, toDate]);

  // --- Source distribution ---
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLeads.forEach(l => {
      const src = l.source || 'Desconocido';
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  // --- Key metrics ---
  const metrics = useMemo(() => {
    const total = filteredLeads.length;
    const thisWeek = filteredLeads.filter(l => daysBetween(new Date(l.created_at), now) <= 7).length;
    const contacted = filteredLeads.filter(l => !['nuevo', 'no_contesta', 'calling'].includes(l.status)).length;
    const contactRate = total > 0 ? Math.round((contacted / total) * 100) : 0;

    const contactedLeads = filteredLeads.filter(l =>
      l.status_changed_at && !['nuevo', 'no_contesta', 'calling'].includes(l.status)
    );
    let avgContactHours = 0;
    if (contactedLeads.length > 0) {
      const totalHours = contactedLeads.reduce((sum, l) => {
        const created = new Date(l.created_at).getTime();
        const changed = new Date(l.status_changed_at!).getTime();
        return sum + (changed - created) / 3600000;
      }, 0);
      avgContactHours = totalHours / contactedLeads.length;
    }

    const sinGestion = filteredLeads.filter(l =>
      ['nuevo', 'no_contesta'].includes(l.status) && !l.last_attempt_at
    ).length;

    const activeLeads = filteredLeads.filter(l =>
      !['reciclado', 'entregado', 'escritura_firmada'].includes(l.status) && l.status_changed_at
    );
    let avgDaysSinceAction = 0;
    if (activeLeads.length > 0) {
      const totalDays = activeLeads.reduce((sum, l) => {
        return sum + daysBetween(new Date(l.status_changed_at!), now);
      }, 0);
      avgDaysSinceAction = Math.round(totalDays / activeLeads.length);
    }

    const stale = activeLeads.filter(l => daysBetween(new Date(l.status_changed_at!), now) >= 5).length;

    const aprobados = filteredLeads.filter(l => l.status === 'aprobado').length;
    const quiereMayorMonto = filteredLeads.filter(l => l.status === 'buscando_vivienda').length;
    const aprobadoOk = filteredLeads.filter(l => l.status === 'aprobado_ok').length;
    const evaluando = filteredLeads.filter(l => l.status === 'enviado_a_evaluar').length;
    const docIncompleta = filteredLeads.filter(l => l.status === 'solicitando_documentos').length;
    const esperandoDocs = filteredLeads.filter(l => l.status === 'esperando_documentos').length;
    const setHipotecario = filteredLeads.filter(l => l.status === 'set_hipotecario_firmado').length;
    const rechazaOferta = filteredLeads.filter(l => l.status === 'rechaza_oferta').length;

    const conCodeudor = filteredLeads.filter(l => l.con_codeudor).length;

    // Aprobación expiry metrics (30 days)
    const conAprobacion = filteredLeads.filter(l => l.fecha_aprobacion);
    const porVencer = conAprobacion.filter(l => {
      const days = daysBetween(new Date(l.fecha_aprobacion!), now);
      return days >= 20 && days < 30;
    }).length;
    const vencidos = conAprobacion.filter(l => {
      const days = daysBetween(new Date(l.fecha_aprobacion!), now);
      return days >= 30;
    }).length;

    return {
      total, thisWeek, contacted, contactRate,
      avgContactHours, sinGestion, avgDaysSinceAction, stale,
      aprobados, quiereMayorMonto, aprobadoOk, evaluando, esperandoDocs, docIncompleta,
      setHipotecario, rechazaOferta, conCodeudor, porVencer, vencidos,
    };
  }, [filteredLeads]);

  // --- Leads con aprobación vigente ---
  const expiringLeads = useMemo(() => {
    return filteredLeads
      .filter(l => l.fecha_aprobacion && ['aprobado', 'buscando_vivienda', 'aprobado_ok', 'rechaza_oferta', 'solicitando_documentos', 'enviado_a_evaluar'].includes(l.status))
      .map(l => {
        const days = daysBetween(new Date(l.fecha_aprobacion!), now);
        const remaining = 30 - days;
        return {
          name: l.name,
          phone: l.phone,
          status: STATUS_LABELS[l.status] || l.status,
          fechaAprobacion: new Date(l.fecha_aprobacion!).toLocaleDateString('es-CL'),
          diasTranscurridos: days,
          remaining,
        };
      })
      .sort((a, b) => a.remaining - b.remaining);
  }, [filteredLeads]);

  // --- Stale leads list (top 10) ---
  const staleLeads = useMemo(() => {
    return filteredLeads
      .filter(l =>
        !['reciclado', 'entregado', 'escritura_firmada'].includes(l.status) &&
        l.status_changed_at &&
        daysBetween(new Date(l.status_changed_at), now) >= 3
      )
      .map(l => ({
        name: l.name,
        status: STATUS_LABELS[l.status] || l.status,
        days: daysBetween(new Date(l.status_changed_at!), now),
        phone: l.phone,
      }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 10);
  }, [filteredLeads]);

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Reporte Semanal</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Cargando datos...</div>
        ) : (
          <div className="space-y-6">
            {/* Date Filter */}
            <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg bg-muted/50 border">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Desde</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Hasta</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
                />
              </div>
              {hasFilter && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 rounded-md border border-border bg-background text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Limpiar filtro
                </button>
              )}
              <div className="ml-auto text-sm text-muted-foreground">
                {hasFilter ? (
                  <span className="font-bold text-primary">{filteredLeads.length} de {allLeads.length} leads</span>
                ) : (
                  <span>{allLeads.length} leads totales</span>
                )}
              </div>
            </div>

            {filteredLeads.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No hay leads en ese rango de fechas</div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <KpiCard label="Total Leads" value={metrics.total} />
                  <KpiCard label={hasFilter ? 'En rango' : 'Nuevos (7 dias)'} value={hasFilter ? metrics.total : metrics.thisWeek} accent />
                  <KpiCard label="Tasa Contacto" value={`${metrics.contactRate}%`} />
                  <KpiCard label="Tiempo Contacto Prom." value={metrics.avgContactHours < 24 ? `${Math.round(metrics.avgContactHours)}h` : `${Math.round(metrics.avgContactHours / 24)}d`} />
                  <KpiCard label="Sin Gestion" value={metrics.sinGestion} warn={metrics.sinGestion > 0} />
                  <KpiCard label="Sin Movimiento 5+ dias" value={metrics.stale} warn={metrics.stale > 0} />
                  <KpiCard label="Dias Prom. Ultima Accion" value={formatDays(metrics.avgDaysSinceAction)} />
                  <KpiCard label="Con Codeudor" value={metrics.conCodeudor} />
                  <KpiCard label="Por Vencer (20-30d)" value={metrics.porVencer} warn={metrics.porVencer > 0} />
                  <KpiCard label="Vencidos (30d+)" value={metrics.vencidos} warn={metrics.vencidos > 0} />
                </div>

                {/* Pipeline Summary */}
                <div>
                  <h3 className="text-sm font-bold mb-2">Pipeline de Seguimiento</h3>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                    <div className="rounded-lg border p-2 text-center">
                      <div className="text-xl font-black text-blue-600">{metrics.docIncompleta}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">Doc. Incompleta</div>
                    </div>
                    <div className="rounded-lg border p-2 text-center">
                      <div className="text-xl font-black text-blue-400">{metrics.esperandoDocs}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">Esperando Docs</div>
                    </div>
                    <div className="rounded-lg border p-2 text-center">
                      <div className="text-xl font-black text-yellow-600">{metrics.evaluando}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">Enviado a Evaluar</div>
                    </div>
                    <div className="rounded-lg border p-2 text-center">
                      <div className="text-xl font-black text-green-600">{metrics.aprobados}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">Aprob. Buscando</div>
                    </div>
                    <div className="rounded-lg border p-2 text-center">
                      <div className="text-xl font-black text-orange-600">{metrics.quiereMayorMonto}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">Mayor Monto</div>
                    </div>
                    <div className="rounded-lg border p-2 text-center">
                      <div className="text-xl font-black text-teal-600">{metrics.aprobadoOk}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">Aprobado OK</div>
                    </div>
                    <div className="rounded-lg border p-2 text-center">
                      <div className="text-xl font-black text-violet-600">{metrics.setHipotecario}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">Set Hipotecario</div>
                    </div>
                    <div className="rounded-lg border p-2 text-center border-orange-500/30">
                      <div className="text-xl font-black text-orange-500">{metrics.rechazaOferta}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">Rechaza Oferta</div>
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Status Pie */}
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-bold mb-3">Distribucion por Estado</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, value }) => `${name} (${value})`}
                          labelLine={true}
                          fontSize={10}
                        >
                          {statusData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Daily New Leads Bar */}
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-bold mb-3">
                      {hasFilter ? 'Leads por dia (rango seleccionado)' : 'Leads Nuevos (ultimos 7 dias)'}
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={dailyNewLeads}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" fontSize={10} angle={-30} textAnchor="end" height={50} />
                        <YAxis allowDecimals={false} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Leads" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Source Distribution */}
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-bold mb-3">Leads por Fuente</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {sourceData.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs truncate">{s.name}</span>
                        <span className="text-xs font-bold ml-auto">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stale Leads Table */}
                {staleLeads.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-bold mb-3 text-destructive">Leads sin Movimiento (3+ dias)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2">Nombre</th>
                            <th className="text-left py-2 px-2">Telefono</th>
                            <th className="text-left py-2 px-2">Estado</th>
                            <th className="text-right py-2 px-2">Dias sin Accion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staleLeads.map((l, i) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-1.5 px-2 font-medium">{l.name}</td>
                              <td className="py-1.5 px-2 text-muted-foreground">{l.phone}</td>
                              <td className="py-1.5 px-2">{l.status}</td>
                              <td className="py-1.5 px-2 text-right font-bold" style={{ color: l.days >= 7 ? '#ef4444' : l.days >= 5 ? '#eab308' : '#6b7280' }}>
                                {l.days}d
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Approvals Status Table */}
                <div className={`rounded-lg border-2 p-4 ${expiringLeads.some(l => l.remaining <= 10) ? 'border-orange-500/50 bg-orange-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
                  <h3 className="text-sm font-bold mb-3">
                    {expiringLeads.some(l => l.remaining <= 10)
                      ? <span className="text-orange-600">Aprobaciones por Vencer (ventana 30 dias)</span>
                      : <span className="text-green-700">Estado de Aprobaciones (ventana 30 dias)</span>
                    }
                  </h3>
                  {expiringLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No hay leads con fecha de aprobacion registrada.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2">Nombre</th>
                            <th className="text-left py-2 px-2">Telefono</th>
                            <th className="text-left py-2 px-2">Estado</th>
                            <th className="text-left py-2 px-2">Fecha Aprob.</th>
                            <th className="text-right py-2 px-2">Dias Restantes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expiringLeads.map((l, i) => (
                            <tr key={i} className={`border-b last:border-0 hover:bg-muted/50 ${l.remaining <= 0 ? 'bg-red-50' : l.remaining <= 5 ? 'bg-orange-50' : l.remaining <= 10 ? 'bg-yellow-50' : ''}`}>
                              <td className="py-1.5 px-2 font-medium">{l.name}</td>
                              <td className="py-1.5 px-2 text-muted-foreground">{l.phone}</td>
                              <td className="py-1.5 px-2">{l.status}</td>
                              <td className="py-1.5 px-2">{l.fechaAprobacion}</td>
                              <td className="py-1.5 px-2 text-right font-bold" style={{ color: l.remaining <= 0 ? '#ef4444' : l.remaining <= 5 ? '#f97316' : l.remaining <= 10 ? '#eab308' : '#16a34a' }}>
                                {l.remaining <= 0 ? 'VENCIDO' : `${l.remaining}d`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Status Detail Table */}
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-bold mb-3">Detalle por Estado</h3>
                  <div className="space-y-1">
                    {statusData.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-2 py-1">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-sm flex-1">{s.name}</span>
                        <span className="text-sm font-bold">{s.value}</span>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {Math.round((s.value / filteredLeads.length) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KpiCard({ label, value, accent, warn }: { label: string; value: string | number; accent?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${warn ? 'border-destructive/50 bg-destructive/5' : accent ? 'border-primary/50 bg-primary/5' : ''}`}>
      <div className={`text-2xl font-black ${warn ? 'text-destructive' : accent ? 'text-primary' : ''}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
