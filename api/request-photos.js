export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.llavepropia.cl');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { vivienda_id } = req.body || {};
  if (!vivienda_id) return res.status(400).json({ error: 'Missing vivienda_id' });

  const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co';
  const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  // Fetch vivienda info
  const vivRes = await fetch(
    `${CRM_URL}/rest/v1/viviendas?id=eq.${vivienda_id}&select=id,nombre,email,tipo_vivienda,comuna,direccion`,
    { headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY } }
  );
  const data = await vivRes.json();
  if (!Array.isArray(data) || !data.length) return res.status(404).json({ error: 'Vivienda not found' });

  const viv = data[0];
  if (!viv.email) return res.status(200).json({ sent: false, reason: 'no email' });

  const firstName = (viv.nombre || '').trim().split(' ')[0] || viv.nombre;
  const tipoLabel = viv.tipo_vivienda === 'departamento' ? 'departamento' : 'casa';
  const uploadUrl = `https://www.llavepropia.cl/subir-fotos?id=${viv.id}`;

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
    <p style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700">Alguien quiere ver tu propiedad</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1B3A6B">Hola, ${firstName}!</p>
    <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7">Un posible comprador vio tu ${tipoLabel} en <strong>${viv.comuna || 'tu zona'}</strong> en nuestro marketplace y <strong>quiere ver fotos</strong>. Las propiedades con fotos tienen mas de un 50% de probabilidad de venderse.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${uploadUrl}"
         style="display:inline-block;background:#C9871A;color:#fff;padding:16px 36px;border-radius:50px;font-weight:800;font-size:15px;text-decoration:none;box-shadow:0 4px 16px rgba(201,135,26,0.3)">
        Subir fotos ahora
      </a>
    </div>
    <div style="background:#f8f7f4;border-radius:12px;padding:18px 22px;margin-top:20px">
      <p style="margin:0 0 8px;font-size:13px;font-weight:800;color:#1B3A6B">Tu propiedad:</p>
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
      bcc: ['vicente@llavepropia.cl', 'rodrigo.canas@llavepropia.cl'],
      reply_to: ['vicente@llavepropia.cl', 'rodrigo.canas@llavepropia.cl'],
      subject: `${firstName}, alguien quiere ver fotos de tu ${tipoLabel}`,
      html
    })
  });

  return res.status(200).json({ sent: emailRes.ok });
}
