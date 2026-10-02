import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'lp-crm-session-2026';

function createSessionToken(userId, email, role, fullName) {
  const payload = {
    userId, email, role, fullName,
    exp: Date.now() + 48 * 60 * 60 * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.llavepropia.cl');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { code, userId } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Codigo requerido' });

  const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co';
  const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
  const headers = { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json' };

  // Find valid OTP — match by code and optionally by userId context
  const emailFilter = userId || 'crm-login';
  const otpR = await fetch(
    `${CRM_URL}/rest/v1/otp_codes?code=eq.${code}&used=eq.false&email=eq.${emailFilter}&expires_at=gte.${new Date().toISOString()}&order=created_at.desc&limit=1`,
    { headers }
  );
  const otps = await otpR.json();
  if (!otps || otps.length === 0) {
    return res.status(401).json({ error: 'Codigo invalido o expirado' });
  }

  // Mark as used
  await fetch(`${CRM_URL}/rest/v1/otp_codes?id=eq.${otps[0].id}`, {
    method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ used: true }),
  });

  // Determine which user to authenticate
  const targetUserId = userId || 'c581981b-30a1-41a6-9eba-1e7b57b2afad'; // default: aliado intermedina

  // Get role
  const roleR = await fetch(`${CRM_URL}/rest/v1/user_roles?user_id=eq.${targetUserId}&select=role`, { headers });
  const roles = await roleR.json();
  const userRoles = (roles || []).map(r => r.role);
  const role = userRoles.includes('admin') ? 'admin' : userRoles[0] || 'aliado';

  // Get profile
  const profR = await fetch(`${CRM_URL}/rest/v1/profiles?user_id=eq.${targetUserId}&select=full_name`, { headers });
  const profs = await profR.json();
  const fullName = profs?.[0]?.full_name || 'Usuario';

  // Get email from auth
  const authR = await fetch(`${CRM_URL}/auth/v1/admin/users/${targetUserId}`, {
    headers: { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}` },
  });
  const authUser = await authR.json();
  const email = authUser?.email || '';

  const token = createSessionToken(targetUserId, email, role, fullName);

  // Notify admins on every login
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const now = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Llave Propia <notificaciones@proppi.cl>',
      to: ['vicente@llavepropia.cl', 'rodrigo.canas@llavepropia.cl'],
      subject: `CRM: ${fullName} acaba de ingresar`,
      html: `<p><strong>${fullName}</strong> (${email}) acaba de iniciar sesión en el CRM de Llave Propia.</p><p>Hora: ${now}</p>`,
    }),
  }).catch(() => {});

  return res.status(200).json({
    token,
    user: { id: targetUserId, email, role, fullName },
  });
}
