import { useEffect } from 'react';
import type { Lead } from '@/hooks/useLeads';

function formatSource(source: string): string {
  if (source.toLowerCase().includes('facebook') || source.toLowerCase() === 'fb') return '📘 Facebook';
  if (source.toLowerCase().includes('instagram') || source.toLowerCase() === 'ig') return '📸 Instagram';
  return `📋 ${source}`;
}

function formatMoney(amount: number | null): string {
  if (!amount) return '—';
  return `$${amount.toLocaleString('es-CL')}`;
}

function formatSueldo(lead: Lead): string {
  if (lead.sueldo_liquido_raw) return lead.sueldo_liquido_raw;
  return formatMoney(lead.sueldo_liquido);
}

interface UrgentCallPopupProps {
  lead: Lead;
  onDismiss: () => void;
  onCallNow: (leadId: string) => void;
}

const UrgentCallPopup = ({ lead, onDismiss, onCallNow }: UrgentCallPopupProps) => {
  // No auto-dismiss — user must act

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in duration-200">
      <div className="bg-card border-4 border-destructive rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-destructive/30 space-y-4 animate-in zoom-in-95 duration-300">
        {/* Urgent Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl animate-pulse">🚨</span>
            <h2 className="text-lg font-black text-destructive uppercase">¡Llevas 2 min sin llamar!</h2>
          </div>
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground text-sm px-2 py-1 rounded hover:bg-muted transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Lead Info Card */}
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-black text-foreground">{lead.name}</p>
              <p className="text-lg font-mono font-bold text-accent">📞 {lead.phone}</p>
            </div>
            {lead.status !== 'new' && (
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-warning/15 text-warning">
                🔄 Rellamar
              </span>
            )}
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {lead.rut && (
              <div>
                <span className="text-xs text-muted-foreground uppercase">RUT</span>
                <p className="font-bold text-foreground">{lead.rut}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground uppercase">Sueldo</span>
              <p className="font-bold text-foreground text-xs break-all leading-tight">{formatSueldo(lead)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase">Fuente</span>
              <p className="font-bold text-foreground">{formatSource(lead.source)}</p>
            </div>
            {lead.proyecto && (
              <div>
                <span className="text-xs text-muted-foreground uppercase">Proyecto</span>
                <p className="font-bold text-foreground">{lead.proyecto}</p>
              </div>
            )}
            {lead.email && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground uppercase">Email</span>
                <p className="font-bold text-foreground">{lead.email}</p>
              </div>
            )}
            {lead.en_dicom && (
              <div>
                <span className="text-xs text-muted-foreground uppercase">DICOM</span>
                <p className="font-bold text-destructive">⚠️ Sí</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onCallNow(lead.id)}
            className="flex-1 py-4 rounded-xl text-center text-lg font-black text-primary-foreground bg-primary hover:bg-primary/90 transition-all animate-pulse hover:animate-none"
          >
            🚨 LLAMAR AHORA
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-4 rounded-xl text-xs text-muted-foreground bg-secondary hover:bg-muted transition-colors font-bold"
          >
            Después
          </button>
        </div>
      </div>
    </div>
  );
};

export default UrgentCallPopup;
