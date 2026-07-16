export default async function handler(req, res) {
  // Cron endpoint: GET /api/vivienda-mailing
  // Sends follow-up emails to property owners every 2 days
  // for viviendas in "esperando_ok_propietario" or "esperando_fotos_tasacion"

  const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co';
  const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  if (!CRM_KEY || !RESEND_KEY) return res.status(500).json({ error: 'Missing env vars' });

  // Fetch viviendas in target statuses
  const vivRes = await fetch(
    `${CRM_URL}/rest/v1/viviendas?status=in.(esperando_ok_propietario,esperando_fotos_tasacion)&select=id,nombre,email,tipo_vivienda,comuna,direccion,status,last_mailing_at,photo_count,created_at`,
    { headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY } }
  );
  const viviendas = await vivRes.json();
  if (!Array.isArray(viviendas)) return res.status(200).json({ sent: 0, error: 'bad response' });

  const now = new Date();
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  let sent = 0;
  const results = [];

  for (const viv of viviendas) {
    // Skip if no email
    if (!viv.email) { results.push({ id: viv.id, skipped: 'no email' }); continue; }

    // Check if 2 days have passed since last mailing (or since creation if never mailed)
    const lastDate = viv.last_mailing_at ? new Date(viv.last_mailing_at) : new Date(viv.created_at);
    const elapsed = now - lastDate;
    if (elapsed < TWO_DAYS_MS) { results.push({ id: viv.id, skipped: 'too recent', hours_ago: Math.round(elapsed / 3600000) }); continue; }

    const firstName = (viv.nombre || '').trim().split(' ')[0] || viv.nombre;
    const tipoLabel = viv.tipo_vivienda === 'departamento' ? 'departamento' : 'casa';
    const uploadUrl = `https://www.llavepropia.cl/subir-fotos?id=${viv.id}`;

    // Pick email variant based on sequence number
    const daysSinceCreation = Math.floor((now - new Date(viv.created_at)) / (24 * 60 * 60 * 1000));
    const sequenceNum = Math.floor(daysSinceCreation / 2); // 0, 1, 2, 3...

    let subject, mainText, ctaText;

    if (sequenceNum <= 1) {
      // First emails: encourage photos
      subject = `${firstName}, tenemos compradores buscando propiedades como la tuya`;
      mainText = `Tenemos <strong>clientes activamente buscando</strong> propiedades similares a tu ${tipoLabel} en <strong>${viv.comuna || 'tu zona'}</strong>. Las propiedades con fotos se venden hasta <strong>3 veces mas rapido</strong>.`;
      ctaText = 'Subir fotos de mi propiedad';
    } else if (sequenceNum <= 3) {
      // Middle emails: urgency
      subject = `Hay interes en propiedades en ${viv.comuna || 'tu zona'} — sube fotos`;
      mainText = `Seguimos recibiendo consultas de compradores interesados en ${viv.comuna || 'tu zona'}. Tu ${tipoLabel} podria ser justo lo que buscan, pero <strong>necesitamos fotos para mostrarla</strong>.`;
      ctaText = 'Subir fotos ahora';
    } else {
      // Later emails: last chance
      subject = `Ultima oportunidad: compradores listos en ${viv.comuna || 'tu zona'}`;
      mainText = `${firstName}, no queremos que pierdas esta oportunidad. Hay compradores <strong>pre-aprobados</strong> buscando propiedades en <strong>${viv.comuna || 'tu zona'}</strong>. Solo necesitamos fotos de tu ${tipoLabel} para conectarlos contigo.`;
      ctaText = 'Subir fotos y activar mi propiedad';
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Llave Oferta</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:28px 16px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
  <tr><td style="background:#ffffff;padding:24px 32px;border-bottom:1px solid #f0ece4">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="display:block;height:auto;max-width:140px">
  </td></tr>
  <tr><td style="background:linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%);padding:24px 32px">
    <p style="margin:0;color:rgba(255,255,255,0.65);font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase">Llave Oferta</p>
    <p style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700">Tenemos compradores interesados</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1B3A6B">Hola, ${firstName}!</p>
    <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7">${mainText}</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${uploadUrl}"
         style="display:inline-block;background:#C9871A;color:#fff;padding:16px 36px;border-radius:50px;font-weight:800;font-size:15px;text-decoration:none;box-shadow:0 4px 16px rgba(201,135,26,0.3)">
        ${ctaText}
      </a>
    </div>
    <div style="background:#f8f7f4;border-radius:12px;padding:18px 22px;margin-top:20px">
      <p style="margin:0 0 8px;font-size:13px;font-weight:800;color:#1B3A6B">Tu propiedad registrada:</p>
      <p style="margin:0;font-size:14px;color:#555">${tipoLabel === 'departamento' ? 'Departamento' : 'Casa'} en ${viv.comuna || '—'}${viv.direccion ? ' — ' + viv.direccion : ''}</p>
    </div>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#fafaf8;border-top:1px solid #f0ece4">
    <p style="margin:0;font-size:11px;color:#bbb;text-align:center">Llave Oferta &middot; <a href="https://www.llavepropia.cl" style="color:#bbb">llavepropia.cl</a></p>
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
        to: [viv.email],
        reply_to: ['rodrigo.canas@llavepropia.cl'],
        subject,
        html
      })
    });

    if (emailRes.ok) {
      sent++;
      // Update last_mailing_at
      await fetch(`${CRM_URL}/rest/v1/viviendas?id=eq.${viv.id}`, {
        method: 'PATCH',
        headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ last_mailing_at: now.toISOString() })
      });
      results.push({ id: viv.id, sent: true, subject });
    } else {
      results.push({ id: viv.id, error: 'email failed' });
    }
  }

  return res.status(200).json({ total: viviendas.length, sent, results });
}
