import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM = 'Llave Propia <notificaciones@proppi.cl>';
const REPLY_TO = ['vicente@llavepropia.cl', 'rodrigo.canas@llavepropia.cl', 'karina.valenzuela@llavepropia.cl'];

// ── HTML helpers ──
function headerBlock() {
  return '<tr><td style="background:linear-gradient(135deg,#1B3A6B,#243870);padding:32px 28px;text-align:center"><span style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#fff">Llave</span> <span style="font-size:10px;font-weight:800;color:#3ACFB8;letter-spacing:2px;text-transform:uppercase">Propia</span></td></tr>';
}
function footerBlock() {
  return '<tr><td style="background:#1B3A6B;padding:20px 28px;text-align:center"><p style="color:#9A8878;font-size:12px;margin:0;line-height:1.6">Llave Propia \u00b7 <a href="https://llavepropia.cl" style="color:#3ACFB8;text-decoration:none">www.llavepropia.cl</a></p></td></tr>';
}
function firma() {
  return '<div style="border-top:1px solid #EDE3D4;padding-top:20px"><p style="margin:0;font-size:14px;color:#5A4A38;line-height:1.6">Saludos,<br/><strong style="color:#1B3A6B">Karina V.</strong><br/><span style="color:#9A8878">Llave Propia \u00b7 Leasing Habitacional</span></p></div>';
}
function waBtn(text: string, msg: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px"><tr><td align="center"><a href="https://wa.me/56962078510?text=${msg}" style="display:inline-block;background:#25D366;color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.2px;box-shadow:0 4px 16px rgba(37,211,102,0.35)">${text}</a></td></tr></table>`;
}
function badge(emoji: string, title: string, subtitle: string, color = '#2B7A4E', bg = 'linear-gradient(135deg,#E5F7F4,#D5F5E3)', border = 'rgba(45,184,158,0.3)') {
  return `<div style="background:${bg};border:1.5px solid ${border};border-radius:12px;padding:18px 20px;margin:0 0 24px;text-align:center"><p style="font-size:20px;font-weight:900;color:${color};margin:0 0 4px">${emoji} ${title}</p><p style="font-size:13px;color:#1B3A6B;margin:0;font-weight:600">${subtitle}</p></div>`;
}
function wrap(body: string) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#FEFCF7;font-family:Arial,Helvetica,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#FEFCF7;padding:40px 20px"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(27,58,107,0.08)">${headerBlock()}<tr><td style="padding:36px 28px">${body}</td></tr>${footerBlock()}</table></td></tr></table></body></html>`;
}
function p(text: string) {
  return `<p style="font-size:16px;color:#1A150F;line-height:1.7;margin:0 0 20px">${text}</p>`;
}
function infoBox(text: string) {
  return `<div style="background:#E5F7F4;border:1px solid rgba(45,184,158,0.3);border-radius:10px;padding:14px 18px;margin:0 0 24px"><p style="font-size:13px;color:#1B3A6B;margin:0;line-height:1.6">${text}</p></div>`;
}
function bulletList(items: string[]) {
  let h = '<div style="background:#fff;border:1.5px solid #EDE3D4;border-radius:12px;padding:20px 24px;margin:0 0 20px">';
  for (const item of items) h += `<p style="font-size:14px;color:#1A150F;margin:0 0 10px;line-height:1.6">\u2705 ${item}</p>`;
  return h + '</div>';
}
function docList() {
  const docs = ['C\u00e9dula de identidad por ambos lados','6 \u00faltimas liquidaciones de sueldo','Cotizaciones AFP \u00faltimo a\u00f1o','Contrato de trabajo con antig\u00fcedad','Deuda CMF (se obtiene gratuita)','Certificado de matrimonio o no matrimonio'];
  let h = '<div style="background:#fff;border:1.5px solid #EDE3D4;border-radius:12px;padding:20px 24px;margin:0 0 20px"><p style="font-size:13px;font-weight:800;color:#1B3A6B;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.5px">\ud83d\udcc4 Documentos requeridos</p><table cellpadding="0" cellspacing="0" border="0" width="100%">';
  docs.forEach((doc, i) => {
    const pb = i === docs.length - 1 ? '0' : '12px';
    h += `<tr><td width="32" valign="middle" style="padding:0 0 ${pb} 0"><div style="background:#2DB89E;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:800">${i+1}</div></td><td valign="middle" style="padding:0 0 ${pb} 8px;font-size:14px;color:#1A150F">${doc}</td></tr>`;
  });
  return h + '</table></div>';
}

// ── Email templates ──
interface EmailTemplate {
  subject: string;
  html: string;
}

function getTemplate(sequenceKey: string, step: number, firstName: string): EmailTemplate | null {
  const templates: Record<string, Record<number, () => EmailTemplate>> = {
    no_contesta: {
      1: () => ({
        subject: `${firstName}, intentamos contactarte \u2014 Llave Propia`,
        html: wrap(
          badge('\ud83d\udcde', 'Intentamos contactarte', 'Queremos ayudarte a comprar tu primera vivienda') +
          p(`\u00a1Hola <strong>${firstName}</strong>!`) +
          p('Te llamamos para conversar sobre tu evaluaci\u00f3n de <strong>Leasing Habitacional DS120</strong>, pero no pudimos contactarte.') +
          p('Queremos ayudarte a dar el paso hacia tu casa propia. Recuerda que con este programa puedes comprar <strong>sin pie y sin ahorro previo</strong>.') +
          infoBox('\ud83d\udca1 <strong>Si prefieres, puedes escribirnos directo por WhatsApp</strong> y te respondemos en minutos. Tambi\u00e9n puedes responder este correo.') +
          waBtn('\ud83d\udcac Escr\u00edbenos por WhatsApp', 'Hola%2C%20intentaron%20llamarme%20de%20Llave%20Propia') +
          firma()
        ),
      }),
      2: () => ({
        subject: `${firstName}, \u00bfsigues interesado en tu casa propia? \u2014 Llave Propia`,
        html: wrap(
          badge('\ud83c\udfe1', '\u00bfSigues interesado en tu casa propia?', 'El Subsidio DS120 puede hacer posible tu sue\u00f1o', '#1B3A6B', 'linear-gradient(135deg,#FFF8EC,#FEFCF7)', 'rgba(201,135,26,0.3)') +
          p(`\u00a1Hola <strong>${firstName}</strong>!`) +
          p('Hace unos d\u00edas completaste tu evaluaci\u00f3n en Llave Propia y no hemos podido conversar contigo.') +
          p('Te recordamos los <strong>beneficios del Leasing Habitacional DS120</strong>:') +
          bulletList([
            '<strong>Sin pie inicial</strong> \u2014 no necesitas ahorro previo',
            '<strong>Sin cr\u00e9dito hipotecario</strong> \u2014 arriendas con opci\u00f3n de compra',
            '<strong>Subsidio del Estado</strong> \u2014 el gobierno te ayuda a financiar tu vivienda',
            '<strong>Asesor\u00eda 100% gratuita</strong> \u2014 te acompa\u00f1amos en todo el proceso',
          ]) +
          p('Solo necesitamos unos minutos para evaluar tu caso. <strong>\u00bfTe gustar\u00eda agendar una llamada?</strong>') +
          waBtn('\ud83d\udcac Agendar por WhatsApp', 'Hola%2C%20quiero%20agendar%20una%20llamada%20para%20evaluar%20mi%20caso') +
          firma()
        ),
      }),
      3: () => ({
        subject: `${firstName}, \u00faltima oportunidad \u2014 Llave Propia`,
        html: wrap(
          badge('\u23f0', '\u00daltima oportunidad', 'No queremos que pierdas esta posibilidad', '#c0392b', 'linear-gradient(135deg,#FEE2E2,#FFF5F5)', 'rgba(192,57,43,0.2)') +
          p(`\u00a1Hola <strong>${firstName}</strong>!`) +
          p('Hemos intentado contactarte varias veces sin \u00e9xito. Entendemos que puedes estar ocupado/a.') +
          p('Este es nuestro <strong>\u00faltimo intento de contacto</strong>. Si sigues interesado/a en comprar tu primera vivienda con el Subsidio DS120, resp\u00f3ndenos y retomamos tu proceso de inmediato.') +
          infoBox('\ud83d\udd11 <strong>Recuerda:</strong> los cupos del programa son limitados y tu evaluaci\u00f3n preliminar ya est\u00e1 lista. Solo necesitamos conversar contigo para avanzar.') +
          p('Si no est\u00e1s interesado/a, no te enviaremos m\u00e1s correos. \u00a1Sin compromiso!') +
          waBtn('\ud83d\udcac S\u00ed, quiero retomar mi proceso', 'Hola%2C%20quiero%20retomar%20mi%20proceso%20de%20Leasing%20Habitacional') +
          firma()
        ),
      }),
    },
    esperando_documentos: {
      1: () => ({
        subject: `${firstName}, \u00bfnecesitas ayuda con los documentos? \u2014 Llave Propia`,
        html: wrap(
          badge('\ud83d\udcc4', '\u00bfNecesitas ayuda con los documentos?', 'Estamos aqu\u00ed para orientarte') +
          p(`\u00a1Hola <strong>${firstName}</strong>!`) +
          p('Te escribimos porque estamos esperando tu documentaci\u00f3n para avanzar con la evaluaci\u00f3n de tu <strong>Leasing Habitacional</strong>.') +
          p('Sabemos que juntar los documentos puede parecer complicado, pero <strong>estamos aqu\u00ed para ayudarte paso a paso</strong>.') +
          docList() +
          infoBox('\ud83d\udca1 <strong>Si complementas renta con otra persona</strong>, necesitamos los mismos documentos de ella.') +
          p('Puedes enviarlos <strong>respondiendo este correo</strong> o por WhatsApp:') +
          waBtn('\ud83d\udcac Enviar documentos por WhatsApp', 'Hola%2C%20quiero%20enviar%20mis%20documentos%20para%20el%20leasing') +
          firma()
        ),
      }),
      2: () => ({
        subject: `${firstName}, solo faltan tus documentos para avanzar \u2014 Llave Propia`,
        html: wrap(
          badge('\u2705', 'Solo faltan tus documentos para avanzar', 'Tu pre-aprobaci\u00f3n ya est\u00e1 lista') +
          p(`\u00a1Hola <strong>${firstName}</strong>!`) +
          p('Ya completaste el paso m\u00e1s importante: <strong>tu evaluaci\u00f3n preliminar est\u00e1 aprobada</strong>. Solo falta que nos env\u00edes los documentos para continuar con el proceso formal.') +
          p('Es m\u00e1s f\u00e1cil de lo que parece. La mayor\u00eda de nuestros clientes los re\u00fanen en <strong>menos de un d\u00eda</strong>.') +
          infoBox('\ud83d\udccb <strong>Tip:</strong> Si no tienes alg\u00fan documento, escr\u00edbenos y te explicamos c\u00f3mo obtenerlo. Por ejemplo, la Deuda CMF se descarga gratis desde el sitio de la CMF.') +
          p('No dejes pasar esta oportunidad. <strong>Env\u00edanos los documentos y avanzamos juntos:</strong>') +
          waBtn('\ud83d\udcac Enviar documentos ahora', 'Hola%2C%20quiero%20enviar%20mis%20documentos%20para%20avanzar') +
          firma()
        ),
      }),
      3: () => ({
        subject: `${firstName}, no pierdas tu pre-aprobaci\u00f3n \u2014 Llave Propia`,
        html: wrap(
          badge('\u26a0\ufe0f', 'No pierdas tu pre-aprobaci\u00f3n', 'Los cupos del programa son limitados', '#e67e22', 'linear-gradient(135deg,#FEF3E2,#FFF8EE)', 'rgba(230,126,34,0.3)') +
          p(`\u00a1Hola <strong>${firstName}</strong>!`) +
          p('Tu evaluaci\u00f3n preliminar para el <strong>Leasing Habitacional DS120</strong> sigue vigente, pero necesitamos tus documentos para no perder el avance.') +
          p('Los <strong>cupos del programa son limitados</strong> y cada d\u00eda que pasa es una oportunidad que puede cerrarse.') +
          bulletList([
            'Tu pre-aprobaci\u00f3n ya est\u00e1 lista',
            'Solo faltan los documentos para avanzar',
            'El proceso es 100% gratuito',
            'Te acompa\u00f1amos en cada paso',
          ]) +
          p('Este es nuestro \u00faltimo recordatorio sobre los documentos. <strong>\u00bfNecesitas ayuda? Escr\u00edbenos:</strong>') +
          waBtn('\ud83d\udcac Necesito ayuda con los documentos', 'Hola%2C%20necesito%20ayuda%20para%20reunir%20mis%20documentos') +
          firma()
        ),
      }),
    },
    contactado: {
      1: () => ({
        subject: `${firstName}, \u00bftienes dudas sobre el proceso? \u2014 Llave Propia`,
        html: wrap(
          badge('\u2753', '\u00bfTienes dudas sobre el proceso?', 'Respondemos las preguntas m\u00e1s comunes', '#1B3A6B', 'linear-gradient(135deg,#DBEAFE,#EFF6FF)', 'rgba(27,58,107,0.2)') +
          p(`\u00a1Hola <strong>${firstName}</strong>!`) +
          p('Conversamos hace unos d\u00edas y quer\u00edamos asegurarnos de que no te quedaron dudas sobre el <strong>Leasing Habitacional DS120</strong>.') +
          p('Estas son las <strong>preguntas m\u00e1s frecuentes</strong> que recibimos:') +
          '<div style="background:#fff;border:1.5px solid #EDE3D4;border-radius:12px;padding:20px 24px;margin:0 0 20px">' +
          '<p style="font-size:14px;color:#1B3A6B;margin:0 0 14px;font-weight:800">\ud83e\udd14 \u00bfRealmente no necesito pie?</p>' +
          '<p style="font-size:14px;color:#1A150F;margin:0 0 16px;line-height:1.6">Correcto. El Leasing Habitacional funciona como un arriendo con opci\u00f3n de compra. No necesitas ahorro previo ni pie inicial.</p>' +
          '<p style="font-size:14px;color:#1B3A6B;margin:0 0 14px;font-weight:800">\ud83d\udcca \u00bfCu\u00e1nto es el subsidio?</p>' +
          '<p style="font-size:14px;color:#1A150F;margin:0 0 16px;line-height:1.6">El Estado te entrega un subsidio que se aplica directamente a tu vivienda.</p>' +
          '<p style="font-size:14px;color:#1B3A6B;margin:0 0 14px;font-weight:800">\ud83d\udcb0 \u00bfCu\u00e1nto pagar\u00eda mensualmente?</p>' +
          '<p style="font-size:14px;color:#1A150F;margin:0 0 16px;line-height:1.6">Depende del valor de la vivienda y tu renta. En muchos casos, el dividendo es similar o menor a un arriendo.</p>' +
          '<p style="font-size:14px;color:#1B3A6B;margin:0 0 14px;font-weight:800">\u23f1\ufe0f \u00bfCu\u00e1nto demora el proceso?</p>' +
          '<p style="font-size:14px;color:#1A150F;margin:0;line-height:1.6">Una vez que tenemos tus documentos, la evaluaci\u00f3n toma entre 5 a 10 d\u00edas h\u00e1biles.</p>' +
          '</div>' +
          p('Si tienes otra pregunta, <strong>no dudes en escribirnos</strong>:') +
          waBtn('\ud83d\udcac Tengo una pregunta', 'Hola%2C%20tengo%20una%20duda%20sobre%20el%20Leasing%20Habitacional') +
          firma()
        ),
      }),
      2: () => ({
        subject: `${firstName}, tu casa propia puede ser realidad \u2014 Llave Propia`,
        html: wrap(
          badge('\ud83d\udd11', 'Tu casa propia puede ser realidad', 'Miles de familias ya lo lograron con el DS120') +
          p(`\u00a1Hola <strong>${firstName}</strong>!`) +
          p('Queremos recordarte que el <strong>Leasing Habitacional DS120</strong> es una de las mejores oportunidades para acceder a tu primera vivienda.') +
          '<div style="background:linear-gradient(135deg,#E5F7F4,#D5F5E3);border:1.5px solid rgba(45,184,158,0.3);border-radius:12px;padding:20px 24px;margin:0 0 24px">' +
          '<p style="font-size:15px;color:#1B3A6B;margin:0 0 12px;font-weight:800;text-align:center">Lo que necesitas para comenzar:</p>' +
          '<p style="font-size:14px;color:#1A150F;margin:0 0 8px;line-height:1.6">\u2705 Renta l\u00edquida desde $800.000</p>' +
          '<p style="font-size:14px;color:#1A150F;margin:0 0 8px;line-height:1.6">\u2705 Contrato indefinido</p>' +
          '<p style="font-size:14px;color:#1A150F;margin:0 0 8px;line-height:1.6">\u2705 No estar en DICOM</p>' +
          '<p style="font-size:14px;color:#1A150F;margin:0;line-height:1.6">\u2705 Tener una vivienda vista (m\u00e1x 2.000 UF)</p>' +
          '</div>' +
          p('Si cumples estos requisitos, <strong>est\u00e1s a pocos pasos de tener tu casa propia</strong>. No dejes pasar esta oportunidad.') +
          p('<strong>\u00bfListo/a para avanzar?</strong> Escr\u00edbenos y retomamos tu proceso:') +
          waBtn('\ud83d\udcac Quiero avanzar con mi proceso', 'Hola%2C%20quiero%20avanzar%20con%20mi%20proceso%20de%20Leasing%20Habitacional') +
          firma()
        ),
      }),
    },
  };

  const seq = templates[sequenceKey];
  if (!seq || !seq[step]) return null;
  return seq[step]();
}

// ── Sequence definitions: { status, key, steps: [daysAfterStatusChange] } ──
const SEQUENCES = [
  { status: 'no_contesta',          key: 'no_contesta',          steps: [2, 4, 6] },
  { status: 'esperando_documentos', key: 'esperando_documentos', steps: [2, 4, 6] },
  { status: 'contactado',          key: 'contactado',           steps: [3, 5] },
];

const MAX_PER_RUN = 40;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const now = new Date();
  let totalSent = 0;
  const errors: string[] = [];

  // Pre-fetch all sent logs to avoid N+1 queries
  const { data: allLogs } = await supabase
    .from('email_sequence_log')
    .select('lead_id, sequence_key, step');
  const sentSet = new Set((allLogs || []).map(l => `${l.lead_id}:${l.sequence_key}:${l.step}`));

  console.log(`[email-sequences] Starting. Logs in DB: ${(allLogs || []).length}`);

  for (const seq of SEQUENCES) {
    if (totalSent >= MAX_PER_RUN) break;

    const { data: leads, error: leadsErr } = await supabase
      .from('leads')
      .select('id, name, email, status, status_changed_at')
      .eq('status', seq.status)
      .eq('is_demo', false)
      .not('email', 'is', null)
      .neq('email', '')
      .not('status_changed_at', 'is', null);

    console.log(`[email-sequences] ${seq.status}: found ${leads?.length ?? 0} leads, error: ${leadsErr?.message ?? 'none'}`);

    if (leadsErr || !leads) {
      errors.push(`Error fetching ${seq.status}: ${leadsErr?.message}`);
      continue;
    }

    if (leads.length > 0) {
      const sample = leads[0];
      console.log(`[email-sequences] Sample lead: id=${sample.id}, email=${sample.email}, status_changed_at=${sample.status_changed_at}`);
    }

    for (const lead of leads) {
      if (totalSent >= MAX_PER_RUN) break;

      const changedAt = new Date(lead.status_changed_at);
      const daysSince = Math.floor((now.getTime() - changedAt.getTime()) / (1000 * 60 * 60 * 24));
      const firstName = (lead.name || '').trim().split(' ')[0] || 'Hola';

      if (totalSent === 0 && leads.indexOf(lead) === 0) {
        console.log(`[email-sequences] daysSince=${daysSince}, changedAt=${changedAt.toISOString()}, now=${now.toISOString()}`)
      }

      for (let stepIdx = 0; stepIdx < seq.steps.length; stepIdx++) {
        const stepDay = seq.steps[stepIdx];
        const stepNum = stepIdx + 1;

        if (daysSince < stepDay) continue;

        const logKey = `${lead.id}:${seq.key}:${stepNum}`;
        if (sentSet.has(logKey)) continue;

        const template = getTemplate(seq.key, stepNum, firstName);
        if (!template) continue;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: [lead.email],
            reply_to: REPLY_TO,
            subject: template.subject,
            html: template.html,
          }),
        });

        if (res.ok) {
          await supabase.from('email_sequence_log').insert({
            lead_id: lead.id,
            sequence_key: seq.key,
            step: stepNum,
          });
          sentSet.add(logKey);
          totalSent++;
          console.log(`Sent ${seq.key} step ${stepNum} to ${lead.email}`);
        } else {
          const err = await res.json();
          errors.push(`${lead.email}: ${err.message}`);
          if (res.status === 429) {
            return new Response(JSON.stringify({ sent: totalSent, errors, stopped: 'rate_limit' }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        await new Promise(r => setTimeout(r, 500));
        break; // one step per lead per run
      }
    }
  }

  // Debug info
  const debug: any = { now: now.toISOString(), logsCount: (allLogs || []).length };
  for (const seq of SEQUENCES) {
    const { data: dbg } = await supabase
      .from('leads')
      .select('id, email, status_changed_at')
      .eq('status', seq.status)
      .eq('is_demo', false)
      .not('email', 'is', null)
      .neq('email', '')
      .not('status_changed_at', 'is', null)
      .limit(2);
    if (dbg && dbg.length > 0) {
      const d0 = dbg[0];
      const ca = new Date(d0.status_changed_at);
      const ds = Math.floor((now.getTime() - ca.getTime()) / (1000 * 60 * 60 * 24));
      debug[seq.status] = { count: dbg.length, sample_changed: d0.status_changed_at, daysSince: ds, email: d0.email };
    } else {
      debug[seq.status] = { count: 0 };
    }
  }

  return new Response(JSON.stringify({ sent: totalSent, errors, debug }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
