import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CC_EMAILS = ['vicente.torres@llavepropia.cl', 'rodrigo.canas@llavepropia.cl', 'karina.valenzuela@llavepropia.cl'];

interface Lead {
  id: string;
  name: string;
  email: string | null;
  status: string;
  proyecto: string | null;
  scheduled_at: string | null;
  status_changed_at: string | null;
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0];
}

function buildEmail(lead: Lead): { subject: string; html: string } | null {
  if (!lead.email) return null;
  const firstName = getFirstName(lead.name);
  const proyecto = lead.proyecto || 'tu proyecto de interés';

  if (lead.status === 'asesoria_agendada') {
    return {
      subject: `${firstName}, tu asesoría está agendada 📅`,
      html: `<html lang="es">
        <body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
          <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:28px 32px;">
              <h1 style="color:white;margin:0;font-size:22px;">📅 Tu asesoría está confirmada</h1>
            </div>
            <div style="padding:28px 32px;color:#374151;">
              <p style="font-size:16px;line-height:1.6;">Hola <strong>${firstName}</strong>,</p>
              <p style="font-size:15px;line-height:1.6;">Te escribimos de <strong>Llave Propia</strong> para recordarte que tienes una asesoría agendada sobre <strong>${proyecto}</strong>.</p>
              <p style="font-size:15px;line-height:1.6;">Queremos asegurarnos de que no se te pase. Tu asesor está preparado para resolver todas tus dudas y guiarte en el proceso.</p>
              <div style="margin:24px 0;padding:16px;background:#eef2ff;border-radius:8px;border-left:4px solid #4f46e5;">
                <p style="margin:0;font-size:14px;color:#3730a3;font-weight:bold;">💡 ¿Qué preparar?</p>
                <ul style="margin:8px 0 0 0;padding-left:20px;color:#4338ca;font-size:13px;">
                  <li>Tu cédula de identidad</li>
                  <li>Últimas 3 liquidaciones de sueldo</li>
                  <li>Cualquier duda que tengas sobre el proyecto</li>
                </ul>
              </div>
              <p style="font-size:15px;line-height:1.6;">Si necesitas reagendar o tienes alguna consulta, no dudes en responder este correo.</p>
              <p style="font-size:15px;line-height:1.6;">¡Te esperamos! 🏠</p>
            </div>
            <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">— Equipo Llave Propia · llavepropia.cl</p>
            </div>
          </div>
        </body>
      </html>`,
    };
  }

  if (lead.status === 'asesoria_concretada') {
    return {
      subject: `${firstName}, ¿cómo te fue en tu asesoría? ✅`,
      html: `<html lang="es">
        <body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
          <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#059669,#10b981);padding:28px 32px;">
              <h1 style="color:white;margin:0;font-size:22px;">✅ Gracias por asistir a tu asesoría</h1>
            </div>
            <div style="padding:28px 32px;color:#374151;">
              <p style="font-size:16px;line-height:1.6;">Hola <strong>${firstName}</strong>,</p>
              <p style="font-size:15px;line-height:1.6;">Esperamos que tu asesoría sobre <strong>${proyecto}</strong> haya sido de gran ayuda. Nuestro equipo está comprometido en encontrar la mejor opción para ti.</p>
              <div style="margin:24px 0;padding:16px;background:#ecfdf5;border-radius:8px;border-left:4px solid #10b981;">
                <p style="margin:0;font-size:14px;color:#065f46;font-weight:bold;">🚀 Próximos pasos</p>
                <p style="margin:8px 0 0 0;color:#047857;font-size:13px;">Tu asesor preparará una propuesta personalizada basada en tu perfil. Te contactaremos pronto con los detalles.</p>
              </div>
              <p style="font-size:15px;line-height:1.6;">Si tienes alguna duda adicional o quieres avanzar más rápido, responde este correo y te ayudamos de inmediato.</p>
              <p style="font-size:15px;line-height:1.6;">¡Estamos para ayudarte a encontrar tu hogar! 🏡</p>
            </div>
            <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">— Equipo Llave Propia · llavepropia.cl</p>
            </div>
          </div>
        </body>
      </html>`,
    };
  }

  if (lead.status === 'recontactar') {
    return {
      subject: `${firstName}, seguimos disponibles para ti 🤝`,
      html: `<html lang="es">
        <body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
          <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:28px 32px;">
              <h1 style="color:white;margin:0;font-size:22px;">🤝 No hemos podido conectar contigo</h1>
            </div>
            <div style="padding:28px 32px;color:#374151;">
              <p style="font-size:16px;line-height:1.6;">Hola <strong>${firstName}</strong>,</p>
              <p style="font-size:15px;line-height:1.6;">Hemos intentado contactarte sobre <strong>${proyecto}</strong> pero no hemos podido comunicarnos. Queremos asegurarnos de que no pierdas esta oportunidad.</p>
              <div style="margin:24px 0;padding:16px;background:#fffbeb;border-radius:8px;border-left:4px solid #f59e0b;">
                <p style="margin:0;font-size:14px;color:#92400e;font-weight:bold;">⏰ Las unidades son limitadas</p>
                <p style="margin:8px 0 0 0;color:#78350f;font-size:13px;">Los proyectos inmobiliarios tienen stock limitado. Te recomendamos agendar tu asesoría lo antes posible para asegurar las mejores opciones.</p>
              </div>
              <p style="font-size:15px;line-height:1.6;">Solo responde este correo con tu disponibilidad y te agendamos una asesoría sin compromiso. ¡Es gratis!</p>
              <p style="font-size:15px;line-height:1.6;">Quedamos atentos 📞</p>
            </div>
            <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">— Equipo Llave Propia · llavepropia.cl</p>
            </div>
          </div>
        </body>
      </html>`,
    };
  }

  return null;
}

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
    const TARGET_STATUSES = ['asesoria_agendada', 'asesoria_concretada', 'recontactar'];

    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, name, email, status, proyecto, scheduled_at, status_changed_at')
      .eq('is_demo', false)
      .in('status', TARGET_STATUSES)
      .not('email', 'is', null);

    if (error) throw error;
    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No leads found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    let skipped = 0;
    let queued = 0;
    const errors: string[] = [];

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (const lead of leads) {
      const emailData = buildEmail(lead);
      if (!emailData) { skipped++; continue; }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Llave Propia <notificaciones@proppi.cl>',
          to: [lead.email],
          cc: CC_EMAILS,
          subject: emailData.subject,
          html: emailData.html,
        }),
      });

      if (res.ok) {
        sent++;
        console.log(`Email sent to ${lead.email} (${lead.status})`);
      } else if (res.status === 429 || res.status === 403) {
        // Daily limit hit — queue remaining
        console.log(`Resend limit hit. Queueing ${lead.email}`);
        await supabase.from('email_queue').insert({
          lead_id: lead.id,
          email_to: lead.email!,
          cc: CC_EMAILS,
          reply_to: [],
          subject: emailData.subject,
          html: emailData.html,
          status: 'pending',
          error_message: 'Daily limit — queued for next day',
        });
        queued++;
      } else {
        const errData = await res.json();
        console.error(`Failed to send to ${lead.email}:`, errData);
        errors.push(`${lead.email}: ${JSON.stringify(errData)}`);
      }

      // Respect Resend rate limit: max 2 req/s
      await delay(600);
    }

    return new Response(JSON.stringify({ success: true, sent, skipped, queued, total: leads.length, errors: errors.length > 0 ? errors : undefined }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
