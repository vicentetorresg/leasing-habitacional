import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Task {
  id: string;
  lead_id: string | null;
  user_id: string;
  title: string;
  description: string | null;
  due_at: string;
  reminder_minutes: number | null;
  reminder_sent: boolean;
  status: string;
  created_at: string;
  completed_at: string | null;
  lead_name?: string;
}

export function useTasks(userId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('due_at', { ascending: true });
    if (data) {
      // Enrich with lead names
      const leadIds = [...new Set(data.filter(t => t.lead_id).map(t => t.lead_id!))];
      let leadMap = new Map<string, string>();
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name')
          .in('id', leadIds);
        if (leads) leadMap = new Map(leads.map(l => [l.id, l.name]));
      }
      setTasks(data.map(t => ({ ...t, lead_name: t.lead_id ? leadMap.get(t.lead_id) : undefined })) as Task[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (task: {
    lead_id?: string;
    user_id: string;
    title: string;
    description?: string;
    due_at: string;
    reminder_minutes?: number | null;
  }) => {
    const { data, error } = await supabase.from('tasks').insert({
      lead_id: task.lead_id || null,
      user_id: task.user_id,
      title: task.title,
      description: task.description || null,
      due_at: task.due_at,
      reminder_minutes: task.reminder_minutes ?? null,
    }).select().single();

    if (!error && data) {
      await fetchTasks();
      // Fire-and-forget email with lead info
      const dueDate = new Date(task.due_at);
      const reminderLabel = task.reminder_minutes === null ? 'Sin recordatorio' :
        task.reminder_minutes === 0 ? 'A la hora de la tarea' :
        `${task.reminder_minutes} minutos antes`;

      // Fetch lead info if linked
      let leadHtml = '';
      if (task.lead_id) {
        const { data: lead } = await supabase.from('leads').select('name, phone, email, rut, sueldo_liquido, en_dicom, source').eq('id', task.lead_id).single();
        if (lead) {
          leadHtml = `
            <div style="background: #eef6ff; padding: 12px; border-radius: 8px; margin: 8px 0 0 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 4px 0; font-weight: bold; color: #1e40af;">👤 Lead: ${lead.name}</p>
              <p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">📞 ${lead.phone}</p>
              ${lead.email ? `<p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">📧 ${lead.email}</p>` : ''}
              ${lead.rut ? `<p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">🪪 RUT: ${lead.rut}</p>` : ''}
              ${lead.sueldo_liquido != null ? `<p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">💰 Renta: $${lead.sueldo_liquido.toLocaleString('es-CL')}</p>` : ''}
              <p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">📋 DICOM: ${lead.en_dicom == null ? 'S/I' : lead.en_dicom ? 'Sí' : 'No'}</p>
              ${lead.source ? `<p style="color: #555; margin: 0; font-size: 13px;">📍 Origen: ${lead.source}</p>` : ''}
            </div>`;
        }
      }

      supabase.functions.invoke('send-task-email', {
        body: {
          user_id: task.user_id,
          subject: `✅ Tarea creada: ${task.title}`,
          html: `<html lang="es">
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">✅ Tarea Guardada</h2>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0; color: #111;">${task.title}</h3>
                ${task.description ? `<p style="color: #555; margin: 0 0 8px 0;">${task.description}</p>` : ''}
                <p style="color: #555; margin: 0 0 4px 0;">📅 ${dueDate.toLocaleString('es-CL')}</p>
                <p style="color: #555; margin: 0;">🔔 Recordatorio: ${reminderLabel}</p>
                ${leadHtml}
              </div>
              <p style="color: #aaa; font-size: 12px;">— Proppi CRM</p>
             </div>
            </html>`,
        },
      }).catch(err => console.error('Failed to send task confirmation email:', err));
    }
    return { error };
  };

  const completeTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', taskId);
    if (!error) await fetchTasks();
    return { error };
  };

  const reopenTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').update({
      status: 'pending',
      completed_at: null,
    }).eq('id', taskId);
    if (!error) await fetchTasks();
    return { error };
  };

  const deleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) {
      await fetchTasks();
      // Fire-and-forget deletion email
      if (taskToDelete) {
        const dueDate = new Date(taskToDelete.due_at);

        // Fetch lead info if linked
        let leadHtml = '';
        if (taskToDelete.lead_id) {
          const { data: lead } = await supabase.from('leads').select('name, phone, email, rut, sueldo_liquido, en_dicom, source').eq('id', taskToDelete.lead_id).single();
          if (lead) {
            leadHtml = `
              <div style="background: #eef6ff; padding: 12px; border-radius: 8px; margin: 8px 0 0 0; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 4px 0; font-weight: bold; color: #1e40af;">👤 Lead: ${lead.name}</p>
                <p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">📞 ${lead.phone}</p>
                ${lead.email ? `<p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">📧 ${lead.email}</p>` : ''}
                ${lead.rut ? `<p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">🪪 RUT: ${lead.rut}</p>` : ''}
                ${lead.sueldo_liquido != null ? `<p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">💰 Renta: $${lead.sueldo_liquido.toLocaleString('es-CL')}</p>` : ''}
                <p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">📋 DICOM: ${lead.en_dicom == null ? 'S/I' : lead.en_dicom ? 'Sí' : 'No'}</p>
                ${lead.source ? `<p style="color: #555; margin: 0; font-size: 13px;">📍 Origen: ${lead.source}</p>` : ''}
              </div>`;
          }
        }

        supabase.functions.invoke('send-task-email', {
          body: {
            user_id: taskToDelete.user_id,
            subject: `🗑️ Tarea eliminada: ${taskToDelete.title}`,
            html: `<html lang="es">
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #c0392b;">🗑️ Tarea Eliminada</h2>
                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <h3 style="margin: 0 0 8px 0; color: #111;">${taskToDelete.title}</h3>
                  ${taskToDelete.description ? `<p style="color: #555; margin: 0 0 8px 0;">${taskToDelete.description}</p>` : ''}
                  <p style="color: #555; margin: 0;">📅 Estaba programada para: ${dueDate.toLocaleString('es-CL')}</p>
                  ${leadHtml}
                </div>
                <p style="color: #aaa; font-size: 12px;">— Proppi CRM</p>
               </div>
              </html>`,
          },
        }).catch(err => console.error('Failed to send task deletion email:', err));
      }
    }
    return { error };
  };

  return { tasks, loading, fetchTasks, createTask, completeTask, reopenTask, deleteTask };
}
