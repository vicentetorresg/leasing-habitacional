export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.llavepropia.cl');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { lead_name, lead_email, tipo_vivienda, direccion, detalle_depto, comuna, superficie, dormitorios, banos, valor_pesos } = req.body || {};
  if (!lead_email || !lead_name) return res.status(400).json({ error: 'Faltan campos' });

  const RESEND_KEY = process.env.RESEND_API_KEY;

  const firstName = (lead_name || '').trim().split(' ')[0] || lead_name;
  const tipo = tipo_vivienda === 'departamento' ? 'Departamento' : tipo_vivienda === 'casa' ? 'Casa' : 'Propiedad';

  const UF_LABELS = {
    '0_800': 'Menos de 800 UF',
    '800_1000': '800 - 1.000 UF',
    '1000_1200': '1.000 - 1.200 UF',
    '1200_1400': '1.200 - 1.400 UF',
    '1400_1600': '1.400 - 1.600 UF',
    '1600_1800': '1.600 - 1.800 UF',
    '1800_2000': '1.800 - 2.000 UF',
  };
  const valorLabel = valor_pesos ? (UF_LABELS[valor_pesos] || valor_pesos) : null;

  const rows = [
    ['Tipo', tipo],
    direccion ? ['Dirección', direccion + (detalle_depto ? `, Depto ${detalle_depto}` : '')] : null,
    comuna ? ['Comuna', comuna] : null,
    superficie ? ['Superficie', `${superficie} m²`] : null,
    dormitorios ? ['Dormitorios', dormitorios] : null,
    banos ? ['Baños', banos] : null,
    valorLabel ? ['Rango valor', valorLabel] : null,
  ].filter(Boolean);

  const tableRows = rows.map(([label, val]) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0ece4;color:#8a7a6a;font-size:13px;font-weight:600;width:40%">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0ece4;color:#1B3A6B;font-size:14px;font-weight:700">${val}</td>
    </tr>`).join('');

  const ubicacion = comuna || 'tu zona';

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Encontramos una propiedad para ti</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:28px 16px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
  <tr><td style="background:#ffffff;padding:24px 32px;border-bottom:1px solid #f0ece4">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="display:block;height:auto;max-width:140px">
  </td></tr>
  <tr><td style="background:linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%);padding:24px 32px">
    <p style="margin:0;color:rgba(255,255,255,0.65);font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase">Llave Oferta</p>
    <p style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700;line-height:1.3">Encontramos una propiedad para ti</p>
  </td></tr>
  <tr><td style="padding:32px 32px 0">
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1B3A6B">Hola, ${firstName}!</p>
    <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.7">
      Tenemos buenas noticias. Encontramos un <strong>${tipo.toLowerCase()}</strong> en <strong>${ubicacion}</strong> que se ajusta a lo que buscas para tu <strong>leasing habitacional</strong>.
    </p>

    <div style="background:#f8f7f4;border-radius:12px;padding:20px 24px;margin:0 0 20px">
      <p style="font-size:13px;font-weight:800;color:#1B3A6B;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px">Detalles de la propiedad</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${tableRows}
      </table>
    </div>

    <div style="background:#FFF8EC;border:1.5px solid rgba(201,135,26,0.3);border-radius:12px;padding:18px 20px;margin:0 0 20px">
      <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#C9871A">¿Qué sigue?</p>
      <p style="margin:0;font-size:14px;color:#1B3A6B;line-height:1.7">Si te interesa, agenda una visita con nosotros. Te acompañamos en todo el proceso de leasing habitacional, desde la evaluación hasta la firma.</p>
    </div>

  </td></tr>
  <tr><td style="padding:0 32px 28px;text-align:center">
    <p style="margin:0 0 16px;font-size:14px;color:#555">¿Te interesa? Escríbenos por WhatsApp:</p>
    <a href="https://wa.me/56957823672?text=Hola%2C%20me%20interesa%20la%20propiedad%20en%20${encodeURIComponent(ubicacion)}" target="_blank"
       style="display:inline-block;background:#25D366;color:#fff;padding:14px 32px;border-radius:50px;font-weight:800;font-size:14px;text-decoration:none;box-shadow:0 4px 14px rgba(37,211,102,0.3)">
      WhatsApp
    </a>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#fafaf8;border-top:1px solid #f0ece4">
    <p style="margin:0;font-size:11px;color:#bbb;text-align:center">Llave Oferta &middot; una marca de <a href="https://www.llavepropia.cl" style="color:#bbb">Llave Propia</a></p>
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
      to: [lead_email],
      cc: ['rodrigo.canas@llavepropia.cl'],
      reply_to: ['contacto@llavepropia.cl'],
      subject: `${firstName}, encontramos un ${tipo.toLowerCase()} en ${ubicacion} para ti`,
      html,
    }),
  });

  const result = await emailRes.json();
  if (!emailRes.ok) return res.status(500).json({ error: result });
  return res.status(200).json({ sent: true, id: result.id });
}
