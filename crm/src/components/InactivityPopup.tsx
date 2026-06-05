import type { Lead } from '@/hooks/useLeads';

interface InactivityPopupProps {
  lead: Lead | null;
  onDismiss: () => void;
  onCallNow: (leadId: string) => void;
}

const InactivityPopup = ({ lead, onDismiss, onCallNow }: InactivityPopupProps) => {
  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 backdrop-blur-sm">
      <div className="bg-card border-2 border-destructive rounded-2xl p-10 max-w-lg w-full mx-4 animate-pulse-glow text-center space-y-6">
        <div className="text-7xl">⏰</div>
        <h2 className="text-3xl font-black text-destructive">¡LLAMAR AHORA!</h2>
        <p className="text-muted-foreground text-lg">
          Han pasado más de 3 minutos sin actividad
        </p>
        <div className="bg-secondary rounded-xl p-4 space-y-1">
          <p className="text-2xl font-black text-foreground">{lead.name}</p>
          <p className="text-xl font-mono text-accent">{lead.phone}</p>
          <p className="text-sm text-muted-foreground">{lead.source}</p>
        </div>
        <div className="flex gap-4">
          <a
            href={`tel:${lead.phone}`}
            onClick={() => onCallNow(lead.id)}
            className="flex-1 py-5 rounded-xl text-center text-2xl font-black text-primary-foreground bg-primary glow-red hover:scale-[1.02] transition-transform"
          >
            🚨 LLAMAR
          </a>
          <button
            onClick={onDismiss}
            className="px-6 py-5 rounded-xl text-muted-foreground bg-secondary hover:bg-muted transition-colors font-bold"
          >
            Después
          </button>
        </div>
      </div>
    </div>
  );
};

export default InactivityPopup;
