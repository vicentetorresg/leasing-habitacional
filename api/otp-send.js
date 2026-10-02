export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.llavepropia.cl');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co';
  const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const headers = { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json' };

  const { userId } = req.body || {};

  // CRM users that can receive OTP
  const CRM_USERS = {
    '0d83e7b6-31d0-44f0-b914-8d2f3b578779': { name: 'Rodrigo Cañas', email: 'rodrigo.canas@llavepropia.cl' },
    'f67c6cec-4af7-4876-aac2-bd23b974db66': { name: 'Vicente Torres', email: 'vicente.torres@llavepropia.cl' },
    '9f156deb-c219-4b51-b454-5a4692629332': { name: 'Comercial', email: 'comercial@llavepropia.cl' },
    '6608503b-3cc7-447a-9ffd-f8f94795cd50': { name: 'Karina Valenzuela', email: 'karina.valenzuela@llavepropia.cl' },
  };

  // Alianza Intermedina (legacy support)
  const ALIADO_RECIPIENTS = ['contacto@intermedina.cl'];
  const isAliado = !userId;

  // Determine recipients
  let toEmails;
  let bccEmails = ['vicente@llavepropia.cl'];
  let subjectPrefix;

  if (isAliado) {
    // Legacy: alianza-intermedina page (no userId)
    toEmails = ALIADO_RECIPIENTS;
    bccEmails = ['rodrigo.canas@llavepropia.cl', 'vicente@llavepropia.cl'];
    subjectPrefix = 'Convenio Intermedina';
  } else {
    const crmUser = CRM_USERS[userId];
    if (!crmUser) return res.status(400).json({ error: 'Usuario no valido' });
    toEmails = [crmUser.email];
    bccEmails = [];
    subjectPrefix = 'CRM Llave Propia';
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Invalidate old codes for this user/context
  await fetch(`${CRM_URL}/rest/v1/otp_codes?used=eq.false&email=eq.${userId || 'crm-login'}`, {
    method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ used: true }),
  });

  // Save new code
  await fetch(`${CRM_URL}/rest/v1/otp_codes`, {
    method: 'POST', headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ email: userId || 'crm-login', code, expires_at: expiresAt }),
  });

  const now = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });

  const emailPayload = {
    from: 'Llave Propia <notificaciones@proppi.cl>',
    to: toEmails,
    subject: `${code} — Código de acceso ${subjectPrefix}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="margin-bottom:24px">
      <h2 style="color:#1B3A6B;margin:0 0 8px">Código de acceso al CRM</h2>
      <p style="color:#555;font-size:14px;margin:0 0 24px">Solicitud de acceso · ${now}</p>
      <div style="background:#f8f7f4;border:2px solid #1B3A6B;border-radius:16px;padding:28px;text-align:center;margin:0 0 24px">
        <p style="font-size:42px;font-weight:900;letter-spacing:12px;color:#1B3A6B;margin:0;font-family:monospace">${code}</p>
      </div>
      <p style="color:#999;font-size:12px;margin:0">Este código expira en 5 minutos.</p>
    </div>`,
  };
  if (bccEmails.length > 0) emailPayload.bcc = bccEmails;

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(emailPayload),
  });

  if (!emailRes.ok) {
    const errBody = await emailRes.json().catch(() => ({}));
    console.error('Resend error:', errBody);
    return res.status(500).json({ error: 'Error enviando email', detail: errBody });
  }

  return res.status(200).json({ sent: true });
}
