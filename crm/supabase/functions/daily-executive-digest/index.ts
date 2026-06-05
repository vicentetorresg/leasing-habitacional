import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CC_EMAIL = 'vicente.torres@proppi.cl';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get all ejecutivas
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'ejecutiva');

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No ejecutivas found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Statuses that represent "not re-called" — leads that need follow-up
    const RECYCLE_STATUSES = ['first_call', 'second_call', 'new'];

    let sent = 0;
    for (const { user_id } of roleData) {
      const { data: userData } = await supabase.auth.admin.getUserById(user_id);
      const userEmail = userData?.user?.email;
      if (!userEmail) continue;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user_id)
        .single();
      const executiveName = profileData?.full_name || userEmail;

      // Leads assigned to this ejecutiva that need re-calling
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, status, last_attempt_at, created_at, phone')
        .eq('assigned_to', user_id)
        .eq('is_demo', false)
        .in('status', RECYCLE_STATUSES);

      if (!leads || leads.length === 0) continue;

      const STATUS_LABELS: Record<string, string> = {
        new: '🆕 Nuevo (sin llamar)',
        first_call: '📞 Primer llamado (sin respuesta)',
        second_call: '📞 Segundo llamado (sin respuesta)',
      };

      // Group by status
      const byStatus: Record<string, typeof leads> = {};
      for (const lead of leads) {
        if (!byStatus[lead.status]) byStatus[lead.status] = [];
        byStatus[lead.status].push(lead);
      }

      const rowsHtml = Object.entries(byStatus).map(([status, statusLeads]) => `
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">
            ${STATUS_LABELS[status] || status}
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 20px; font-weight: bold; color: #ef4444;">
            ${statusLeads.length}
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">
            ${statusLeads.slice(0, 3).map(l => l.name).join(', ')}${statusLeads.length > 3 ? ` y ${statusLeads.length - 3} más...` : ''}
          </td>
        </tr>
      `).join('');

      const html = `<html lang="es">
        <body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 28px 32px;">
              <h1 style="color: white; margin: 0; font-size: 22px;">👋 Buenos días, ${executiveName}</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 15px;">Leads sin rellamar que necesitan atención</p>
            </div>
            <div style="padding: 28px 32px;">
              <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0;">
                Tienes <strong style="color: #ef4444; font-size: 18px;">${leads.length} lead${leads.length !== 1 ? 's' : ''}</strong> sin haber vuelto a llamar. ¡Favor reciclar! 🔁
              </p>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px 14px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Estado</th>
                    <th style="padding: 10px 14px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Cantidad</th>
                    <th style="padding: 10px 14px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Leads</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
              <div style="margin-top: 24px; padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: bold;">🔁 ¡Recicla estos leads!</p>
                <p style="margin: 6px 0 0 0; color: #78350f; font-size: 13px;">Ingresa a Proppi CRM y retoma el contacto con estos leads. Cada intento cuenta para agendar más asesorías.</p>
              </div>
            </div>
            <div style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">— Proppi CRM · Este email se envía automáticamente cada día a las 9:00 AM</p>
            </div>
          </div>
        </body>
      </html>`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Proppi CRM <notificaciones@proppi.cl>',
          to: [userEmail],
          cc: [CC_EMAIL],
          subject: `🔁 Tienes ${leads.length} lead${leads.length !== 1 ? 's' : ''} sin rellamar – ¡Recicla! – Proppi CRM`,
          html,
        }),
      });

      if (res.ok) {
        sent++;
        console.log(`Executive digest sent to ${userEmail} (${leads.length} leads)`);
      } else {
        const errData = await res.json();
        console.error(`Failed to send to ${userEmail}:`, errData);
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
