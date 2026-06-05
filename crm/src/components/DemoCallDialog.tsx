import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DemoCallDialogProps {
  open: boolean;
  onClose: () => void;
  phone?: string;
}

type CallPhase = 'connecting' | 'ringing' | 'connected' | 'ended';

export default function DemoCallDialog({ open, onClose, phone }: DemoCallDialogProps) {
  const [phase, setPhase] = useState<CallPhase>('connecting');
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Phase progression
  useEffect(() => {
    if (!open) return;
    setPhase('connecting');
    setSeconds(0);

    const t1 = setTimeout(() => setPhase('ringing'), 2000);
    const t2 = setTimeout(() => setPhase('connected'), 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open]);

  // Timer when connected
  useEffect(() => {
    if (phase === 'connected') {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleHangUp = () => {
    setPhase('ended');
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => onClose(), 1200);
  };

  const phaseConfig = {
    connecting: {
      icon: '📡',
      label: 'Conectando...',
      sublabel: 'Estableciendo conexión con el servidor de telefonía',
      color: 'text-yellow-400',
      pulse: true,
    },
    ringing: {
      icon: '📞',
      label: 'Sonando...',
      sublabel: `Llamando a ${phone || 'Lead'}`,
      color: 'text-blue-400',
      pulse: true,
    },
    connected: {
      icon: '🟢',
      label: 'Conectado',
      sublabel: `En llamada con ${phone || 'Lead'}`,
      color: 'text-green-400',
      pulse: false,
    },
    ended: {
      icon: '📴',
      label: 'Llamada finalizada',
      sublabel: `Duración: ${formatTimer(seconds)}`,
      color: 'text-muted-foreground',
      pulse: false,
    },
  };

  const current = phaseConfig[phase];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { handleHangUp(); } }}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden border-0 [&>button]:hidden">
        {/* Call header */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 text-center space-y-5">
          {/* Avatar */}
          <div className={`mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center text-4xl ${current.pulse ? 'animate-pulse' : ''}`}>
            {current.icon}
          </div>

          {/* Status */}
          <div>
            <p className={`text-lg font-bold ${current.color}`}>{current.label}</p>
            <p className="text-sm text-muted-foreground mt-1">{current.sublabel}</p>
          </div>

          {/* Timer */}
          {(phase === 'connected' || phase === 'ended') && (
            <p className="text-3xl font-mono font-black text-foreground">{formatTimer(seconds)}</p>
          )}

          {/* Hang up button */}
          {phase !== 'ended' && (
            <Button
              onClick={handleHangUp}
              className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 text-white text-2xl p-0 mx-auto"
            >
              📞
            </Button>
          )}

          {/* Production info */}
          <div className="bg-zinc-800/60 rounded-xl p-4 text-left text-xs text-muted-foreground leading-relaxed mt-4">
          <p className="font-bold text-zinc-200 text-sm mb-2">🇨🇱 En producción:</p>
            <p>
              La ejecutiva recibe la llamada en su celular a través de <span className="font-bold text-emerald-400">Twilio</span>. 
              Al contestar, se conecta automáticamente con el lead mediante <span className="font-bold text-emerald-400">call bridging</span>. 
              Todo queda registrado en el sistema.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Integración con número virtual +56 lista</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
