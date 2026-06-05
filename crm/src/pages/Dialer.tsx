import { useState, useEffect, useCallback } from 'react';
import { Phone, PhoneOff, Delete, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type CallPhase = 'dialing' | 'calling' | 'ended' | 'error';

const Dialer = () => {
  const { signOut, fullName } = useAuth();
  const [phone, setPhone] = useState('');
  const [phase, setPhase] = useState<CallPhase>('dialing');
  const [elapsed, setElapsed] = useState(0);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (phase !== 'calling') return;
    const iv = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    if (phase === 'calling' && elapsed >= 180) setPhase('ended');
  }, [phase, elapsed]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const formatPhone = (raw: string): string => {
    let p = raw.trim().replace(/[\s\-\(\)]/g, '');
    if (/^9\d{8}$/.test(p)) p = '+56' + p;
    else if (/^56\d{9}$/.test(p)) p = '+' + p;
    else if (!p.startsWith('+')) p = '+' + p;
    return p;
  };

  const addDigit = useCallback((d: string) => {
    setPhone(p => p + d);
    if (phase === 'error') setPhase('dialing');
  }, [phase]);

  const removeDigit = useCallback(() => {
    setPhone(p => p.slice(0, -1));
  }, []);

  const handleCall = useCallback(async () => {
    if (!phone.trim()) return;
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
      toast.success(data?.message || 'Llamada iniciada');
    } catch (err: any) {
      setPhase('error');
      setErrorMsg(err.message || 'Error al llamar');
      toast.error(err.message || 'Error al llamar');
    }
  }, [phone]);

  const handleHangup = useCallback(async () => {
    if (callSid) {
      try {
        await supabase.functions.invoke('call-hangup', { body: { call_sid: callSid } });
      } catch {}
    }
    setPhase('ended');
  }, [callSid]);

  const handleNewCall = () => {
    setPhone('');
    setPhase('dialing');
    setElapsed(0);
    setCallSid(null);
    setErrorMsg('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === 'calling') return;
      if (e.key === 'Backspace') { e.preventDefault(); removeDigit(); }
      else if (/^\d$/.test(e.key) || e.key === '+') addDigit(e.key);
      else if (e.key === 'Enter') handleCall();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, addDigit, removeDigit, handleCall]);

  const dialPad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['+', '0', '⌫'],
  ];

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col">
      {/* Grid bg */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="pointer-events-none fixed left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/8 blur-[120px]" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.4)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.09 12.26a1 1 0 0 0 .79 1.62h7.23l-1.1 7.91L20.1 11.7a1 1 0 0 0-.74-1.62h-7.07L13 2z"/></svg>
          </div>
          <span className="text-sm font-bold text-white">Lead<span className="text-orange-500">Flash</span></span>
        </div>
        <div className="flex items-center gap-4">
          {fullName && <span className="text-sm text-slate-400">{fullName}</span>}
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </div>

      {/* Main — centered dial pad */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-xs rounded-3xl border border-white/8 bg-white/3 backdrop-blur p-8 space-y-6">

          {/* Display */}
          <div className="text-center space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
              {phase === 'dialing' ? 'Marcador' :
               phase === 'calling' ? 'Llamando...' :
               phase === 'ended'   ? 'Finalizada' : 'Error'}
            </p>
            <div className="font-mono text-3xl font-bold text-white tracking-wider min-h-[44px] flex items-center justify-center">
              {phone || <span className="text-slate-600">Ingresa número</span>}
            </div>
            {phase === 'calling' && (
              <div className="font-mono text-lg text-slate-400 tabular-nums">{formatTime(elapsed)}</div>
            )}
            {phase === 'error' && (
              <p className="text-xs text-red-400 font-medium">{errorMsg}</p>
            )}
          </div>

          {/* Calling animation */}
          {phase === 'calling' && (
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-orange-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}

          {/* Dial pad */}
          {(phase === 'dialing' || phase === 'error') && (
            <div className="grid grid-cols-3 gap-3">
              {dialPad.flat().map((key) => (
                <button
                  key={key}
                  onClick={() => key === '⌫' ? removeDigit() : addDigit(key)}
                  className="h-14 rounded-full bg-white/5 hover:bg-white/10 text-white text-xl font-semibold transition-all active:scale-95 flex items-center justify-center border border-white/5"
                >
                  {key === '⌫' ? <Delete className="h-5 w-5" /> : key}
                </button>
              ))}
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-center">
            {(phase === 'dialing' || phase === 'error') && (
              <button
                onClick={handleCall}
                disabled={!phone.trim()}
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-400 disabled:bg-white/10 disabled:text-slate-600 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-green-500/30 disabled:shadow-none"
              >
                <Phone className="h-7 w-7" />
              </button>
            )}
            {phase === 'calling' && (
              <button
                onClick={handleHangup}
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-red-500/30 animate-pulse"
              >
                <PhoneOff className="h-7 w-7" />
              </button>
            )}
            {phase === 'ended' && (
              <button
                onClick={handleNewCall}
                className="h-16 w-16 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center transition-all active:scale-95"
              >
                <Phone className="h-7 w-7" />
              </button>
            )}
          </div>

          {/* Subtitle */}
          {phase === 'calling' && (
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              Recibirás una llamada a tu celular.<br />Al contestar, se conectará con el número marcado.
            </p>
          )}
          {phase === 'ended' && (
            <p className="text-xs text-slate-500 text-center">
              Llamada finalizada. Toca el teléfono verde para llamar de nuevo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dialer;
