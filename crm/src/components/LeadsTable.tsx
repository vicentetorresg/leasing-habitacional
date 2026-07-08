import { useState, useEffect } from 'react';
import type { Lead } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import LeadDownloadDialog from '@/components/LeadDownloadDialog';

interface LeadsTableProps {
  leads: Lead[];
  selectedLeadId?: string | null;
  onSelect?: (lead: Lead) => void;
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'nuevo', label: '🆕 Nuevo' },
  { value: 'contactado', label: '✅ Contactado' },
  { value: 'recontactar', label: '🔄 Recontactar' },
  { value: 'no_contesta', label: '📵 No Contesta' },
  { value: 'no_califica', label: '🚫 No Califica' },
  { value: 'solicitando_documentos', label: '📋 Solicitando Documentos' },
  { value: 'enviado_a_evaluar', label: '📤 Enviado a Evaluar' },
  { value: 'aprobado', label: '✅ Aprobado' },
  { value: 'buscando_vivienda', label: '🏠 Buscando Vivienda' },
  { value: 'cbr_listo', label: '🎉 CBR Listo' },
  { value: 'rechazado', label: '❌ Rechazado' },
];

function formatSource(source: string): string {
  if (source.toLowerCase().includes('facebook') || source.toLowerCase() === 'fb') return 'FB';
  if (source.toLowerCase().includes('instagram') || source.toLowerCase() === 'ig') return 'IG';
  if (source.toLowerCase().includes('tiktok') || source.toLowerCase() === 'tt') return 'TT';
  return source;
}

function formatAdPlatform(lead: Lead): { label: string; style: string } {
  const utm = (lead.utm_source || '').toLowerCase();
  const src = (lead.source || '').toLowerCase();
  // DM detection from source field
  if (src.startsWith('dm tiktok'))
    return { label: 'DM TikTok', style: 'bg-pink-500/15 text-pink-600' };
  if (src.startsWith('dm meta'))
    return { label: 'DM Meta', style: 'bg-blue-500/15 text-blue-600' };
  // UTM detection from ads
  if (utm.includes('facebook') || utm.includes('fb') || utm.includes('ig') || utm.includes('instagram') || utm.includes('meta'))
    return { label: 'META', style: 'bg-blue-500/15 text-blue-600' };
  if (utm.includes('tiktok') || utm.includes('tt'))
    return { label: 'TikTok', style: 'bg-pink-500/15 text-pink-600' };
  if (utm.includes('google'))
    return { label: 'Google', style: 'bg-yellow-500/15 text-yellow-700' };
  if (utm)
    return { label: utm, style: 'bg-muted text-muted-foreground' };
  // Source-based fallback
  if (src.startsWith('meta ads'))
    return { label: 'META', style: 'bg-blue-500/15 text-blue-600' };
  if (src.startsWith('tiktok ads'))
    return { label: 'TikTok', style: 'bg-pink-500/15 text-pink-600' };
  return { label: 'Orgánico', style: 'bg-emerald-500/15 text-emerald-600' };
}

const PRIORITY_CONFIG: Record<string, { label: string; style: string }> = {
  alta: { label: '🔴 Alta', style: 'bg-destructive/15 text-destructive' },
  media: { label: '🟡 Media', style: 'bg-warning/15 text-warning' },
  baja: { label: '🟢 Baja', style: 'bg-success/15 text-success' },
};

function formatSueldo(lead: Lead): string {
  if (lead.sueldo_liquido_raw) return lead.sueldo_liquido_raw;
  if (lead.sueldo_liquido) return `$${lead.sueldo_liquido.toLocaleString('es-CL')}`;
  return '—';
}

const statusConfig: Record<string, { label: string; style: string }> = {
  nuevo: { label: '🆕 Nuevo', style: 'bg-primary/15 text-primary' },
  contactado: { label: '✅ Contactado', style: 'bg-success/15 text-success' },
  recontactar: { label: '🔄 Recontactar', style: 'bg-warning/15 text-warning' },
  no_contesta: { label: '📵 No Contesta', style: 'bg-accent/15 text-accent' },
  no_califica: { label: '🚫 No Califica', style: 'bg-muted text-muted-foreground' },
  calling: { label: '📞 Llamando', style: 'bg-primary/15 text-primary' },
  solicitando_documentos: { label: '📋 Sol. Docs', style: 'bg-primary/15 text-primary' },
  enviado_a_evaluar: { label: '📤 Evaluando', style: 'bg-yellow-500/15 text-yellow-600' },
  aprobado: { label: '✅ Aprobado', style: 'bg-success/15 text-success' },
  buscando_vivienda: { label: '🏠 Buscando', style: 'bg-blue-500/15 text-blue-600' },
  set_hipotecario_firmado: { label: '✍️ Set Firmado', style: 'bg-violet-500/15 text-violet-600' },
  escritura_firmada: { label: '📜 Escritura', style: 'bg-indigo-500/15 text-indigo-600' },
  cbr_listo: { label: '🎉 CBR Listo', style: 'bg-emerald-500/15 text-emerald-600' },
  rechazado: { label: '❌ Rechazado', style: 'bg-destructive/15 text-destructive' },
  archivado: { label: '📦 Archivado', style: 'bg-muted text-muted-foreground' },
};

const PAGE_SIZE = 100;

const LeadsTable = ({ leads, selectedLeadId, onSelect }: LeadsTableProps) => {
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Debounce search to avoid re-filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  const [sortField, setSortField] = useState<'created_at' | 'name' | 'status' | 'status_changed_at'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  // Normalize status for filtering (calling → new, all advisor stages → asesoria_agendada)
  const ADVISOR_STAGE_STATUSES = ['asesoria_agendada', 'recontactar', 'asesoria_concretada', 'plan_presentado', 'departamento_reservado', 'departamento_cerrado', 'cierres'];
  function toFilterStatus(s: string): string {
    if (s === 'calling') return 'new';
    if (s === 'scheduled') return 'asesoria_agendada';
    if (ADVISOR_STAGE_STATUSES.includes(s)) return 'asesoria_agendada';
    return s;
  }

  // Filter
  const filtered = leads.filter(l => {
    if (statusFilter !== 'all') {
      if (toFilterStatus(l.status) !== statusFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.rut && l.rut.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'status_changed_at') {
      const aTime = a.status_changed_at ? new Date(a.status_changed_at).getTime() : new Date(a.created_at).getTime();
      const bTime = b.status_changed_at ? new Date(b.status_changed_at).getTime() : new Date(b.created_at).getTime();
      cmp = aTime - bTime;
    } else if (sortField === 'created_at') {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortField === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else if (sortField === 'status') {
      cmp = a.status.localeCompare(b.status);
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Fetch attempt counts only for the current page's leads
  useEffect(() => {
    if (paginated.length === 0) return;
    const ids = paginated.map(l => l.id);
    supabase
      .from('call_attempts')
      .select('lead_id')
      .in('lead_id', ids)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        ids.forEach(id => { counts[id] = 0; });
        data?.forEach((row: { lead_id: string }) => {
          counts[row.lead_id] = (counts[row.lead_id] || 0) + 1;
        });
        setAttemptCounts(prev => ({ ...prev, ...counts }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage, statusFilter, searchQuery, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(0);
  };

  // Reset to page 0 when filters change
  useEffect(() => { setPage(0); }, [searchQuery, statusFilter]);

  const sortIcon = (field: typeof sortField) => {
    if (sortField !== field) return '↕';
    return sortDir === 'desc' ? '↓' : '↑';
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      {/* Filters */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Leads ({filtered.length}){totalPages > 1 ? ` · Pág ${safePage + 1}/${totalPages}` : ''}
          </h3>
          <LeadDownloadDialog leads={filtered} />
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`text-[10px] px-2 py-1 rounded-full font-bold transition-colors ${
                statusFilter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="🔍 Buscar nombre, teléfono, email o RUT..."
          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground disabled:opacity-40 hover:bg-accent transition-colors font-bold"
          >
            ← Anterior
          </button>
          <span className="text-xs text-muted-foreground">
            {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground disabled:opacity-40 hover:bg-accent transition-colors font-bold"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-10 px-2 text-center">#</TableHead>
              <TableHead
                className="cursor-pointer select-none px-2"
                onClick={() => toggleSort('status')}
              >
                Estado {sortIcon('status')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none px-2"
                onClick={() => toggleSort('name')}
              >
                Nombre {sortIcon('name')}
              </TableHead>
              <TableHead className="px-2">Teléfono</TableHead>
              <TableHead className="px-2">RUT</TableHead>
              <TableHead className="px-2">Renta</TableHead>
              <TableHead className="px-2">Arriendo</TableHead>
              <TableHead className="px-2 text-center">Contrato</TableHead>
              <TableHead className="px-2 text-center">Vivienda</TableHead>
              <TableHead className="px-2">Valor Prop.</TableHead>
              <TableHead className="px-2">Comuna</TableHead>
              <TableHead className="px-2">Complementa</TableHead>
              <TableHead className="px-2">Contacto</TableHead>
              <TableHead className="px-2">Horario</TableHead>
              <TableHead className="px-2">Prioridad</TableHead>
              <TableHead className="px-2">Fuente</TableHead>
              <TableHead className="px-2">Plataforma</TableHead>
              <TableHead className="px-2">DICOM</TableHead>
              <TableHead className="px-2">Intentos</TableHead>
              <TableHead
                className="cursor-pointer select-none px-2"
                onClick={() => toggleSort('status_changed_at')}
              >
                Últ. cambio {sortIcon('status_changed_at')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none px-2"
                onClick={() => toggleSort('created_at')}
              >
                Creación {sortIcon('created_at')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={20} className="text-center py-8 text-muted-foreground">
                  {searchInput || statusFilter !== 'all' ? 'Sin resultados para este filtro' : 'No hay leads pendientes'}
                </TableCell>
              </TableRow>
            )}
            {paginated.map((lead, idx) => {
              const attempts = attemptCounts[lead.id] ?? 0;
              const s = statusConfig[lead.status] || { label: lead.status, style: 'bg-muted text-muted-foreground' };
              const isSelected = selectedLeadId === lead.id;
              const globalIdx = safePage * PAGE_SIZE + idx;

              return (
                <TableRow
                  key={lead.id}
                  onClick={() => onSelect?.(lead)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : attempts === 0 && lead.status === 'new'
                        ? 'bg-warning/5 hover:bg-warning/10'
                        : 'hover:bg-muted/50'
                  }`}
                >
                  <TableCell className="px-2 text-center text-xs text-muted-foreground font-mono">
                    {globalIdx + 1}
                  </TableCell>
                  <TableCell className="px-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${s.style}`}>
                      {s.label}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 font-bold text-foreground text-sm max-w-[160px] truncate">
                    {lead.name}
                  </TableCell>
                  <TableCell className="px-2 font-mono text-accent text-xs whitespace-nowrap">
                    {lead.phone}
                  </TableCell>
                  <TableCell className="px-2 text-xs text-muted-foreground whitespace-nowrap">
                    {lead.rut || '—'}
                  </TableCell>
                  <TableCell className="px-2 text-xs text-foreground whitespace-nowrap max-w-[120px] truncate" title={formatSueldo(lead)}>
                    {formatSueldo(lead)}
                  </TableCell>
                  <TableCell className="px-2 text-xs text-muted-foreground whitespace-nowrap">
                    {(lead as any).arriendo || '—'}
                  </TableCell>
                  <TableCell className="px-2 text-center text-xs">
                    {(lead as any).contrato === 'si' ? <span className="text-success font-bold">✅</span> : (lead as any).contrato === 'no' ? <span className="text-destructive font-bold">❌</span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="px-2 text-center text-xs">
                    {(lead as any).vivienda === 'si' ? <span className="text-warning font-bold">⚠️</span> : (lead as any).vivienda === 'no' ? <span className="text-success font-bold">✅</span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="px-2 text-[10px] text-muted-foreground max-w-[100px] truncate" title={(lead as any).precio_propiedad_ok || ''}>
                    {(lead as any).precio_propiedad_ok || '—'}
                  </TableCell>
                  <TableCell className="px-2 text-[10px] text-muted-foreground max-w-[80px] truncate" title={(lead as any).comuna_propiedad || ''}>
                    {(lead as any).comuna_propiedad || '—'}
                  </TableCell>
                  <TableCell className="px-2 text-[10px] text-muted-foreground max-w-[80px] truncate" title={(lead as any).complementa_renta || ''}>
                    {(lead as any).complementa_renta || '—'}
                  </TableCell>
                  <TableCell className="px-2 text-[10px] text-muted-foreground whitespace-nowrap">
                    {(lead as any).preferencia_contacto === 'whatsapp' ? '💬' : (lead as any).preferencia_contacto === 'telefono' ? '📞' : '—'}
                  </TableCell>
                  <TableCell className="px-2 text-[10px] text-muted-foreground whitespace-nowrap">
                    {(lead as any).horario_contacto || '—'}
                  </TableCell>
                  <TableCell className="px-2">
                    {(() => { const p = PRIORITY_CONFIG[lead.priority] || { label: lead.priority, style: 'bg-muted text-muted-foreground' }; return (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${p.style}`}>{p.label}</span>
                    ); })()}
                  </TableCell>
                  <TableCell className="px-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold whitespace-nowrap">
                      {formatSource(lead.source)}
                    </span>
                  </TableCell>
                  <TableCell className="px-2">
                    {(() => { const ap = formatAdPlatform(lead); return (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${ap.style}`}>{ap.label}</span>
                    ); })()}
                  </TableCell>
                  <TableCell className="px-2 text-xs text-center">
                    {lead.en_dicom ? <span className="text-destructive font-bold">⚠️</span> : <span className="text-success">✅</span>}
                  </TableCell>
                  <TableCell className="px-2 text-center">
                    {attempts === 0 && lead.status === 'new' ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning font-bold">Sin llamar</span>
                    ) : attempts === 0 && lead.last_attempt_at ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono" title={new Date(lead.last_attempt_at).toLocaleString('es-CL')}>
                        📞 {new Date(lead.last_attempt_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-muted-foreground">{attempts}x</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 text-xs text-muted-foreground whitespace-nowrap">
                    {lead.status_changed_at
                      ? `${new Date(lead.status_changed_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} ${new Date(lead.status_changed_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
                      : '—'}
                  </TableCell>
                  <TableCell className="px-2 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}{' '}
                    {new Date(lead.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LeadsTable;
