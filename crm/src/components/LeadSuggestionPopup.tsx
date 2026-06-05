import { useState, useEffect } from 'react';
import type { Lead } from '@/hooks/useLeads';

const MOTIVATIONAL_MESSAGES = [
  '¡Aprovecha de llamar a',
  '¿Y si llamas a',
  '¡Este lead te está esperando!',
  '¡Vamos, tú puedes! Llama a',
  '¡No dejes pasar a',
  'Siguiente llamada sugerida:',
  '💪 ¡Dale con todo! Llama a',
  '🎯 Lead pendiente:',
  '¡Un lead te necesita!',
  '📋 Tienes pendiente a',
  '¡Hay alguien esperando tu llamada!',
];

function getRandomMessage() {
  return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
}

function formatSource(source: string): string {
  if (source.toLowerCase().includes('facebook') || source.toLowerCase() === 'fb') return '📘 Facebook';
  if (source.toLowerCase().includes('instagram') || source.toLowerCase() === 'ig') return '📸 Instagram';
  return `📋 ${source}`;
}

interface LeadSuggestionPopupProps {
  lead: Lead;
  onDismiss: () => void;
  onCallNow: (leadId: string) => void;
}

const LeadSuggestionPopup = ({ lead, onDismiss, onCallNow }: LeadSuggestionPopupProps) => {
  const [message] = useState(getRandomMessage);

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 15000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const needsPrefix = message.endsWith(' a') || message.endsWith(':');

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-card border-2 border-primary/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-primary/10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-2xl">📞</span>
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground text-sm px-2 py-1 rounded hover:bg-muted transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Message */}
        <p className="text-sm font-bold text-primary">
          {needsPrefix ? `${message} ${lead.name}!` : message}
        </p>

        {/* Lead card */}
        <div className="bg-secondary/50 rounded-xl p-3 space-y-1">
          <p className="text-lg font-black text-foreground">{lead.name}</p>
          <p className="text-sm font-mono text-accent">{lead.phone}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatSource(lead.source)}</span>
            {lead.status === 'no_answer' && <span className="text-warning font-bold">🔄 No contestó antes</span>}
            {lead.status === 'busy' && <span className="text-warning font-bold">⏳ Estaba ocupado</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <a
            href={`tel:${lead.phone}`}
            onClick={() => onCallNow(lead.id)}
            className="flex-1 py-3 rounded-xl text-center text-sm font-black text-primary-foreground bg-primary hover:bg-primary/90 transition-all"
          >
            📞 Llamar ahora
          </a>
          <button
            onClick={onDismiss}
            className="px-4 py-3 rounded-xl text-xs text-muted-foreground bg-secondary hover:bg-muted transition-colors font-bold"
          >
            Después
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadSuggestionPopup;
