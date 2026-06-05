// Script temporal para previsualizar la secuencia de emails
// Ejecutar: node test-emails.mjs
// Eliminar después de probar.

const SUPABASE_URL = 'https://irvsedcympaaswtwddan.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydnNlZGN5bXBhYXN3dHdkZGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDk5OTYsImV4cCI6MjA4NzYyNTk5Nn0.Ust5E8raVFMyBY6iJsxWtWbKHsbe-w9MlAcMlkW6rHI';
const TO = 'vicente.torres@proppi.cl';

// Datos de prueba
const firstName  = 'Vicente';
const proyecto   = 'Proppi Tower';
const asesorName = 'Carlos Rodríguez';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function baseTemplate({ firstName, headerEmoji, headerTitle, headerSubtitle, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headerTitle}</title>
</head>
<body style="margin:0;padding:0;background:#fdf8f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdf8f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(200,100,30,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#f77d23 0%,#b05510 100%);padding:36px 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1;">PROPPI</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.65);letter-spacing:2px;text-transform:uppercase;margin-top:3px;">Inversión Inmobiliaria</div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <div style="font-size:44px;line-height:1;">${headerEmoji}</div>
                  </td>
                </tr>
              </table>
              <div style="margin-top:28px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.2);">
                <div style="font-size:26px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.3px;">${headerTitle}</div>
                <div style="font-size:15px;color:rgba(255,255,255,0.82);margin-top:8px;line-height:1.55;">${headerSubtitle}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 28px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #f0e8e0;background:#fdf8f4;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size:12px;color:#b08a70;line-height:1.6;">
                      Este mensaje fue enviado a ${firstName} desde <strong style="color:#9d5819;">Proppi CRM</strong>.<br/>
                      <a href="https://proppi.cl" style="color:#f77d23;text-decoration:none;">proppi.cl</a> &nbsp;·&nbsp; notificaciones@proppi.cl
                    </div>
                  </td>
                  <td align="right" style="vertical-align:bottom;">
                    <div style="font-size:20px;font-weight:900;color:#f0ddd0;letter-spacing:-0.5px;">PROPPI</div>
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

function infoBox(icon, title, content) {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="background:#fff8f2;border:1px solid #f0e0cc;border-radius:12px;padding:18px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:top;width:36px;"><div style="font-size:24px;line-height:1;">${icon}</div></td>
            <td style="vertical-align:top;padding-left:12px;">
              <div style="font-size:13px;font-weight:700;color:#9d5819;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${title}</div>
              <div style="font-size:14px;color:#5a3e30;line-height:1.55;">${content}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function stepsList(steps) {
  const rows = steps.map(s => `
    <tr>
      <td style="padding:10px 0;vertical-align:top;border-bottom:1px solid #f5ede6;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:top;width:30px;">
              <div style="width:24px;height:24px;border-radius:50%;background:#f77d23;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">${s.num}</div>
            </td>
            <td style="vertical-align:top;padding-left:12px;">
              <div style="font-size:14px;color:#3d2b1f;line-height:1.55;padding-top:2px;">${s.text}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">${rows}</table>`;
}

function ctaButton(text, url = 'https://proppi.cl') {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
    <tr>
      <td align="center">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#f77d23,#c06520);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;box-shadow:0 4px 16px rgba(247,125,35,0.35);">${text}</a>
      </td>
    </tr>
  </table>`;
}

function divider() { return `<div style="height:1px;background:#f0e8e0;margin:24px 0;"></div>`; }
function p(text)    { return `<p style="margin:0 0 16px;font-size:15px;color:#3d2b1f;line-height:1.65;">${text}</p>`; }

function asesorCard(name) {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="background:linear-gradient(135deg,#fff4eb,#fdeede);border:1px solid #f5d9b8;border-radius:12px;padding:16px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:middle;width:44px;">
              <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#f77d23,#c06520);text-align:center;line-height:40px;font-size:18px;color:#fff;">👤</div>
            </td>
            <td style="vertical-align:middle;padding-left:14px;">
              <div style="font-size:12px;color:#b08a70;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Tu asesor inmobiliario</div>
              <div style="font-size:16px;font-weight:700;color:#2a1f18;margin-top:2px;">${name}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

// ─── TEMPLATES ───────────────────────────────────────────────────────────────

const emails = [
  {
    label: '1/5 — Bienvenida (new)',
    subject: `¡Bienvenido/a a Proppi, ${firstName}! 🏠`,
    html: baseTemplate({
      firstName, headerEmoji: '🌟',
      headerTitle: `Bienvenido/a, ${firstName}`,
      headerSubtitle: 'Tu camino a la inversión inmobiliaria comienza aquí',
      bodyHtml: `
        ${p(`Hola <strong>${firstName}</strong>,`)}
        ${p(`Gracias por tu interés en <strong style="color:#c06520;">${proyecto}</strong>. Nos alegra que estés considerando invertir en bienes raíces, y queremos acompañarte en cada paso del camino.`)}
        ${infoBox('🏢', '¿Qué es Proppi?', 'Somos una empresa especializada en inversión inmobiliaria en Chile. Te ayudamos a encontrar la propiedad ideal según tu perfil financiero, con asesoría personalizada y sin costo para ti.')}
        ${divider()}
        <div style="font-size:14px;font-weight:700;color:#2a1f18;margin-bottom:4px;">¿Qué pasa ahora?</div>
        ${stepsList([
          { num: '1', text: 'En los próximos minutos uno de nuestros ejecutivos te llamará para conocer tu situación.' },
          { num: '2', text: 'Si calzas con nuestros proyectos, agendaremos una asesoría gratuita con un especialista.' },
          { num: '3', text: 'Diseñaremos un plan de inversión a la medida de tu perfil y tus metas.' },
        ])}
        ${divider()}
        ${p('Si tienes preguntas mientras tanto, puedes visitar nuestra web o respondernos directamente a este correo.')}
        ${ctaButton('Conoce más en proppi.cl')}
      `,
    }),
  },
  {
    label: '2/5 — Confirmación asesoría (asesoria_agendada)',
    subject: `Tu asesoría con Proppi está confirmada ✅`,
    html: baseTemplate({
      firstName, headerEmoji: '✅',
      headerTitle: 'Tu asesoría está confirmada',
      headerSubtitle: 'Un experto en inversión inmobiliaria te atenderá pronto',
      bodyHtml: `
        ${p(`¡Hola <strong>${firstName}</strong>!`)}
        ${p('Nos alegra confirmarte que tu asesoría con Proppi está agendada. Estás un paso más cerca de hacer realidad tu inversión.')}
        ${asesorCard(asesorName)}
        ${divider()}
        <div style="font-size:14px;font-weight:700;color:#2a1f18;margin-bottom:12px;">¿Qué veremos en la asesoría?</div>
        ${stepsList([
          { num: '1', text: '<strong>Tu perfil financiero</strong> — entenderemos tu situación actual y tus objetivos.' },
          { num: '2', text: '<strong>Las opciones disponibles</strong> — te mostraremos proyectos que se adaptan a ti.' },
          { num: '3', text: '<strong>El plan de financiamiento</strong> — cómo estructurar la inversión de forma inteligente.' },
        ])}
        ${infoBox('💡', 'Tip para tu asesoría', 'Tener a mano tu última liquidación de sueldo puede agilizar mucho la conversación. No es obligatorio, pero ayuda a personalizar mejor tu plan.')}
        ${p('Si necesitas reprogramar, no dudes en responder este correo o contactar directamente a tu asesor.')}
      `,
    }),
  },
  {
    label: '3/5 — No te pudimos contactar (recontactar)',
    subject: `${firstName}, intentamos contactarte — ¿cuándo te viene bien? 📞`,
    html: baseTemplate({
      firstName, headerEmoji: '📲',
      headerTitle: 'Intentamos contactarte',
      headerSubtitle: 'Queremos asegurarnos de que no pierdas tu cupo de asesoría',
      bodyHtml: `
        ${p(`Hola <strong>${firstName}</strong>,`)}
        ${p('Intentamos contactarte pero no pudimos comunicarnos. Queremos asegurarnos de que tengas toda la información sobre las oportunidades de inversión que tenemos para ti.')}
        ${infoBox('📞', 'Intentamos llamarte', 'Tu perfil sigue activo en nuestro sistema y tu cupo de asesoría está reservado. No pierdas esta oportunidad de conocer tu plan personalizado.')}
        ${divider()}
        ${p('Si quieres que te llamemos en otro horario, simplemente responde este correo indicando cuándo te viene bien. Nos adaptamos a tus tiempos.')}
        ${p('También puedes escribirnos directamente si prefieres coordinar por esta vía.')}
        ${ctaButton('Escríbenos a proppi.cl')}
        ${divider()}
        <p style="margin:0;font-size:14px;color:#8b6e5a;line-height:1.6;">
          Saludos,<br/>
          <strong style="color:#2a1f18;">${asesorName}</strong><br/>
          <span style="color:#b08a70;">Proppi · Inversión Inmobiliaria</span>
        </p>
      `,
    }),
  },
  {
    label: '4/5 — Post-asesoría (asesoria_concretada)',
    subject: `Gracias por tu tiempo, ${firstName} — ¡viene lo bueno! 🎯`,
    html: baseTemplate({
      firstName, headerEmoji: '🤝',
      headerTitle: `Fue un placer conocerte, ${firstName}`,
      headerSubtitle: 'Estamos preparando algo especial para ti',
      bodyHtml: `
        ${p(`Hola <strong>${firstName}</strong>,`)}
        ${p('Gracias por tomarte el tiempo de reunirte con nosotros. Fue un gusto conocerte y escuchar tus objetivos.')}
        ${infoBox('🎯', 'Estamos trabajando en tu plan', 'Con la información de nuestra conversación, estamos diseñando una propuesta de inversión personalizada para tu perfil financiero y tus metas.')}
        ${divider()}
        <div style="font-size:14px;font-weight:700;color:#2a1f18;margin-bottom:12px;">¿Qué sigue?</div>
        ${stepsList([
          { num: '1', text: 'Analizamos tu perfil y las opciones disponibles en nuestros proyectos.' },
          { num: '2', text: 'Preparamos una propuesta con números reales, adaptada a tu situación.' },
          { num: '3', text: 'Te presentamos el plan y resolvemos todas tus dudas.' },
        ])}
        ${p('Muy pronto estaremos en contacto contigo con buenas noticias. ¡Gracias por confiar en Proppi!')}
        ${divider()}
        <p style="margin:0;font-size:14px;color:#8b6e5a;line-height:1.6;">
          Con entusiasmo,<br/>
          <strong style="color:#2a1f18;">${asesorName}</strong><br/>
          <span style="color:#b08a70;">Proppi · Inversión Inmobiliaria</span>
        </p>
      `,
    }),
  },
  {
    label: '5/5 — Plan presentado (plan_presentado)',
    subject: `Tu plan de inversión está listo, ${firstName} 📋`,
    html: baseTemplate({
      firstName, headerEmoji: '📋',
      headerTitle: 'Tu plan de inversión está listo',
      headerSubtitle: 'Diseñado especialmente para tu perfil y tus metas',
      bodyHtml: `
        ${p(`Hola <strong>${firstName}</strong>,`)}
        ${p(`Tu plan de inversión inmobiliaria personalizado para <strong style="color:#c06520;">${proyecto}</strong> está listo. Lo diseñamos con base en tu perfil financiero y tus objetivos para que sea una propuesta real y alcanzable.`)}
        ${infoBox('📋', 'Tu plan incluye', 'Una propuesta detallada con valores, financiamiento, proyección de arriendo y retorno estimado. Todo adaptado a tu situación real.')}
        ${divider()}
        <div style="font-size:14px;font-weight:700;color:#2a1f18;margin-bottom:12px;">¿Por qué actuar ahora?</div>
        ${stepsList([
          { num: '→', text: 'Los proyectos en preventa tienen los mejores precios — las unidades se reservan rápido.' },
          { num: '→', text: 'Las tasas hipotecarias actuales permiten estructurar financiamientos convenientes.' },
          { num: '→', text: 'Tu asesor está disponible para resolver cualquier duda antes de tomar una decisión.' },
        ])}
        ${infoBox('💬', '¿Tienes preguntas?', 'Responde este correo o contacta directamente a tu asesor. Estamos para acompañarte en cada detalle del proceso.')}
        ${ctaButton('Avancemos juntos — proppi.cl')}
        ${divider()}
        <p style="margin:0;font-size:14px;color:#8b6e5a;line-height:1.6;">
          Saludos,<br/>
          <strong style="color:#2a1f18;">${asesorName}</strong><br/>
          <span style="color:#b08a70;">Proppi · Inversión Inmobiliaria</span>
        </p>
      `,
    }),
  },
];

// ─── ENVÍO ───────────────────────────────────────────────────────────────────

async function sendEmail({ label, subject, html }) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-task-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: TO, subject, html }),
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`✅ ${label}`);
  } else {
    console.error(`❌ ${label}`, data);
  }
}

console.log(`Enviando ${emails.length} emails a ${TO}...\n`);
for (const email of emails) {
  await sendEmail(email);
  // Pequeña pausa para no saturar la API
  await new Promise(r => setTimeout(r, 500));
}
console.log('\nListo. Revisa tu bandeja.');
