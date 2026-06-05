import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIdleTimerOptions {
  enabled: boolean;
  hasPendingLeads: boolean;
  reminderIntervalSeconds: number;
  playReminderNudge: () => void;
  urgentThresholdSeconds?: number;
  onUrgentIdle?: () => void;
}

/**
 * Tracks seconds since last action and plays a periodic reminder nudge.
 * Fires onUrgentIdle callback once when idle exceeds urgentThresholdSeconds.
 */
export function useIdleTimer({
  enabled,
  hasPendingLeads,
  reminderIntervalSeconds,
  playReminderNudge,
  urgentThresholdSeconds = 120,
  onUrgentIdle,
}: UseIdleTimerOptions) {
  const [idleSeconds, setIdleSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nudgeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urgentFiredRef = useRef(false);

  // Use refs for callbacks to avoid resetting timers when callbacks change identity
  const playReminderNudgeRef = useRef(playReminderNudge);
  playReminderNudgeRef.current = playReminderNudge;
  const onUrgentIdleRef = useRef(onUrgentIdle);
  onUrgentIdleRef.current = onUrgentIdle;

  const clearTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (nudgeRef.current) clearInterval(nudgeRef.current);
    intervalRef.current = null;
    nudgeRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setIdleSeconds(0);
    urgentFiredRef.current = false;
    clearTimers();

    if (!enabled || !hasPendingLeads) return;

    // Tick every second for the visible counter
    intervalRef.current = setInterval(() => {
      setIdleSeconds(prev => {
        const next = prev + 1;
        // Fire urgent callback once at threshold
        if (next === urgentThresholdSeconds && !urgentFiredRef.current) {
          urgentFiredRef.current = true;
          onUrgentIdleRef.current?.();
        }
        return next;
      });
    }, 1000);

    // Periodic reminder nudge
    if (reminderIntervalSeconds > 0) {
      nudgeRef.current = setInterval(() => {
        playReminderNudgeRef.current();
      }, reminderIntervalSeconds * 1000);
    }
  }, [enabled, hasPendingLeads, reminderIntervalSeconds, clearTimers, urgentThresholdSeconds]);

  useEffect(() => {
    reset();
    return clearTimers;
  }, [reset, clearTimers]);

  return { idleSeconds, resetIdleTimer: reset };
}
