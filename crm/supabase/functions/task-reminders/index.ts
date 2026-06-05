import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const now = new Date();

    // Find tasks with reminders that haven't been sent yet
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .eq('reminder_sent', false)
      .not('reminder_minutes', 'is', null);

    if (error) {
      console.error('Error fetching tasks:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    for (const task of tasks || []) {
      const dueAt = new Date(task.due_at);
      const reminderTime = new Date(dueAt.getTime() - (task.reminder_minutes || 0) * 60 * 1000);

      if (now >= reminderTime) {
        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(task.user_id);
        const userEmail = userData?.user?.email;
        if (!userEmail) continue;

        // Demo mode: redirect emails to fixed demo recipients
        const DEMO_EMAIL = 'demo@demo.cl';
        const DEMO_RECIPIENTS = ['diego.sanchez@proppi.cl', 'vicente.torres@proppi.cl'];
        const isDemo = userEmail === DEMO_EMAIL;
        const finalRecipients = isDemo ? DEMO_RECIPIENTS : [userEmail];

        // Get lead info if linked
        let leadName = '';
        let leadHtml = '';
        if (task.lead_id) {
          const { data: lead } = await supabase.from('leads').select('name, phone, email, rut, sueldo_liquido, en_dicom, source').eq('id', task.lead_id).single();
          if (lead) {
            leadName = lead.name || '';
            leadHtml = `
              <div style="background: #eef6ff; padding: 12px; border-radius: 8px; margin: 8px 0 0 0; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 4px 0; font-weight: bold; color: #1e40af;">👤 Lead: ${lead.name}</p>
                <p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">📞 ${lead.phone}</p>
                ${lead.email ? `<p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">📧 ${lead.email}</p>` : ''}
                ${lead.rut ? `<p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">🪪 RUT: ${lead.rut}</p>` : ''}
                ${lead.sueldo_liquido != null ? `<p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">💰 Renta: $${Number(lead.sueldo_liquido).toLocaleString('es-CL')}</p>` : ''}
                <p style="color: #555; margin: 0 0 2px 0; font-size: 13px;">📋 DICOM: ${lead.en_dicom == null ? 'S/I' : lead.en_dicom ? 'Sí' : 'No'}</p>
                ${lead.source ? `<p style="color: #555; margin: 0; font-size: 13px;">📍 Origen: ${lead.source}</p>` : ''}
              </div>`;
          }
        }

        const reminderLabel = task.reminder_minutes === 0 ? '¡Es hora!' :
          task.reminder_minutes === 10 ? 'en 10 minutos' : 'en 30 minutos';

        const html = `<html lang="es">
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">🔔 Recordatorio de Tarea</h2>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3 style="margin: 0 0 8px 0; color: #111;">${task.title}</h3>
              ${task.description ? `<p style="color: #555; margin: 0 0 8px 0;">${task.description}</p>` : ''}
              <p style="color: #555; margin: 0;">📅 ${dueAt.toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</p>
              ${leadHtml}
            </div>
            <p style="color: #888; font-size: 14px;">Tu tarea comienza ${reminderLabel}.</p>
            <p style="color: #aaa; font-size: 12px;">— Proppi CRM</p>
          </div>
        </html>`;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Proppi CRM <notificaciones@proppi.cl>',
            to: finalRecipients,
            subject: isDemo ? `[DEMO] 🔔 Recordatorio: ${task.title}` : `🔔 Recordatorio: ${task.title}`,
            html,
          }),
        });

        if (res.ok) {
          await supabase.from('tasks').update({ reminder_sent: true }).eq('id', task.id);
          sent++;
          console.log(`Reminder sent for task ${task.id} to ${userEmail}`);
        } else {
          const errData = await res.json();
          console.error(`Failed to send reminder for task ${task.id}:`, errData);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
