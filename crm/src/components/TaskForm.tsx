import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/hooks/useDemoMode';

interface TaskFormProps {
  leadId?: string;
  leadName?: string;
  userId: string;
  isAdmin?: boolean;
  onSubmit: (task: {
    lead_id?: string;
    user_id: string;
    title: string;
    description?: string;
    due_at: string;
    reminder_minutes?: number | null;
  }) => Promise<{ error: any }>;
  onCancel: () => void;
}

const DEMO_USERS = [
  { user_id: 'demo-javiera', full_name: 'Javiera Contreras' },
  { user_id: 'demo-martin', full_name: 'Martín Soto' },
  { user_id: 'demo-roberto', full_name: 'Roberto Méndez' },
];

export default function TaskForm({ leadId, leadName, userId, isAdmin, onSubmit, onCancel }: TaskFormProps) {
  const { isDemo } = useDemoMode();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [reminder, setReminder] = useState<string>('none');
  const [assignTo, setAssignTo] = useState(userId);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<{ user_id: string; full_name: string }[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    if (isDemo) {
      setUsers(DEMO_USERS);
      setAssignTo(userId);
      return;
    }
    let cancelled = false;
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name');
      if (data && !cancelled) setUsers(data as { user_id: string; full_name: string }[]);
    };
    fetchUsers();
    return () => { cancelled = true; };
  }, [isAdmin, isDemo, userId]);

  const handleSubmit = async () => {
    if (!title || !dueDate || !dueTime) return;
    setSubmitting(true);
    const dueAt = new Date(`${dueDate}T${dueTime}`).toISOString();
    const reminderMinutes = reminder === 'none' ? null : parseInt(reminder);
    const { error } = await onSubmit({
      lead_id: leadId,
      user_id: isDemo ? userId : assignTo,
      title,
      description: description || undefined,
      due_at: dueAt,
      reminder_minutes: reminderMinutes,
    });
    setSubmitting(false);
    if (!error) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setDueTime('');
      setReminder('none');
      onCancel(); // Close form after successful save
    }
  };

  return (
    <div className="space-y-3 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center gap-2">
        <span className="text-lg">📋</span>
        <h3 className="text-sm font-bold text-foreground">Nueva Tarea</h3>
        {leadName && <span className="text-xs text-muted-foreground">· {leadName}</span>}
      </div>
      <Input
        placeholder="Título de la tarea..."
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <Textarea
        placeholder="Descripción (opcional)..."
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
      />
      {isAdmin && users.length > 0 && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Asignar a</label>
          <Select value={assignTo} onValueChange={setAssignTo}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.user_id} value={u.user_id}>
                  {u.full_name} {u.user_id === userId ? '(yo)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="flex-1"
        />
        <Select value={dueTime} onValueChange={setDueTime}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Hora" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {Array.from({ length: 24 }, (_, h) => {
              const hh = String(h).padStart(2, '0');
              return [
                <SelectItem key={`${hh}:00`} value={`${hh}:00`}>{`${hh}:00`}</SelectItem>,
                <SelectItem key={`${hh}:30`} value={`${hh}:30`}>{`${hh}:30`}</SelectItem>,
              ];
            }).flat()}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Recordatorio por email</label>
        <Select value={reminder} onValueChange={setReminder}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin recordatorio</SelectItem>
            <SelectItem value="30">30 minutos antes</SelectItem>
            <SelectItem value="10">10 minutos antes</SelectItem>
            <SelectItem value="0">A la hora de la tarea</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={handleSubmit} disabled={!title || !dueDate || !dueTime || submitting}>
          {submitting ? 'Guardando...' : 'Guardar Tarea'}
        </Button>
      </div>
    </div>
  );
}
