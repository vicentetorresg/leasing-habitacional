import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface MissedCall {
  id: string;
  lead_id: string | null;
  lead_name: string;
  lead_phone: string;
  created_at: string;
}

interface MissedCallsBellProps {
  userId: string;
  onSelectLead: (leadId: string) => void;
}

export default function MissedCallsBell({ userId, onSelectLead }: MissedCallsBellProps) {
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const [open, setOpen] = useState(false);
  const [reminderCall, setReminderCall] = useState<MissedCall | null>(null);

  const fetchMissed = useCallback(async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("incoming_calls")
      .select("id, lead_id, lead_name, lead_phone, created_at")
      .eq("ejecutiva_user_id", userId)
      .eq("status", "missed")
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false });
    setMissedCalls(data ?? []);
  }, [userId]);

  useEffect(() => {
    fetchMissed();
    const channel = supabase
      .channel("missed-calls-bell-" + userId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "incoming_calls",
          filter: `ejecutiva_user_id=eq.${userId}`,
        },
        () => fetchMissed()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchMissed]);

  // Periodic reminder popup every 15 minutes if there are missed calls
  useEffect(() => {
    if (missedCalls.length === 0) {
      setReminderCall(null);
      return;
    }
    const interval = setInterval(() => {
      if (missedCalls.length > 0) {
        // Pick a random missed call to remind about
        const call = missedCalls[Math.floor(Math.random() * missedCalls.length)];
        setReminderCall(call);
      }
    }, 15 * 60 * 1000); // 15 min
    return () => clearInterval(interval);
  }, [missedCalls]);

  const handleClick = async (e: React.MouseEvent, call: MissedCall) => {
    e.stopPropagation();
    await supabase.from("incoming_calls").update({ status: "seen" }).eq("id", call.id);
    setOpen(false);
    if (call.lead_id) {
      onSelectLead(call.lead_id);
    }
    fetchMissed();
  };

  const markAsSeen = async (e: React.MouseEvent, callId: string) => {
    e.stopPropagation();
    await supabase.from("incoming_calls").update({ status: "seen" }).eq("id", callId);
    fetchMissed();
  };

  const clearAll = async () => {
    const ids = missedCalls.map(c => c.id);
    if (ids.length > 0) {
      await supabase.from("incoming_calls").update({ status: "seen" }).in("id", ids);
    }
    setOpen(false);
    fetchMissed();
  };

  const handleReminderCall = (call: MissedCall) => {
    setReminderCall(null);
    if (call.lead_id) {
      onSelectLead(call.lead_id);
    }
  };

  const handleReminderDismiss = async (call: MissedCall) => {
    setReminderCall(null);
    await supabase.from("incoming_calls").update({ status: "seen" }).eq("id", call.id);
    fetchMissed();
  };

  const hasMissed = missedCalls.length > 0;

  return (
    <>
      {/* Reminder popup */}
      <AnimatePresence>
        {reminderCall && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9998] w-[380px] max-w-[calc(100vw-2rem)]"
          >
            <div className="relative overflow-hidden rounded-2xl border border-destructive/30 bg-gradient-to-br from-destructive/95 via-destructive/90 to-destructive/85 shadow-[0_8px_40px_rgba(239,68,68,0.35)] backdrop-blur-xl">
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/5 animate-ping" />
              <div className="relative p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30">
                    <span className="text-2xl">📵</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                      Llamada perdida
                    </p>
                    <p className="text-lg font-bold text-white">
                      {reminderCall.lead_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
                  <Phone className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/80 font-mono">
                    {reminderCall.lead_phone}
                  </span>
                  <span className="ml-auto text-xs text-white/60">
                    {formatDistanceToNow(new Date(reminderCall.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReminderCall(reminderCall)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-destructive shadow-lg transition hover:bg-white/90 active:scale-95"
                  >
                    <Phone className="h-5 w-5" />
                    Llamar ahora
                  </button>
                  <button
                    onClick={() => handleReminderDismiss(reminderCall)}
                    className="flex items-center justify-center rounded-xl bg-white/15 px-4 py-3 text-white/80 transition hover:bg-white/25 active:scale-95"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bell button */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          title="Llamadas perdidas"
        >
          <motion.div
            animate={hasMissed ? {
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
            } : {}}
            transition={hasMissed ? {
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 2,
            } : {}}
          >
            <Bell className={`h-5 w-5 ${hasMissed ? 'text-destructive' : 'text-muted-foreground'}`} />
          </motion.div>
          {hasMissed && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold"
            >
              {missedCalls.length}
            </motion.span>
          )}
        </button>

        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-bold text-foreground">📞 Llamadas perdidas</span>
                  {hasMissed && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {!hasMissed ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Sin llamadas perdidas hoy
                    </div>
                  ) : (
                    missedCalls.map((call) => (
                      <div
                        key={call.id}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0 cursor-pointer group"
                        onClick={(e) => handleClick(e, call)}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 shrink-0">
                          <span className="text-base">📵</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {call.lead_name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {call.lead_phone}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(call.created_at), { addSuffix: true, locale: es })}
                          </span>
                          <button
                            onClick={(e) => markAsSeen(e, call.id)}
                            className="p-1 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                            title="Marcar como vista"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
