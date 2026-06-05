import { useState, useEffect, useCallback, useRef } from 'react';
import type { Lead } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';

interface PendingLeadsSidebarProps {
  leads: Lead[];
  totalPending?: number;
  onDelete?: (leadId: string) => void;
  onSelect?: (lead: Lead) => void;
  selectedLeadId?: string | null;
}

function formatSource(source: string): string {
  if (source.toLowerCase().includes('facebook') || source.toLowerCase() === 'fb') return '📘 FB';
  if (source.toLowerCase().includes('instagram') || source.toLowerCase() === 'ig') return '📸 IG';
  return `📋 ${source}`;
}

function formatMoney(amount: number | null): string {
  if (!amount) return '—';
  return `$${amount.toLocaleString('es-CL')}`;
}

function formatSueldo(lead: Lead): React.ReactNode {
  if (lead.sueldo_liquido_raw) {
    return <span className="text-[10px] leading-tight">{lead.sueldo_liquido_raw}</span>;
  }
  return <>{formatMoney(lead.sueldo_liquido)}</>;
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: '🆕 Nuevos' },
  { value: 'first_call', label: '1️⃣ Primer Llamado' },
  { value: 'second_call', label: '2️⃣ Segundo Llamado' },
];

const PendingLeadsSidebar = ({ leads, totalPending, onDelete, onSelect, selectedLeadId }: PendingLeadsSidebarProps) => {
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [orderedLeads, setOrderedLeads] = useState<Lead[]>(leads);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [animateDir, setAnimateDir] = useState<'up' | 'down' | null>(null);
  const [flyingOutId, setFlyingOutId] = useState<string | null>(null);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Always sort by created_at descending (most recent first)
  useEffect(() => {
    const sorted = [...leads].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setOrderedLeads(sorted);
  }, [leads]);

  // Filter by search and status
  const filteredLeads = orderedLeads.filter(l => {
    // Status filter (treat 'calling' as 'new' visually)
    if (statusFilter !== 'all') {
      const uiStatus = l.status === 'calling' ? 'new' : l.status;
      if (uiStatus !== statusFilter) return false;
    }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return l.name.toLowerCase().includes(q) || l.phone.toLowerCase().includes(q) || (l.email && l.email.toLowerCase().includes(q));
    }
    return true;
  });

  useEffect(() => {
    if (leads.length === 0) return;
    const ids = leads.map(l => l.id);
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
        setAttemptCounts(counts);
      });
  }, [leads]);

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const leadId = orderedLeads[idx].id;
    const swapId = orderedLeads[idx - 1].id;
    setAnimatingId(leadId);
    setAnimateDir('up');
    setTimeout(() => {
      setOrderedLeads(prev => {
        const next = [...prev];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        return next;
      });
      setAnimatingId(null);
      setAnimateDir(null);
    }, 200);
  };

  const moveDown = (idx: number) => {
    if (idx >= orderedLeads.length - 1) return;
    const leadId = orderedLeads[idx].id;
    setAnimatingId(leadId);
    setAnimateDir('down');
    setTimeout(() => {
      setOrderedLeads(prev => {
        const next = [...prev];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next;
      });
      setAnimatingId(null);
      setAnimateDir(null);
    }, 200);
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setOrderedLeads(prev => {
      const next = [...prev];
      const [dragged] = next.splice(dragIdx, 1);
      next.splice(idx, 0, dragged);
      return next;
    });
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };


  return (
    <div className="w-80 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border space-y-2">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Pendientes ({totalPending ?? orderedLeads.length})
        </h3>
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
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="🔍 Buscar nombre, teléfono o email..."
          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {filteredLeads.map((lead, idx) => {
          const attempts = attemptCounts[lead.id] ?? 0;
          const neverCalled = attempts === 0 && lead.status === 'new';
          const calledButUntracked = attempts === 0 && !neverCalled && !!lead.last_attempt_at;
          return (
            <div
              key={lead.id}
              ref={el => { cardRefs.current[lead.id] = el; }}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              style={{
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                transform: animatingId === lead.id
                  ? animateDir === 'up' ? 'translateY(-100%)' : 'translateY(100%)'
                  : 'translateY(0)',
              }}
              onClick={(e) => {
                e.preventDefault();
                if (flyingOutId) return;
                setFlyingOutId(lead.id);
                setTimeout(() => {
                  onSelect?.(lead);
                  setFlyingOutId(null);
                }, 300);
              }}
              className={`p-3 rounded-lg border space-y-2 cursor-pointer active:cursor-grabbing transition-all ${
                flyingOutId === lead.id
                  ? 'animate-card-out'
                  : newlyAddedIds.has(lead.id)
                    ? 'animate-fly-to-sidebar'
                    : selectedLeadId === lead.id
                      ? 'ring-2 ring-primary border-primary bg-primary/10 scale-[1.02]'
                      : dragIdx === idx
                        ? 'opacity-50 scale-95 border-primary'
                        : neverCalled
                          ? 'bg-warning/5 border-warning/30 hover:border-primary/30'
                          : 'bg-secondary/50 border-border/50 hover:border-primary/30'
              }`}
            >
              {/* Reorder controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs text-muted-foreground font-mono w-5 text-center">{idx + 1}</span>
                  {neverCalled ? (
                    <span className="px-2 py-0.5 rounded bg-warning/15 text-warning text-xs font-bold">🆕 Sin llamar</span>
                  ) : calledButUntracked ? (
                    <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs font-mono" title={new Date(lead.last_attempt_at!).toLocaleString('es-CL')}>
                      📞 {new Date(lead.last_attempt_at!).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs font-bold">🔄 {attempts}x</span>
                  )}
                  {/* Status badge */}
                  {(() => {
                    const uiStatus = lead.status === 'calling' ? 'new' : lead.status;
                    const statusMap: Record<string, { label: string; style: string }> = {
                      new: { label: '🆕 Nuevo', style: 'bg-primary/15 text-primary' },
                      first_call: { label: '1er llamado', style: 'bg-warning/15 text-warning' },
                      second_call: { label: '2do llamado', style: 'bg-accent/15 text-accent' },
                      scheduled: { label: '✅ Agendado', style: 'bg-success/15 text-success' },
                      asesoria_agendada: { label: '✅ Agendado', style: 'bg-success/15 text-success' },
                      disqualified: { label: '🚫 No califica', style: 'bg-muted text-muted-foreground' },
                      bad_number: { label: '❌ Nro Malo/No Inv.', style: 'bg-destructive/15 text-destructive' },
                    };
                    const s = statusMap[uiStatus] || statusMap.new;
                    return (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.style}`}>
                        {s.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="w-6 h-6 flex items-center justify-center rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
                  >▲</button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === orderedLeads.length - 1}
                    className="w-6 h-6 flex items-center justify-center rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
                  >▼</button>
                </div>
              </div>

              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground text-sm truncate">{lead.name}</p>
                  <p className="font-mono text-accent text-xs mt-0.5">{lead.phone}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {formatSource(lead.source)}
                </span>
              </div>

              {/* RUT & Renta */}
              <div className="flex gap-3 text-xs">
                {lead.rut && (
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">RUT:</strong> {lead.rut}
                  </span>
                )}
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Renta:</strong> {formatSueldo(lead)}
                </span>
              </div>

              {/* Date */}
              <p className="text-xs text-muted-foreground">
                📅 {new Date(lead.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>

              {/* Delete button */}
              {onDelete && (
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
                    className="px-3 py-2 rounded-lg text-sm font-bold bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PendingLeadsSidebar;
