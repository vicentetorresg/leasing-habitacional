import type { Lead } from '@/hooks/useLeads';
import type { DailyGoals } from '@/hooks/useSettings';

const DAY_NAMES: string[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function getTodayGoal(goals: DailyGoals): number {
  const dayName = DAY_NAMES[new Date().getDay()] as keyof DailyGoals;
  return goals[dayName] ?? 0;
}

interface DailyGoalsBarProps {
  todayLeads: Lead[];
  goalCalls: DailyGoals;
  goalScheduled: DailyGoals;
}

const DailyGoalsBar = ({ todayLeads, goalCalls, goalScheduled }: DailyGoalsBarProps) => {
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
    // Only count if the status changed today
    if (l.status_changed_at) {
      return new Date(l.status_changed_at) >= todayStart;
    }
    // Fallback: created today
    return new Date(l.created_at) >= todayStart;
  }).length;
  const callsPct = callGoal > 0 ? Math.min(100, Math.round((callsMade / callGoal) * 100)) : 0;
  const scheduledPct = scheduledGoal > 0 ? Math.min(100, Math.round((scheduledMade / scheduledGoal) * 100)) : 0;

  return (
    <div className="grid grid-cols-2 gap-2 px-4 py-1.5 border-b border-border bg-card/50">
      <GoalItem
        label="Llamados"
        current={callsMade}
        goal={callGoal}
        pct={callsPct}
        barColor={callsPct >= 100 ? 'bg-success' : 'bg-primary'}
      />
      <GoalItem
        label="Agendados"
        current={scheduledMade}
        goal={scheduledGoal}
        pct={scheduledPct}
        barColor={scheduledPct >= 100 ? 'bg-success' : 'bg-accent'}
      />
    </div>
  );
};

function GoalItem({ label, current, goal, pct, barColor }: {
  label: string;
  current: number;
  goal: number;
  pct: number;
  barColor: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-1">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-black font-mono text-foreground shrink-0">
        {current}/{goal}
      </span>
      <span className={`text-xs font-bold shrink-0 ${pct >= 100 ? 'text-success' : 'text-muted-foreground'}`}>
        {pct}%
      </span>
    </div>
  );
}

export default DailyGoalsBar;
