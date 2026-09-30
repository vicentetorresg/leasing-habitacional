export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.llavepropia.cl');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co';
  const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const headers = { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json' };

  // Check user exists in user_roles
  const rolesR = await fetch(`${CRM_URL}/rest/v1/profiles?select=user_id,full_name&order=created_at.desc`, { headers });
  const profiles = await rolesR.json();

  // Get auth users emails via profiles + auth mapping
  const userRolesR = await fetch(`${CRM_URL}/rest/v1/user_roles?select=user_id,role`, { headers });
  const userRoles = await userRolesR.json();
  const allowedUserIds = new Set((userRoles || []).map(r => r.user_id));

  // Check email exists in auth.users
  const authR = await fetch(`${CRM_URL}/auth/v1/admin/users?per_page=100`, {
    headers: { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}` },
  });
  const authData = await authR.json();
  const authUser = (authData.users || []).find(u => u.email?.toLowerCase() === email.toLowerCase() && allowedUserIds.has(u.id));

  if (!authUser) return res.status(200).json({ sent: true }); // Don't reveal if email exists

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Invalidate old codes
  await fetch(`${CRM_URL}/rest/v1/otp_codes?email=eq.${encodeURIComponent(email)}&used=eq.false`, {
    method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ used: true }),
  });

  // Save new code
  await fetch(`${CRM_URL}/rest/v1/otp_codes`, {
    method: 'POST', headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ email, code, expires_at: expiresAt }),
  });

  // Get profile name
  const profile = (profiles || []).find(p => p.user_id === authUser.id);
  const name = profile?.full_name || email;

  // Send email
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Llave Propia <notificaciones@llavepropia.cl>',
      to: ['contacto@intermedina.cl'],
      bcc: ['rodrigo.canas@llavepropia.cl', 'vicente@llavepropia.cl'],
      subject: `${code} — Codigo de acceso CRM Llave Propia`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="margin-bottom:24px">
        <h2 style="color:#1B3A6B;margin:0 0 8px">Codigo de acceso</h2>
        <p style="color:#555;font-size:14px;margin:0 0 24px">Se solicito acceso al CRM para <strong>${name}</strong> (${email})</p>
        <div style="background:#f8f7f4;border:2px solid #1B3A6B;border-radius:16px;padding:28px;text-align:center;margin:0 0 24px">
          <p style="font-size:42px;font-weight:900;letter-spacing:12px;color:#1B3A6B;margin:0;font-family:monospace">${code}</p>
        </div>
        <p style="color:#999;font-size:12px;margin:0">Este codigo expira en 5 minutos. Si no solicitaste acceso, ignora este correo.</p>
      </div>`,
    }),
  });

  return res.status(200).json({ sent: true });
}
