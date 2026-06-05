import { useState } from 'react';
import type { Task } from '@/hooks/useTasks';

interface TaskListProps {
  tasks: Task[];
  onComplete: (taskId: string) => void;
  onReopen?: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  compact?: boolean;
}

const REMINDER_LABELS: Record<string, string> = {
  '0': 'A la hora',
  '10': '10 min antes',
  '30': '30 min antes',
};

export default function TaskList({ tasks, onComplete, onReopen, onDelete, compact }: TaskListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (tasks.length === 0) return null;

  const pending = tasks.filter(t => t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');

  const handleDelete = async (taskId: string) => {
    setDeletingId(taskId);
    try {
      await onDelete(taskId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {pending.map(task => (
        <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border border-border bg-card ${compact ? 'p-2' : ''} ${deletingId === task.id ? 'opacity-50 pointer-events-none' : ''}`}>
          <button
            onClick={() => onComplete(task.id)}
            className="mt-0.5 w-5 h-5 rounded border-2 border-primary hover:bg-primary transition-colors flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-primary/30 hover:text-white"
            title="Marcar como completada"
          >
            ✓
          </button>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{task.title}</p>
            {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] text-muted-foreground">
                📅 {new Date(task.due_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} {new Date(task.due_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {task.reminder_minutes !== null && (
                <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                  🔔 {REMINDER_LABELS[String(task.reminder_minutes)] || `${task.reminder_minutes} min`}
                </span>
              )}
              {task.lead_name && (
                <span className="text-[10px] text-muted-foreground">👤 {task.lead_name}</span>
              )}
            </div>
          </div>
          {deletingId === task.id ? (
            <span className="text-[10px] text-muted-foreground animate-pulse whitespace-nowrap">Eliminando…</span>
          ) : (
            <button
              onClick={() => handleDelete(task.id)}
              className="text-xs text-destructive hover:text-destructive/80 transition-colors"
              title="Eliminar"
            >
              🗑️
            </button>
          )}
        </div>
      ))}
      {completed.length > 0 && (
        <details className="text-xs">
          <summary className="text-muted-foreground cursor-pointer hover:text-foreground py-1">
            ✅ {completed.length} completada{completed.length > 1 ? 's' : ''}
          </summary>
          <div className="space-y-1 mt-1">
            {completed.map(task => (
              <div key={task.id} className={`flex items-center gap-2 p-2 rounded bg-muted/50 ${deletingId === task.id ? 'opacity-50' : 'opacity-60'}`}>
                <span className="text-xs">✅</span>
                <span className="text-xs line-through text-muted-foreground flex-1">{task.title}</span>
                {deletingId === task.id ? (
                  <span className="text-[10px] text-muted-foreground animate-pulse">Eliminando…</span>
                ) : (
                  <div className="flex items-center gap-1">
                    {onReopen && (
                      <button
                        onClick={() => onReopen(task.id)}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        title="Marcar como pendiente"
                      >
                        ↩
                      </button>
                    )}
                    <button onClick={() => handleDelete(task.id)} className="text-[10px] text-destructive">🗑️</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
