import { useState, useEffect, useCallback } from 'react';
import { Phone, PhoneOff, Delete, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ManualCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

type CallPhase = 'dialing' | 'calling' | 'connected' | 'ended' | 'error';

export default function ManualCallDialog({ open, onOpenChange, userId }: ManualCallDialogProps) {
  const [phone, setPhone] = useState('');
  const [phase, setPhase] = useState<CallPhase>('dialing');
  const [elapsed, setElapsed] = useState(0);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset on open
  useEffect(() => {
    if (open) {
      setPhone('');
      setPhase('dialing');
      setElapsed(0);
      setCallSid(null);
      setErrorMsg('');
    }
  }, [open]);

  // Timer when calling/connected
  useEffect(() => {
    if (phase !== 'calling' && phase !== 'connected') return;
    const iv = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // Auto-timeout: if stuck in "calling" for 3 min, auto-end
  useEffect(() => {
    if (phase === 'calling' && elapsed >= 180) {
      setPhase('ended');
      toast.info('Llamada finalizada por tiempo');
    }
  }, [phase, elapsed]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const formatPhone = (raw: string): string => {
    let p = raw.trim().replace(/[\s\-\(\)]/g, '');
    if (/^9\d{8}$/.test(p)) p = '+56' + p;
    else if (/^56\d{9}$/.test(p)) p = '+' + p;
    else if (!p.startsWith('+')) p = '+' + p;
    return p;
  };

  const displayPhone = (raw: string): string => {
    if (!raw) return '';
    const m = raw.match(/^(\+?\d{0,3})(\d{0,4})(\d{0,4})$/);
    if (m) return [m[1], m[2], m[3]].filter(Boolean).join(' ');
    return raw;
  };

  const addDigit = (d: string) => {
    if (phase !== 'dialing') return;
    setPhone(p => p + d);
  };

  const removeDigit = () => {
    if (phase !== 'dialing') return;
    setPhone(p => p.slice(0, -1));
  };

  const handleCall = useCallback(async () => {
    if (!phone.trim() || phase !== 'dialing') return;
    setPhase('calling');
    setElapsed(0);
    setErrorMsg('');
    try {
      const formatted = formatPhone(phone);
      const { data, error } = await supabase.functions.invoke('call-manual', {
        body: { phone: formatted },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCallSid(data?.call_sid || null);
      // Stay in 'calling' — user sees the phone UI
      toast.success(data?.message || 'Llamada iniciada');
    } catch (err: any) {
      setPhase('error');
      setErrorMsg(err.message || 'Error al llamar');
      toast.error(err.message || 'Error al llamar');
    }
  }, [phone, phase]);

  const handleHangup = useCallback(async () => {
    // If we have a call SID, try to hang up via Twilio
    if (callSid) {
      try {
        await supabase.functions.invoke('call-hangup', {
          body: { call_sid: callSid },
        });
      } catch {
        // ignore hangup errors
      }
    }
    setPhase('ended');
  }, [callSid]);

  const handleClose = useCallback(() => {
    if (phase === 'calling') {
      handleHangup();
    }
    onOpenChange(false);
  }, [phase, handleHangup, onOpenChange]);

  // Keyboard input when dialing
  useEffect(() => {
    if (!open || (phase !== 'dialing' && phase !== 'error')) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        removeDigit();
      } else if (/^\d$/.test(e.key) || e.key === '+') {
        if (phase === 'error') setPhase('dialing');
        addDigit(e.key);
      } else if (e.key === 'Enter') {
        handleCall();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, phase, addDigit, removeDigit, handleCall]);

  const dialPad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['+', '0', '⌫'],
  ];

  const phaseConfig = {
    dialing: { bg: 'from-background to-background', statusText: '' },
    calling: { bg: 'from-primary/5 to-primary/10', statusText: 'Llamando...' },
    connected: { bg: 'from-green-500/5 to-green-500/10', statusText: 'Conectado' },
    ended: { bg: 'from-muted to-muted', statusText: 'Finalizada' },
    error: { bg: 'from-destructive/5 to-destructive/10', statusText: 'Error' },
  };

  const cfg = phaseConfig[phase];

  return (
    <Dialog open={open} onOpenChange={(newOpen) => { if (!newOpen) handleClose(); }}>
      <DialogContent
        className="sm:max-w-[340px] p-0 overflow-hidden border-2 border-border/50 rounded-3xl"
        onPointerDownOutside={e => phase === 'calling' && e.preventDefault()}
        onEscapeKeyDown={e => phase === 'calling' && e.preventDefault()}
      >

        <div className={`bg-gradient-to-b ${cfg.bg} flex flex-col items-center`}>
          {/* Phone display */}
          <div className="pt-10 pb-4 px-6 text-center w-full">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
              {phase === 'dialing' ? 'Llamada manual' : cfg.statusText}
            </p>
            <div className="font-mono text-3xl font-bold text-foreground tracking-wider min-h-[44px] flex items-center justify-center">
              {phone ? displayPhone(phone) : <span className="text-muted-foreground/50">Ingresa número</span>}
            </div>
            {/* Timer */}
            {(phase === 'calling' || phase === 'connected') && (
              <div className="mt-2 font-mono text-lg text-muted-foreground tabular-nums">
                {formatTime(elapsed)}
              </div>
            )}
            {phase === 'error' && (
              <p className="mt-2 text-xs text-destructive font-medium">{errorMsg}</p>
            )}
          </div>

          {/* Calling animation */}
          {phase === 'calling' && (
            <div className="flex justify-center gap-1.5 pb-3">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}

          {/* Dial pad — only in dialing/error phase */}
          {(phase === 'dialing' || phase === 'error') && (
            <div className="grid grid-cols-3 gap-3 px-8 pb-4 w-full">
              {dialPad.map((row, ri) =>
                row.map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key === '⌫') removeDigit();
                      else { if (phase === 'error') setPhase('dialing'); addDigit(key); }
                    }}
                    className="h-14 w-full rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-xl font-semibold transition-all active:scale-95 flex items-center justify-center"
                  >
                    {key === '⌫' ? <Delete className="h-5 w-5" /> : key}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="pb-8 pt-2 flex justify-center gap-6">
            {(phase === 'dialing' || phase === 'error') && (
              <button
                onClick={handleCall}
                disabled={!phone.trim()}
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 disabled:bg-muted disabled:text-muted-foreground text-white flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-green-500/30 disabled:shadow-none"
              >
                <Phone className="h-7 w-7" />
              </button>
            )}
            {(phase === 'calling' || phase === 'connected') && (
              <button
                onClick={handleHangup}
                className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-destructive/30 animate-pulse"
              >
                <PhoneOff className="h-7 w-7" />
              </button>
            )}
            {phase === 'ended' && (
              <button
                onClick={handleClose}
                className="h-16 w-16 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-all active:scale-95"
              >
                <X className="h-7 w-7" />
              </button>
            )}
          </div>

          {/* Subtitle */}
          {phase === 'calling' && (
            <p className="text-xs text-muted-foreground text-center px-6 pb-4">
              Recibirás una llamada a tu celular. Al contestar, se conectará con el número marcado.
            </p>
          )}
          {phase === 'ended' && (
            <p className="text-xs text-muted-foreground text-center px-6 pb-4">
              Llamada finalizada
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
