import { useEffect } from 'react';

interface AlertActivatorProps {
  enabled: boolean;
  onActivate: () => void;
  onDeactivate?: () => void;
  onTest?: () => void;
}

const AlertActivator = ({ enabled, onActivate, onDeactivate, onTest }: AlertActivatorProps) => {
  // Auto-activate on first user interaction (click/key/touch)
  useEffect(() => {
    if (enabled) return;

    const events = ['click', 'keydown', 'mousedown', 'touchstart'] as const;

    const handleInteraction = () => {
      console.log('[Alerts] Auto-activating on user interaction');
      onActivate();
      events.forEach(e => window.removeEventListener(e, handleInteraction));
    };

    events.forEach(e => window.addEventListener(e, handleInteraction, { once: true }));

    return () => {
      events.forEach(e => window.removeEventListener(e, handleInteraction));
    };
  }, [enabled, onActivate]);

  // Always show the status (active or inactive)
  return (
    <div className="flex items-center gap-2">
      {enabled ? (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/15 border border-success/30">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-bold text-success">Alertas activas</span>
        </div>
      ) : (
        <button
          onClick={onActivate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-muted-foreground" />
          <span className="text-sm font-bold">Activar alertas</span>
        </button>
      )}
      {onTest && (
        <button
          onClick={onTest}
          className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary font-bold text-xs hover:bg-primary/20 transition-all"
        >
          🔊 Probar
        </button>
      )}
    </div>
  );
};

export default AlertActivator;
