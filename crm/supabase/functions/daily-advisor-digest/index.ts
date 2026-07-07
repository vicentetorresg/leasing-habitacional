import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CC_EMAILS = ['vicente.torres@llavepropia.cl', 'rodrigo.canas@llavepropia.cl', 'karina.valenzuela@llavepropia.cl'];

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyBadge(days: number): string {
  if (days >= 14) return '<span style="background:#dc2626;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">🔴 CRÍTICO</span>';
  if (days >= 7) return '<span style="background:#f59e0b;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">🟠 URGENTE</span>';
  if (days >= 3) return '<span style="background:#3b82f6;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">🔵 PENDIENTE</span>';
  return '<span style="background:#6b7280;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">⚪ RECIENTE</span>';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Disabled: advisor digest emails turned off
  return new Response(JSON.stringify({ success: true, sent: 0, message: 'Disabled' }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

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
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'asesor');

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No asesores found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const STALE_STATUSES = ['asesoria_agendada', 'recontactar', 'asesoria_concretada', 'plan_presentado'];

    const STATUS_LABELS: Record<string, string> = {
      asesoria_agendada: '📅 Asesoría Agendada',
      recontactar: '🔄 Recontactar',
      asesoria_concretada: '✅ Asesoría Concretada',
      plan_presentado: '📋 Plan Presentado',
    };

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
      const advisorName = profileData?.full_name || userEmail;

      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, status, scheduled_at, status_changed_at, created_at')
        .eq('advisor_id', user_id)
        .eq('is_demo', false)
        .in('status', STALE_STATUSES);

      if (!leads || leads.length === 0) continue;

      // Sort by staleness (oldest first)
      leads.sort((a, b) => daysSince(b.status_changed_at || b.created_at) - daysSince(a.status_changed_at || a.created_at));

      // Count critical/urgent
      const criticalCount = leads.filter(l => daysSince(l.status_changed_at || l.created_at) >= 14).length;
      const urgentCount = leads.filter(l => {
        const d = daysSince(l.status_changed_at || l.created_at);
        return d >= 7 && d < 14;
      }).length;

      const leadRowsHtml = leads.map(l => {
        const days = daysSince(l.status_changed_at || l.created_at);
        return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:500;color:#111827;">${l.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${STATUS_LABELS[l.status] || l.status}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:bold;color:${days >= 14 ? '#dc2626' : days >= 7 ? '#f59e0b' : '#374151'};">${days} día${days !== 1 ? 's' : ''}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${urgencyBadge(days)}</td>
          </tr>`;
      }).join('');

      const alertBanner = criticalCount > 0
        ? `<div style="margin-bottom:20px;padding:16px;background:#fef2f2;border-radius:8px;border-left:4px solid #dc2626;">
            <p style="margin:0;color:#991b1b;font-size:16px;font-weight:bold;">🚨 ¡ATENCIÓN! Tienes ${criticalCount} cliente${criticalCount !== 1 ? 's' : ''} sin mover hace más de 2 semanas</p>
            <p style="margin:6px 0 0 0;color:#b91c1c;font-size:13px;">Estos clientes requieren acción INMEDIATA. Están en riesgo de perderse.</p>
          </div>`
        : urgentCount > 0
        ? `<div style="margin-bottom:20px;padding:16px;background:#fffbeb;border-radius:8px;border-left:4px solid #f59e0b;">
            <p style="margin:0;color:#92400e;font-size:16px;font-weight:bold;">⚠️ Tienes ${urgentCount} cliente${urgentCount !== 1 ? 's' : ''} sin mover hace más de 1 semana</p>
            <p style="margin:6px 0 0 0;color:#78350f;font-size:13px;">Revisa y actualiza su estado lo antes posible.</p>
          </div>`
        : '';

      const html = `<html lang="es">
        <body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
          <div style="max-width:650px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:28px 32px;">
              <h1 style="color:white;margin:0;font-size:22px;">⚠️ Alerta de Clientes Estancados</h1>
              <p style="color:rgba(255,255,255,0.9);margin:8px 0 0 0;font-size:15px;">Hola ${advisorName}, tienes <strong>${leads.length}</strong> cliente${leads.length !== 1 ? 's' : ''} sin avanzar</p>
            </div>
            <div style="padding:28px 32px;">
              ${alertBanner}
              <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#f3f4f6;">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Cliente</th>
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Estado</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Sin mover</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Urgencia</th>
                  </tr>
                </thead>
                <tbody>
                  ${leadRowsHtml}
                </tbody>
              </table>
              <div style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;">
                <p style="margin:0;color:#92400e;font-size:14px;font-weight:bold;">📌 Acción requerida</p>
                <p style="margin:6px 0 0 0;color:#78350f;font-size:13px;">Ingresa a Llave Propia CRM y actualiza el estado de cada cliente. Los clientes estancados afectan tus métricas y el cierre de negocios.</p>
              </div>
            </div>
            <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">— Llave Propia CRM · Este email se envía automáticamente cada día a las 10:00 AM</p>
            </div>
          </div>
        </body>
      </html>`;

      const subjectEmoji = criticalCount > 0 ? '🚨' : '⚠️';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Llave Propia CRM <notificaciones@llavepropia.cl>',
          to: [userEmail],
          cc: CC_EMAILS,
          subject: `${subjectEmoji} ${leads.length} cliente${leads.length !== 1 ? 's' : ''} estancado${leads.length !== 1 ? 's' : ''} – Acción requerida`,
          html,
        }),
      });

      if (res.ok) {
        sent++;
        console.log(`Advisor digest sent to ${userEmail} (${leads.length} leads)`);
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
