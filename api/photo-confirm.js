export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { vivienda_id, photo_count } = req.body || {};
  if (!vivienda_id) return res.status(400).json({ error: 'Falta vivienda_id' });

  const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  // Get vivienda info
  const vivRes = await fetch(`https://evuxdhvvarfxredghvpu.supabase.co/rest/v1/viviendas?id=eq.${vivienda_id}&select=nombre,email,tipo_vivienda,comuna`, {
    headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY }
  });
  const vivData = await vivRes.json();
  if (!vivData || !vivData.length) return res.status(404).json({ error: 'Vivienda no encontrada' });

  const viv = vivData[0];
  if (!viv.email) return res.status(200).json({ ok: true, skipped: 'no email' });

  const firstName = (viv.nombre || '').trim().split(' ')[0] || viv.nombre;
  const tipoLabel = viv.tipo_vivienda === 'departamento' ? 'departamento' : 'casa';

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Fotos recibidas</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:28px 16px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
  <tr><td style="background:#ffffff;padding:24px 32px;border-bottom:1px solid #f0ece4">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="display:block;height:auto;max-width:140px">
  </td></tr>
  <tr><td style="background:linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%);padding:24px 32px">
    <p style="margin:0;color:rgba(255,255,255,0.65);font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase">Llave Oferta</p>
    <p style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700">Recibimos tus fotos</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1B3A6B">Hola, ${firstName}!</p>
    <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.7">Hemos recibido correctamente <strong>${photo_count || ''} foto${(photo_count || 0) > 1 ? 's' : ''}</strong> de tu ${tipoLabel} en <strong>${viv.comuna || 'tu comuna'}</strong>.</p>
    <div style="background:#ECFDF5;border:1.5px solid rgba(37,211,102,0.3);border-radius:12px;padding:18px 20px;margin:0 0 20px">
      <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#059669">Excelente!</p>
      <p style="margin:0;font-size:14px;color:#1B3A6B;line-height:1.7">Con estas fotos tu propiedad sera mucho mas atractiva para nuestros compradores interesados. Te contactaremos cuando haya novedades.</p>
    </div>
    <div style="text-align:center;margin-top:20px">
      <a href="https://www.llavepropia.cl/subir-fotos?id=${vivienda_id}"
         style="display:inline-block;background:#C9871A;color:#fff;padding:14px 32px;border-radius:50px;font-weight:800;font-size:14px;text-decoration:none;box-shadow:0 4px 14px rgba(201,135,26,0.3)">
        Agregar mas fotos
      </a>
    </div>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#fafaf8;border-top:1px solid #f0ece4">
    <p style="margin:0;font-size:11px;color:#bbb;text-align:center">Llave Oferta &middot; <a href="https://www.llavepropia.cl" style="color:#bbb">llavepropia.cl</a></p>
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
      to: [viv.email],
      reply_to: ['vicente@llavepropia.cl', 'rodrigo.canas@llavepropia.cl'],
      subject: 'Recibimos tus fotos — Llave Oferta',
      html
    })
  }).catch(() => null);

  // Notify team
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Llave Oferta <notificaciones@proppi.cl>',
      to: ['rodrigo.canas@llavepropia.cl'],
      bcc: ['vicente@llavepropia.cl'],
      subject: `Fotos subidas: ${viv.nombre} — ${tipoLabel} en ${viv.comuna || '?'} (${photo_count} fotos)`,
      html: `<p><strong>${viv.nombre}</strong> subio <strong>${photo_count} foto(s)</strong> de su ${tipoLabel} en ${viv.comuna || '?'}.</p><p><a href="https://www.llavepropia.cl/crm/viviendas">Ver en CRM</a></p>`
    })
  }).catch(() => null);

  return res.status(200).json({ ok: true });
}
