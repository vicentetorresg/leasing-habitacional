export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { form } = req.body || {};
  const RESEND_KEY = process.env.RESEND_API_KEY;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Llave Propia <notificaciones@llavepropia.cl>',
        to: ['vicente@llavepropia.cl'],
        subject: 'Click en WhatsApp docs - Landing Leasing',
        html: `<p>Alguien hizo click en el boton de WhatsApp para enviar documentos desde la landing de leasing.</p><p><strong>Formulario:</strong> ${form || 'desconocido'}</p><p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</p>`
      })
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
