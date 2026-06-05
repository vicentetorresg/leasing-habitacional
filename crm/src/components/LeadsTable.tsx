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
  { value: 'new', label: '🆕 Nuevos' },
  { value: 'first_call', label: '1️⃣ 1er Llamado' },
  { value: 'second_call', label: '2️⃣ 2do Llamado' },
  { value: 'asesoria_agendada', label: '✅ Agendados' },
  { value: 'disqualified', label: '🚫 No Califica' },
  { value: 'bad_number', label: '❌ Nro Malo / No Invierte' },
  { value: 'reciclado', label: '♻️ Reciclado' },
];

function formatSource(source: string): string {
  if (source.toLowerCase().includes('facebook') || source.toLowerCase() === 'fb') return 'FB';
  if (source.toLowerCase().includes('instagram') || source.toLowerCase() === 'ig') return 'IG';
  if (source.toLowerCase().includes('tiktok') || source.toLowerCase() === 'tt') return 'TT';
  return source;
}

function formatSueldo(lead: Lead): string {
  if (lead.sueldo_liquido_raw) return lead.sueldo_liquido_raw;
  if (lead.sueldo_liquido) return `$${lead.sueldo_liquido.toLocaleString('es-CL')}`;
  return '—';
}

const statusConfig: Record<string, { label: string; style: string }> = {
  new: { label: '🆕 Nuevo', style: 'bg-primary/15 text-primary' },
  calling: { label: '📞 Llamando', style: 'bg-primary/15 text-primary animate-pulse' },
  first_call: { label: '1️⃣ 1er', style: 'bg-warning/15 text-warning' },
  second_call: { label: '2️⃣ 2do', style: 'bg-accent/15 text-accent' },
  scheduled: { label: '✅ Agend.', style: 'bg-success/15 text-success' },
  asesoria_agendada: { label: '✅ Agend.', style: 'bg-success/15 text-success' },
  recontactar: { label: '✅ Agend.', style: 'bg-success/15 text-success' },
  asesoria_concretada: { label: '✅ Agend.', style: 'bg-success/15 text-success' },
  plan_presentado: { label: '✅ Agend.', style: 'bg-success/15 text-success' },
  departamento_reservado: { label: '✅ Agend.', style: 'bg-success/15 text-success' },
  departamento_cerrado: { label: '✅ Agend.', style: 'bg-success/15 text-success' },
  cierres: { label: '✅ Agend.', style: 'bg-success/15 text-success' },
  disqualified: { label: '🚫 No cal.', style: 'bg-muted text-muted-foreground' },
  bad_number: { label: '❌ Nro Malo/No Inv.', style: 'bg-destructive/15 text-destructive' },
  reciclado: { label: '♻️ Reciclado', style: 'bg-emerald-500/15 text-emerald-600' },
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
  const [sortField, setSortField] = useState<'created_at' | 'name' | 'status' | 'status_changed_at'>('status_changed_at');
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
              <TableHead className="px-2">Fuente</TableHead>
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
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  {searchInput || statusFilter !== 'all' ? 'Sin resultados para este filtro' : 'No hay leads pendientes'}
                </TableCell>
              </TableRow>
            )}
            {paginated.map((lead, idx) => {
              const attempts = attemptCounts[lead.id] ?? 0;
              const s = statusConfig[lead.status] || statusConfig.new;
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
                  <TableCell className="px-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold whitespace-nowrap">
                      {formatSource(lead.source)}
                    </span>
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
