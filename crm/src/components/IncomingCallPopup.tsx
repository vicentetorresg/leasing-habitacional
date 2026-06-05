import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone, PhoneOff, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface IncomingCall {
  id: string;
  lead_id: string | null;
  lead_name: string;
  lead_phone: string;
  twilio_call_sid: string | null;
  status: string;
  created_at: string;
}

/** Generates a phone ringing tone using Web Audio API */
function createRingtone(audioCtx: AudioContext): { start: () => void; stop: () => void } {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let osc1: OscillatorNode | null = null;
  let osc2: OscillatorNode | null = null;
  let gain: GainNode | null = null;

  const start = () => {
    gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);
    gain.gain.value = 0;

    let on = false;
    intervalId = setInterval(() => {
      on = !on;
      if (on) {
        osc1 = audioCtx.createOscillator();
        osc2 = audioCtx.createOscillator();
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        osc1.connect(gain!);
        osc2.connect(gain!);
        gain!.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc1.start();
        osc2.start();
      } else {
        gain!.gain.setValueAtTime(0, audioCtx.currentTime);
        osc1?.stop();
        osc2?.stop();
        osc1 = null;
        osc2 = null;
      }
    }, 1000);
  };

  const stop = () => {
    if (intervalId) clearInterval(intervalId);
    try { osc1?.stop(); } catch {}
    try { osc2?.stop(); } catch {}
    if (gain) gain.gain.value = 0;
  };

  return { start, stop };
}

export default function IncomingCallPopup({ userId }: { userId: string }) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  const stopRingtone = useCallback(() => {
    ringtoneRef.current?.stop();
    ringtoneRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const startRingtone = useCallback(() => {
    stopRingtone();
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const rt = createRingtone(ctx);
    ringtoneRef.current = rt;
    rt.start();
  }, [stopRingtone]);

  // Subscribe to incoming_calls via Realtime
  useEffect(() => {
    const channel = supabase
      .channel("incoming-calls-" + userId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "incoming_calls",
          filter: `ejecutiva_user_id=eq.${userId}`,
        },
        (payload) => {
          const call = payload.new as IncomingCall;
          if (call.status === "ringing") {
            setIncomingCall(call);
            startRingtone();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopRingtone();
    };
  }, [userId, startRingtone, stopRingtone]);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (!incomingCall) return;
    const timer = setTimeout(() => {
      dismiss("missed");
    }, 30000);
    return () => clearTimeout(timer);
  }, [incomingCall]);

  const dismiss = async (reason: "missed" | "dismissed" = "dismissed") => {
    stopRingtone();
    if (incomingCall) {
      await supabase
        .from("incoming_calls")
        .update({ status: reason })
        .eq("id", incomingCall.id);
    }
    setIncomingCall(null);
  };

  const answer = async () => {
    stopRingtone();
    if (incomingCall) {
      await supabase
        .from("incoming_calls")
        .update({ status: "answered" })
        .eq("id", incomingCall.id);
    }
    setIncomingCall(null);
  };

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -80, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[380px] max-w-[calc(100vw-2rem)]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-950/95 via-green-900/90 to-emerald-950/95 shadow-[0_8px_40px_rgba(34,197,94,0.35)] backdrop-blur-xl">
            {/* Pulsing ring indicator */}
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-green-500/10 animate-ping" />
            <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-green-500/20 animate-pulse" />

            <div className="relative p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 ring-2 ring-green-500/50">
                  <Phone className="h-6 w-6 text-green-400 animate-[ring_0.5s_ease-in-out_infinite_alternate]" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-green-400">
                    📞 Llamada entrante
                  </p>
                  <p className="text-lg font-bold text-white">
                    {incomingCall.lead_name}
                  </p>
                </div>
              </div>

              {/* Phone number */}
              <div className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
                <User className="h-4 w-4 text-green-400/70" />
                <span className="text-sm text-green-100/80 font-mono">
                  {incomingCall.lead_phone}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={answer}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 font-bold text-white shadow-lg shadow-green-500/30 transition hover:bg-green-400 hover:shadow-green-500/50 active:scale-95"
                >
                  <Phone className="h-5 w-5" />
                  Contestar
                </button>
                <button
                  onClick={() => dismiss("missed")}
                  className="flex items-center justify-center rounded-xl bg-red-500/20 px-4 py-3 text-red-300 transition hover:bg-red-500/40 active:scale-95"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
