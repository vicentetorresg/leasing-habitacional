import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DailyGoals } from '@/hooks/useSettings';
import type { Lead } from '@/hooks/useLeads';

const DAY_NAMES: string[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function getTodayGoal(goals: DailyGoals): number {
  const dayName = DAY_NAMES[new Date().getDay()] as keyof DailyGoals;
  return goals[dayName] ?? 0;
}

interface UseDailyPerformanceTrackerOptions {
  userId: string | undefined;
  todayLeads: Lead[];
  goalCalls: DailyGoals;
  goalScheduled: DailyGoals;
}

/**
 * Periodically upserts the daily_performance row for the current user/day.
 * Runs every 60s and on lead changes.
 */
export function useDailyPerformanceTracker({
  userId,
  todayLeads,
  goalCalls,
  goalScheduled,
}: UseDailyPerformanceTrackerOptions) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = useCallback(async () => {
    if (!userId) return;

    const callGoal = getTodayGoal(goalCalls);
    const scheduledGoal = getTodayGoal(goalScheduled);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const callsMade = todayLeads.filter(l => {
      if (!l.last_attempt_at) return false;
      return new Date(l.last_attempt_at) >= todayStart;
    }).length;
    const scheduledMade = todayLeads.filter(l => {
      const isScheduled = l.status === 'scheduled' || l.status === 'asesoria_agendada';
      if (!isScheduled) return false;
      if (l.status_changed_at) {
        return new Date(l.status_changed_at) >= todayStart;
      }
      return new Date(l.created_at) >= todayStart;
    }).length;
    const callsPct = callGoal > 0 ? Math.min(100, Math.round((callsMade / callGoal) * 100)) : 0;
    const scheduledPct = scheduledGoal > 0 ? Math.min(100, Math.round((scheduledMade / scheduledGoal) * 100)) : 0;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const { error } = await supabase
      .from('daily_performance' as any)
      .upsert(
        {
          user_id: userId,
          date: today,
          calls_made: callsMade,
          calls_goal: callGoal,
          calls_pct: callsPct,
          scheduled_made: scheduledMade,
          scheduled_goal: scheduledGoal,
          scheduled_pct: scheduledPct,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      );

    if (error) {
      console.error('[DailyPerformance] Upsert error:', error);
    }
  }, [userId, todayLeads, goalCalls, goalScheduled]);

  // Sync on lead changes (debounced slightly)
  useEffect(() => {
    const t = setTimeout(sync, 2000);
    return () => clearTimeout(t);
  }, [sync]);

  // Also sync every 60 seconds
  useEffect(() => {
    timerRef.current = setInterval(sync, 60_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sync]);
}
