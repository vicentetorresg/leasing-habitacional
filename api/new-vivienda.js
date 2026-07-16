export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.llavepropia.cl');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { nombre, telefono, email, tipo_vivienda, rango_uf, direccion, detalle_depto, comuna, superficie, dormitorios, banos, fuente, utm_source, utm_medium, utm_campaign } = req.body || {};
  if (!nombre || !telefono) return res.status(400).json({ error: 'Faltan campos' });

  const SUPA_URL = 'https://unptkiyggkuxtkzedluv.supabase.co/rest/v1/viviendas_leads';
  const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  // 1. Save to Supabase
  const supaHeaders = {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  const supaRes = await fetch(SUPA_URL, {
    method: 'POST',
    headers: supaHeaders,
    body: JSON.stringify({
      nombre, telefono,
      email: email || null,
      tipo_vivienda: tipo_vivienda || null,
      valor_pesos: rango_uf || null,
      direccion: direccion || null,
      detalle_depto: detalle_depto || null,
      comuna: comuna || null,
      superficie: superficie ? parseInt(superficie) : null,
      dormitorios: dormitorios ? parseInt(dormitorios) : null,
      banos: banos ? parseInt(banos) : null,
      fuente: fuente || 'viviendas-form',
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null
    })
  });

  const saved = supaRes.ok;

  // 1b. Dual-write to CRM Supabase (viviendas table)
  const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co/rest/v1/viviendas';
  const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
  let viviendaId = null;
  try {
    const crmRes = await fetch(CRM_URL, {
      method: 'POST',
      headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({
        nombre, telefono,
        email: email || null,
        tipo_vivienda: tipo_vivienda || null,
        valor_pesos: rango_uf || null,
        direccion: direccion || null,
        detalle_depto: detalle_depto || null,
        comuna: comuna || null,
        superficie: superficie ? parseInt(superficie) : null,
        dormitorios: dormitorios || null,
        banos: banos || null,
        fuente: fuente || 'viviendas-form',
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        status: 'esperando_ok_propietario',
      }),
    });
    const crmData = await crmRes.json();
    if (Array.isArray(crmData) && crmData[0]) viviendaId = crmData[0].id;
  } catch(e) { /* ignore */ }

  // 2. Team notification email
  const now = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  const waPhone = (telefono || '').replace(/\D/g, '').replace(/^0/, '56');
  const rangoLabel = rango_uf ? rango_uf.replace('_', ' - ') + ' UF' : '—';


  const teamHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Nueva Vivienda</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:28px 16px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
  <tr><td style="background:linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%);padding:22px 32px">
    <p style="margin:0;color:rgba(255,255,255,0.65);font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase">Llave Oferta · Nueva Vivienda</p>
    <p style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700;line-height:1.2">${nombre}</p>
    <p style="margin:5px 0 0;color:rgba(255,255,255,0.6);font-size:12px">${now}</p>
  </td></tr>
  <tr><td style="padding:26px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      ${[
        ['📱 Teléfono', telefono || '—'],
        ['✉️ Email', email || '—'],
        ['🏠 Tipo', tipo_vivienda || '—'],
        ['💰 Rango valor', rangoLabel],
        ['📍 Dirección', direccion || '—'],
        ...(tipo_vivienda === 'departamento' && detalle_depto ? [['🏢 N° depto', detalle_depto]] : []),
        ['📌 Comuna', comuna || '—'],
        ['📐 Superficie', superficie ? superficie + ' m²' : '—'],
        ['🛏️ Dormitorios', dormitorios || '—'],
        ['🚿 Baños', banos || '—'],
        ['🔗 Fuente', fuente || '—'],
      ].map(([label, val]) => `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #f0ece4;color:#9a8878;font-size:12px;font-weight:600;width:42%">${label}</td>
        <td style="padding:9px 0;border-bottom:1px solid #f0ece4;color:#1B3A6B;font-size:13px;font-weight:700">${val}</td>
      </tr>`).join('')}
    </table>
    <div style="margin-top:22px;text-align:center">
      <a href="https://wa.me/${waPhone || '56957823672'}"
         style="display:inline-block;background:#25D366;color:#fff;padding:13px 30px;border-radius:50px;font-weight:800;font-size:14px;text-decoration:none;box-shadow:0 4px 14px rgba(37,211,102,0.3)">
        💬 Contactar por WhatsApp
      </a>
    </div>
  </td></tr>
  <tr><td style="padding:14px 32px;background:#fafaf8;border-top:1px solid #f0ece4">
    <p style="margin:0;font-size:11px;color:#bbb">Llave Oferta · <a href="https://www.llavepropia.cl/viviendas-form" style="color:#bbb">llavepropia.cl</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Llave Oferta <notificaciones@proppi.cl>',
      to: ['rodrigo.canas@llavepropia.cl'],
      bcc: ['vicente@llavepropia.cl'],
      subject: `🏠 Nueva vivienda: ${nombre} — ${tipo_vivienda || 'Propiedad'} en ${comuna || '?'}`,
      html: teamHtml
    })
  });

  // 3. Client confirmation email (only if they provided email)
  if (email) {
    const firstName = (nombre || '').trim().split(' ')[0] || nombre;
    const clientHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Recibimos tu vivienda</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:28px 16px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
  <tr><td style="background:#ffffff;padding:24px 32px;border-bottom:1px solid #f0ece4">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="display:block;height:auto;max-width:140px">
  </td></tr>
  <tr><td style="background:linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%);padding:24px 32px">
    <p style="margin:0;color:rgba(255,255,255,0.65);font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase">Llave Oferta</p>
    <p style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700">Recibimos tu vivienda</p>
  </td></tr>
  <tr><td style="padding:32px 32px 0">
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1B3A6B">Hola, ${firstName}!</p>
    <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.7">Hemos recibido los datos de tu ${tipo_vivienda || 'propiedad'} en <strong>${comuna || 'tu comuna'}</strong>. Tu vivienda ya fue ingresada a nuestra base de propiedades disponibles.</p>
    <div style="background:#FFF8EC;border:1.5px solid rgba(201,135,26,0.3);border-radius:12px;padding:18px 20px;margin:0 0 20px">
      <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#C9871A">¿Qué sigue?</p>
      <p style="margin:0;font-size:14px;color:#1B3A6B;line-height:1.7">Te contactaremos cuando tengamos compradores interesados en una vivienda con las características de la tuya. No tienes que hacer nada más por ahora.</p>
    </div>
    <div style="background:#E8F0FE;border:1.5px solid rgba(27,58,107,0.2);border-radius:12px;padding:18px 20px;margin:0 0 20px">
      <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#1B3A6B">💰 Comisión de venta</p>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.7">Nuestra comisión es de solo el <strong style="color:#C9871A">1% del valor de venta + IVA</strong>. Sin costos iniciales, solo cobramos al concretar la venta.</p>
    </div>
    <div style="background:#f8f7f4;border-radius:12px;padding:20px 24px;margin:0 0 20px">
      <p style="font-size:13px;font-weight:800;color:#1B3A6B;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px">Tu vivienda registrada</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1A150F">
        <tr><td style="padding:6px 0;border-bottom:1px solid #ece9e1;font-weight:700;color:#5A4A38;width:40%">Tipo</td><td style="padding:6px 0;border-bottom:1px solid #ece9e1">${tipo_vivienda || '—'}</td></tr>
        <tr><td style="padding:6px 0;border-bottom:1px solid #ece9e1;font-weight:700;color:#5A4A38">Rango valor</td><td style="padding:6px 0;border-bottom:1px solid #ece9e1">${rangoLabel}</td></tr>
        <tr><td style="padding:6px 0;border-bottom:1px solid #ece9e1;font-weight:700;color:#5A4A38">Dirección</td><td style="padding:6px 0;border-bottom:1px solid #ece9e1">${direccion || '—'}</td></tr>
        ${tipo_vivienda === 'departamento' && detalle_depto ? `<tr><td style="padding:6px 0;border-bottom:1px solid #ece9e1;font-weight:700;color:#5A4A38">N° depto</td><td style="padding:6px 0;border-bottom:1px solid #ece9e1">${detalle_depto}</td></tr>` : ''}
        <tr><td style="padding:6px 0;border-bottom:1px solid #ece9e1;font-weight:700;color:#5A4A38">Comuna</td><td style="padding:6px 0;border-bottom:1px solid #ece9e1">${comuna || '—'}</td></tr>
        <tr><td style="padding:6px 0;border-bottom:1px solid #ece9e1;font-weight:700;color:#5A4A38">Superficie</td><td style="padding:6px 0;border-bottom:1px solid #ece9e1">${superficie ? superficie + ' m²' : '—'}</td></tr>
        <tr><td style="padding:6px 0;border-bottom:1px solid #ece9e1;font-weight:700;color:#5A4A38">Dormitorios</td><td style="padding:6px 0;border-bottom:1px solid #ece9e1">${dormitorios || '—'}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;color:#5A4A38">Baños</td><td style="padding:6px 0">${banos || '—'}</td></tr>
      </table>
    </div>
  </td></tr>
  ${viviendaId ? `<tr><td style="padding:0 32px 8px">
    <div style="background:#E5F7F4;border:1.5px solid rgba(45,184,158,0.3);border-radius:12px;padding:20px 24px;text-align:center">
      <p style="margin:0 0 8px;font-size:15px;font-weight:800;color:#1B3A6B">📸 Sube fotos de tu propiedad</p>
      <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6">Las viviendas con fotos tienen <strong style="color:#C9871A">más de un 50% más de probabilidad</strong> de venderse. Sube fotos ahora y destaca tu propiedad.</p>
      <a href="https://www.llavepropia.cl/subir-fotos?id=${viviendaId}" target="_blank"
         style="display:inline-block;background:#C9871A;color:#fff;padding:14px 32px;border-radius:50px;font-weight:800;font-size:14px;text-decoration:none;box-shadow:0 4px 14px rgba(201,135,26,0.3)">
        📷 Subir fotos aquí
      </a>
    </div>
  </td></tr>` : ''}
  <tr><td style="padding:16px 32px 28px;text-align:center">
    <p style="margin:0 0 16px;font-size:14px;color:#555">¿Tienes dudas? Escríbenos por WhatsApp:</p>
    <a href="https://wa.me/56957823672" target="_blank"
       style="display:inline-block;background:#25D366;color:#fff;padding:14px 32px;border-radius:50px;font-weight:800;font-size:14px;text-decoration:none;box-shadow:0 4px 14px rgba(37,211,102,0.3)">
      💬 WhatsApp
    </a>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#fafaf8;border-top:1px solid #f0ece4">
    <p style="margin:0;font-size:11px;color:#bbb;text-align:center">Llave Oferta · una marca de <a href="https://www.llavepropia.cl" style="color:#bbb">Llave Propia</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Llave Oferta <notificaciones@proppi.cl>',
        to: [email],
        reply_to: ['rodrigo.canas@llavepropia.cl'],
        subject: 'Recibimos tu vivienda — Llave Oferta',
        html: clientHtml
      })
    }).catch(() => null);
  }

  return res.status(200).json({ saved, emailed: emailRes.ok });
}
