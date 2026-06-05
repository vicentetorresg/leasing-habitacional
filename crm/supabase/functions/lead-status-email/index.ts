import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FROM      = 'Proppi <notificaciones@proppi.cl>';
const CC_ADMIN  = 'vicente.torres@proppi.cl';
const REPLY_TO  = 'vicente.torres@proppi.cl';

const ASESOR_PIPELINE = ['asesoria_agendada', 'recontactar', 'plan_presentado'];
const EMAIL_STATUSES  = ['new', 'asesoria_agendada', 'recontactar', 'plan_presentado', 'no_contesto_manual', 'asesoria_agendada_manual'];

async function sendEmailViaAppsScript(payload: {
  from: string;
  to: string[];
  cc?: string[];
  reply_to?: string[];
  subject: string;
  html: string;
}) {
  const appsScriptUrl = Deno.env.get('APPS_SCRIPT_EMAIL_URL');
  const appsScriptToken = Deno.env.get('APPS_SCRIPT_EMAIL_TOKEN');

  if (!appsScriptUrl) {
    throw new Error('APPS_SCRIPT_EMAIL_URL not set');
  }

  const response = await fetch(appsScriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      token: appsScriptToken || undefined,
    }),
  });

  const rawBody = await response.text();
  let data: any = null;

  try {
    data = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    data = { raw: rawBody };
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Apps Script send failed (${response.status})`);
  }

  return data;
}

// ─── BASE TEMPLATE ───────────────────────────────────────────────────────────

function baseTemplate({
  firstName,
  headerEmoji,
  headerTitle,
  headerSubtitle,
  bodyHtml,
}: {
  firstName: string;
  headerEmoji: string;
  headerTitle: string;
  headerSubtitle: string;
  bodyHtml: string;
}): string {
  const headerEmojiHtml = headerEmoji
    ? `<td align="right" style="vertical-align:middle;">
                    <div style="font-size:44px;line-height:1;">${headerEmoji}</div>
                  </td>`
    : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headerTitle}</title>
</head>
<body style="margin:0;padding:0;background:#EFF8FF;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EFF8FF;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(14,165,233,0.13);">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#38BDF8 0%,#0A6FBF 100%);padding:36px 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1;">PROPPI</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.65);letter-spacing:2px;text-transform:uppercase;margin-top:3px;">Inversión Inmobiliaria</div>
                  </td>
                  ${headerEmojiHtml}
                </tr>
              </table>
              <div style="margin-top:28px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.25);">
                <div style="font-size:26px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.3px;">${headerTitle}</div>
                <div style="font-size:15px;color:rgba(255,255,255,0.85);margin-top:8px;line-height:1.55;">${headerSubtitle}</div>
              </div>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="padding:36px 40px 28px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #DBEAFE;background:#F0F9FF;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size:12px;color:#64748B;line-height:1.6;">
                      Este mensaje fue enviado a ${firstName} desde <strong style="color:#0369A1;">Proppi CRM</strong>.<br/>
                      <a href="https://proppi.cl" style="color:#0EA5E9;text-decoration:none;">proppi.cl</a> &nbsp;·&nbsp; notificaciones@proppi.cl
                    </div>
                  </td>
                  <td align="right" style="vertical-align:bottom;">
                    <div style="font-size:20px;font-weight:900;color:#BFDBFE;letter-spacing:-0.5px;">PROPPI</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────

function infoBox(icon: string, title: string, content: string): string {
  const iconHtml = icon
    ? `<td style="vertical-align:top;width:36px;">
              <div style="font-size:24px;line-height:1;">${icon}</div>
            </td>`
    : '';
  const paddingLeft = icon ? '12px' : '0';
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="background:#EFF8FF;border:1px solid #BAE6FD;border-radius:12px;padding:18px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${iconHtml}
            <td style="vertical-align:top;padding-left:${paddingLeft};">
              <div style="font-size:13px;font-weight:700;color:#0369A1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${title}</div>
              <div style="font-size:14px;color:#0C4A6E;line-height:1.55;">${content}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function stepsList(steps: { num: string; text: string }[]): string {
  const rows = steps.map(s => `
    <tr>
      <td style="padding:10px 0;vertical-align:top;border-bottom:1px solid #E0F2FE;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:top;width:30px;">
              <div style="width:24px;height:24px;border-radius:50%;background:#0EA5E9;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">${s.num}</div>
            </td>
            <td style="vertical-align:top;padding-left:12px;">
              <div style="font-size:14px;color:#1E3A5F;line-height:1.55;padding-top:2px;">${s.text}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">${rows}</table>`;
}

function ctaButton(text: string, url = 'https://proppi.cl'): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
    <tr>
      <td align="center">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#0EA5E9,#0A6FBF);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;box-shadow:0 4px 16px rgba(14,165,233,0.35);">${text}</a>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<div style="height:1px;background:#DBEAFE;margin:24px 0;"></div>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#1E3A5F;line-height:1.65;">${text}</p>`;
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

function emailBienvenida(firstName: string) {
  const body = `
    ${p(`Hola <strong>${firstName}</strong>,`)}
    ${p('Gracias por tu interés. Nos alegra que estés considerando invertir en bienes raíces, y queremos acompañarte en cada paso del camino.')}
    ${infoBox('', '¿Qué es Proppi?', 'Somos una empresa especializada en inversión inmobiliaria en Chile. Te ayudamos a encontrar la propiedad ideal según tu perfil financiero, con asesoría personalizada y sin costo para ti.')}
    ${divider()}
    <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:4px;">¿Qué pasa ahora?</div>
    ${stepsList([
      { num: '1', text: 'En los próximos minutos uno de nuestros ejecutivos te llamará para conocer tu situación.' },
      { num: '2', text: 'Si calzas con nuestros proyectos, agendaremos una asesoría gratuita con un especialista.' },
      { num: '3', text: 'Diseñaremos un plan de inversión a la medida de tu perfil y tus metas.' },
    ])}
    ${divider()}
    ${p('Si tienes preguntas mientras tanto, puedes visitar nuestra web o respondernos directamente a este correo.')}
    ${ctaButton('Conoce más en proppi.cl')}
  `;
  return {
    subject: `Bienvenido/a a Proppi, ${firstName}`,
    html: baseTemplate({
      firstName,
      headerEmoji: '',
      headerTitle: `Bienvenido/a, ${firstName}`,
      headerSubtitle: 'Tu camino a la inversión inmobiliaria comienza aquí',
      bodyHtml: body,
    }),
  };
}

function emailAsesoriaAgendada(firstName: string, asesorName?: string | null) {
  const body = `
    ${p(`¡Hola <strong>${firstName}</strong>!`)}
    ${p('Nos alegra confirmarte que tu asesoría con Proppi está agendada. Estás un paso más cerca de hacer realidad tu inversión.')}
    ${infoBox('', 'Link de la reunión', 'Revisa tu bandeja de entrada — te llegó una invitación de Google Calendar con el enlace de Google Meet para conectarte el día y hora acordados.')}
    ${divider()}
    <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:12px;">¿Qué veremos en la asesoría?</div>
    ${stepsList([
      { num: '1', text: '<strong>Tu perfil financiero</strong> — entenderemos tu situación actual y tus objetivos.' },
      { num: '2', text: '<strong>Las opciones disponibles</strong> — te mostraremos proyectos que se adaptan a ti.' },
      { num: '3', text: '<strong>El plan de financiamiento</strong> — cómo estructurar la inversión de forma inteligente.' },
    ])}
    ${infoBox('', 'Tip para tu asesoría', 'Tener a mano tu última liquidación de sueldo puede agilizar mucho la conversación. No es obligatorio, pero ayuda a personalizar mejor tu plan.')}
    ${p('Si necesitas reprogramar, no dudes en responder este correo o contactar directamente a tu asesor.')}
  `;
  return {
    subject: `Tu asesoría con Proppi está confirmada`,
    html: baseTemplate({
      firstName,
      headerEmoji: '',
      headerTitle: 'Tu asesoría está confirmada',
      headerSubtitle: 'Un experto en inversión inmobiliaria te atenderá pronto',
      bodyHtml: body,
    }),
  };
}

function emailRecontactar(firstName: string, asesorName?: string | null) {
  const firmante = asesorName ?? 'El equipo Proppi';
  const body = `
    ${p(`Hola <strong>${firstName}</strong>,`)}
    ${p('Intentamos contactarte pero no pudimos comunicarnos. Queremos asegurarnos de que tengas toda la información sobre las oportunidades de inversión que tenemos para ti.')}
    ${infoBox('', 'Intentamos llamarte', 'Tu perfil sigue activo en nuestro sistema y tu cupo de asesoría está reservado. No pierdas esta oportunidad de conocer tu plan personalizado.')}
    ${divider()}
    ${p('Si quieres que te llamemos en otro horario, simplemente responde este correo indicando cuándo te viene bien. Nos adaptamos a tus tiempos.')}
    ${p('También puedes escribirnos directamente si prefieres coordinar por esta vía.')}
    ${ctaButton('Escríbenos a proppi.cl')}
    ${divider()}
    <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
      Saludos,<br/>
      <strong style="color:#0F172A;">${firmante}</strong><br/>
      <span style="color:#64748B;">Proppi · Inversión Inmobiliaria</span>
    </p>
  `;
  return {
    subject: `${firstName}, intentamos contactarte - ¿cuándo te viene bien?`,
    html: baseTemplate({
      firstName,
      headerEmoji: '',
      headerTitle: 'Intentamos contactarte',
      headerSubtitle: 'Queremos asegurarnos de que no pierdas tu cupo de asesoría',
      bodyHtml: body,
    }),
  };
}

function emailPlanPresentado(firstName: string, proyecto?: string | null, asesorName?: string | null) {
  const proyectoLinea = proyecto
    ? `<p style="margin:0 0 16px;font-size:15px;color:#1E3A5F;line-height:1.65;">Ya revisaste los números de <strong style="color:#0369A1;">${proyecto}</strong> junto a tu asesor. Ahora queremos asegurarnos de que tengas todo claro para dar el siguiente paso con confianza.</p>`
    : `<p style="margin:0 0 16px;font-size:15px;color:#1E3A5F;line-height:1.65;">Ya revisaste los números y flujos de tu inversión junto a tu asesor. Ahora queremos asegurarnos de que tengas todo claro para dar el siguiente paso con confianza.</p>`;
  const firmante = asesorName ?? 'Tu asesor Proppi';
  const body = `
    ${p(`Hola <strong>${firstName}</strong>,`)}
    ${proyectoLinea}
    ${infoBox('', 'Recuerda que tu plan incluye', 'La propuesta detallada con valores, financiamiento y retorno estimado queda a tu disposición. Tu asesor puede resolver cualquier duda que tengas.')}
    ${divider()}
    ${infoBox('', '¿Tienes preguntas?', 'Responde directamente este correo o comunícate con tu asesor. Estamos para acompañarte en cada detalle antes de tomar una decisión.')}
    ${ctaButton('Escríbenos a proppi.cl')}
    ${divider()}
    <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
      Saludos,<br/>
      <strong style="color:#0F172A;">${firmante}</strong><br/>
      <span style="color:#64748B;">Proppi · Inversión Inmobiliaria</span>
    </p>
  `;
  return {
    subject: `Tu plan de inversión está listo, ${firstName}`,
    html: baseTemplate({
      firstName,
      headerEmoji: '',
      headerTitle: 'Tu plan de inversión está listo',
      headerSubtitle: 'Diseñado especialmente para tu perfil y tus metas',
      bodyHtml: body,
    }),
  };
}

// ─── MANUAL EMAIL TEMPLATES ───────────────────────────────────────────────────

function emailNoContestoManual(firstName: string) {
  const body = `
    ${p(`Hola <strong>${firstName}</strong>,`)}
    ${p('Recién intentamos contactarte por teléfono sin éxito. Nos comunicamos porque nos dejaste tus datos para conocer más sobre inversión en departamentos.')}
    ${infoBox('', 'Te intentamos llamar', 'Queremos hacerte unas preguntas breves para evaluar si calificas y, de ser así, agendar una asesoría gratuita con uno de nuestros asesores inmobiliarios.')}
    ${divider()}
    ${p('<strong>¿Podrías indicarnos por este correo cuándo sería un buen momento para llamarte?</strong> Nos adaptamos a tu horario.')}
    ${p('También puedes escribirnos directamente por WhatsApp para coordinar de forma más rápida:')}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
      <tr>
        <td align="center">
          <a href="https://wa.me/56979711557?text=Hola%2C%20me%20contactaron%20de%20Proppi%20y%20quiero%20más%20información" style="display:inline-block;background:#25D366;color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:0.2px;box-shadow:0 4px 16px rgba(37,211,102,0.35);">Contáctanos ahora</a>
        </td>
      </tr>
    </table>
    ${ctaButton('Conoce más en proppi.cl')}
    ${divider()}
    <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
      Saludos,<br/>
      <strong style="color:#0F172A;">Susan Petersen</strong><br/>
      <span style="color:#64748B;">Proppi · Inversión Inmobiliaria</span>
    </p>
  `;
  return {
    subject: `${firstName}, intentamos contactarte - Proppi`,
    html: baseTemplate({
      firstName,
      headerEmoji: '',
      headerTitle: 'Intentamos contactarte',
      headerSubtitle: 'Nos dejaste tus datos para invertir en departamentos',
      bodyHtml: body,
    }),
  };
}

function emailAsesoriaAgendadaManual(firstName: string) {
  const body = `
    ${p(`¡Hola <strong>${firstName}</strong>!`)}
    ${p('Te confirmamos que tu asesoría con Proppi ya fue agendada. A tu correo te llegó el link de <strong>Google Meet</strong> para conectarte a la reunión.')}
    ${infoBox('', 'Link de la reunión', 'Revisa tu bandeja de entrada — te llegó una invitación de Google Calendar con el enlace de Google Meet para conectarte el día y hora acordados.')}
    ${divider()}
    <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:12px;">¿Qué veremos en la asesoría?</div>
    ${stepsList([
      { num: '1', text: '<strong>Tu perfil financiero</strong> — entenderemos tu situación actual y tus objetivos.' },
      { num: '2', text: '<strong>Las opciones disponibles</strong> — te mostraremos proyectos que se adaptan a ti.' },
      { num: '3', text: '<strong>El plan de financiamiento</strong> — cómo estructurar la inversión de forma inteligente.' },
    ])}
    ${infoBox('', 'Tip para tu asesoría', 'Tener a mano tu última liquidación de sueldo puede agilizar mucho la conversación. No es obligatorio, pero ayuda a personalizar mejor tu plan.')}
    ${p('Si necesitas reprogramar, no dudes en responder este correo.')}
    ${divider()}
    <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
      ¡Gracias!<br/>
      <strong style="color:#0F172A;">Susan Petersen</strong><br/>
      <span style="color:#64748B;">Proppi · Inversión Inmobiliaria</span>
    </p>
  `;
  return {
    subject: `Tu asesoría con Proppi está confirmada`,
    html: baseTemplate({
      firstName,
      headerEmoji: '',
      headerTitle: 'Tu asesoría está confirmada',
      headerSubtitle: 'Revisa tu correo — te enviamos el link de Google Meet',
      bodyHtml: body,
    }),
  };
}

// ─── GENERATE EMAIL BY STATUS ─────────────────────────────────────────────────

function generateEmail(
  status: string,
  firstName: string,
  proyecto?: string | null,
  asesorName?: string | null,
): { subject: string; html: string } | null {
  switch (status) {
    case 'new':                       return emailBienvenida(firstName);
    case 'asesoria_agendada':         return emailAsesoriaAgendada(firstName, asesorName);
    case 'recontactar':               return emailRecontactar(firstName, asesorName);
    case 'plan_presentado':           return emailPlanPresentado(firstName, proyecto, asesorName);
    case 'no_contesto_manual':        return emailNoContestoManual(firstName);
    case 'asesoria_agendada_manual':  return emailAsesoriaAgendadaManual(firstName);
    default:                          return null;
  }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id, new_status } = await req.json();

    if (!lead_id || !new_status) {
      return new Response(JSON.stringify({ error: 'Missing lead_id or new_status' }), { status: 400, headers: corsHeaders });
    }

    if (!EMAIL_STATUSES.includes(new_status)) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Status not in email list' }), { status: 200, headers: corsHeaders });
    }

    const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404, headers: corsHeaders });
    }

    if (!lead.email) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Lead has no email' }), { status: 200, headers: corsHeaders });
    }

    if (lead.is_demo) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Demo lead' }), { status: 200, headers: corsHeaders });
    }

    // Asesor info
    let asesorName: string | null  = null;
    let asesorEmail: string | null = null;
    if (lead.advisor_id) {
      const [{ data: profile }, { data: authData }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('user_id', lead.advisor_id).single(),
        supabase.auth.admin.getUserById(lead.advisor_id),
      ]);
      asesorName  = profile?.full_name ?? null;
      asesorEmail = authData?.user?.email ?? null;
    }

    // Ejecutiva info
    let ejecutivaEmail: string | null = null;
    if (lead.assigned_to) {
      const { data: authData } = await supabase.auth.admin.getUserById(lead.assigned_to);
      ejecutivaEmail = authData?.user?.email ?? null;
    }

    // CC según pipeline
    const MANUAL_TEMPLATES = ['no_contesto_manual', 'asesoria_agendada_manual'];
    const CC_SUSAN = 'susan.petersen@proppi.cl';
    // Solo agregar a Susan en CC si ella es la ejecutiva asignada al lead
    const ejecutivaIsSusan = ejecutivaEmail === CC_SUSAN;
    let cc: string[];
    if (MANUAL_TEMPLATES.includes(new_status)) {
      cc = ejecutivaIsSusan ? [CC_ADMIN, CC_SUSAN] : [CC_ADMIN];
    } else {
      const ccContact = ASESOR_PIPELINE.includes(new_status) ? asesorEmail : ejecutivaEmail;
      cc = [CC_ADMIN, ccContact].filter(Boolean) as string[];
    }

    const firstName    = lead.name.split(' ')[0];
    const emailContent = generateEmail(new_status, firstName, lead.proyecto, asesorName);

    if (!emailContent) {
      return new Response(JSON.stringify({ skipped: true, reason: 'No template for status' }), { status: 200, headers: corsHeaders });
    }

    const replyTo = (MANUAL_TEMPLATES.includes(new_status) && ejecutivaIsSusan)
      ? [REPLY_TO, CC_SUSAN]
      : [REPLY_TO];

    const emailPayload = {
      from:      FROM,
      to:        [lead.email],
      cc,
      reply_to:  replyTo,
      subject:   emailContent.subject,
      html:      emailContent.html,
    };

    const sendResult = await sendEmailViaAppsScript(emailPayload);

    console.log(`Email sent for status "${new_status}" to ${lead.email}`);
    return new Response(JSON.stringify({ ok: true, provider: 'apps_script', result: sendResult }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
