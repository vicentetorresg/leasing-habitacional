export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.llavepropia.cl');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const RESEND_KEY = 're_fFtYwjwm_3YXpMdCWAgcnncKW48RTXSHa';
  const CC_EMAILS = ['rodrigo.canas@llavepropia.cl', 'karina.valenzuela@llavepropia.cl', 'vicente@llavepropia.cl'];
  const REPLY_TO = ['rodrigo.canas@llavepropia.cl', 'karina.valenzuela@llavepropia.cl', 'vicente@llavepropia.cl'];

  const { leads } = req.body || {};
  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'No leads provided' });
  }

  // Filter only leads with email
  const withEmail = leads.filter(l => l.email);
  if (withEmail.length === 0) {
    return res.status(400).json({ error: 'Ninguno de los leads tiene email' });
  }

  let sent = 0;
  let failed = 0;

  for (const lead of withEmail) {
    const firstName = (lead.name || '').trim().split(' ')[0] || lead.name || 'Cliente';

    const html = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#FEFCF7;border-radius:16px;overflow:hidden;border:1px solid #EDE3D4">
  <div style="background:linear-gradient(135deg,#1B3A6B,#243870);padding:28px 28px;text-align:center">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="display:inline-block;height:auto;max-width:140px">
  </div>
  <div style="padding:32px 28px">
    <p style="font-size:20px;font-weight:700;color:#1B3A6B;margin:0 0 16px">Hola ${firstName}!</p>
    <p style="font-size:15px;color:#1A150F;line-height:1.7;margin:0 0 20px">
      Te escribimos porque aun no hemos recibido toda tu documentacion para poder enviar tu caso a evaluacion con las entidades financieras.
    </p>
    <p style="font-size:15px;color:#1A150F;line-height:1.7;margin:0 0 20px">
      <strong>Mientras antes la envies, antes podremos darte una respuesta.</strong> Recuerda que los tiempos de evaluacion dependen de que tengamos todo completo.
    </p>

    <div style="background:#fff;border:1.5px solid #EDE3D4;border-radius:12px;padding:20px 24px;margin:0 0 20px">
      <p style="font-size:13px;font-weight:800;color:#1B3A6B;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.5px">Documentos que necesitamos</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td width="32" valign="middle" style="padding:0 0 10px 0"><div style="background:#2DB89E;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:800">1</div></td><td valign="middle" style="padding:0 0 10px 8px;font-size:14px;color:#1A150F">Cedula de identidad por ambos lados</td></tr>
        <tr><td width="32" valign="middle" style="padding:0 0 10px 0"><div style="background:#2DB89E;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:800">2</div></td><td valign="middle" style="padding:0 0 10px 8px;font-size:14px;color:#1A150F">6 ultimas liquidaciones de sueldo</td></tr>
        <tr><td width="32" valign="middle" style="padding:0 0 10px 0"><div style="background:#2DB89E;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:800">3</div></td><td valign="middle" style="padding:0 0 10px 8px;font-size:14px;color:#1A150F">Cotizaciones AFP ultimo anio</td></tr>
        <tr><td width="32" valign="middle" style="padding:0 0 10px 0"><div style="background:#2DB89E;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:800">4</div></td><td valign="middle" style="padding:0 0 10px 8px;font-size:14px;color:#1A150F">Contrato de trabajo con antiguedad</td></tr>
        <tr><td width="32" valign="middle" style="padding:0 0 10px 0"><div style="background:#2DB89E;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:800">5</div></td><td valign="middle" style="padding:0 0 10px 8px;font-size:14px;color:#1A150F">Deuda CMF (se obtiene gratuita)</td></tr>
        <tr><td width="32" valign="middle" style="padding:0 0 0 0"><div style="background:#2DB89E;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:800">6</div></td><td valign="middle" style="padding:0 0 0 8px;font-size:14px;color:#1A150F">Certificado de matrimonio o no matrimonio</td></tr>
      </table>
    </div>

    <div style="background:#E5F7F4;border:1px solid rgba(45,184,158,0.3);border-radius:10px;padding:14px 18px;margin:0 0 24px">
      <p style="font-size:13px;color:#1B3A6B;margin:0;line-height:1.6"><strong>Si complementas renta con otra persona</strong>, necesitamos los mismos documentos de ella.</p>
    </div>

    <div style="background:#E5F7F4;border:1.5px solid rgba(45,184,158,0.3);border-radius:12px;padding:16px 20px;margin:0 0 20px;text-align:center">
      <p style="font-size:14px;font-weight:700;color:#1B3A6B;margin:0">Envía tus documentos a <a href="mailto:contacto@llavepropia.cl" style="color:#2DB89E;text-decoration:none;font-weight:800">contacto@llavepropia.cl</a> para iniciar evaluación.</p>
    </div>

    <p style="font-size:15px;color:#1A150F;line-height:1.7;margin:0 0 20px">
      También puedes enviarlos <strong>respondiendo este correo</strong> o por WhatsApp:
    </p>

    <div style="text-align:center;margin:0 0 24px">
      <a href="https://wa.me/56962078510" target="_blank" style="display:inline-block;background:#25D366;color:#fff;font-size:16px;font-weight:800;padding:14px 36px;border-radius:12px;text-decoration:none">WhatsApp</a>
    </div>
  </div>
  <div style="background:#F7F0E6;padding:18px 28px;text-align:center;border-top:1px solid #EDE3D4">
    <p style="font-size:13px;color:#9A8878;margin:0;line-height:1.6">Saludos,<br><strong style="color:#1B3A6B">Equipo Llave Propia</strong></p>
  </div>
</div>`;

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Llave Propia <notificaciones@llavepropia.cl>',
          to: [lead.email],
          cc: CC_EMAILS,
          reply_to: REPLY_TO,
          subject: 'Recordatorio: Enviar documentacion pendiente - Llave Propia',
          html,
        }),
      });
      if (r.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return res.status(200).json({ sent, failed, total: withEmail.length });
}
