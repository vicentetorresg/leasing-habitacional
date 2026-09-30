import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'lp-crm-session-2026';

function createSessionToken(userId, email, role, fullName) {
  const payload = {
    userId, email, role, fullName,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 1 day
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifySessionToken(token) {
  try {
    const [data, sig] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.llavepropia.cl');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ error: 'Email y codigo requeridos' });

  const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co';
  const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
  const headers = { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json' };

  // Find valid OTP
  const otpR = await fetch(
    `${CRM_URL}/rest/v1/otp_codes?email=eq.${encodeURIComponent(email)}&code=eq.${code}&used=eq.false&expires_at=gte.${new Date().toISOString()}&order=created_at.desc&limit=1`,
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

  // Get user info
  const authR = await fetch(`${CRM_URL}/auth/v1/admin/users?per_page=100`, {
    headers: { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}` },
  });
  const authData = await authR.json();
  const authUser = (authData.users || []).find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!authUser) return res.status(401).json({ error: 'Usuario no encontrado' });

  // Get role
  const roleR = await fetch(`${CRM_URL}/rest/v1/user_roles?user_id=eq.${authUser.id}&select=role`, { headers });
  const roles = await roleR.json();
  const role = (roles || []).find(r => r.role === 'admin')?.role || roles?.[0]?.role || 'ejecutiva';

  // Get profile
  const profR = await fetch(`${CRM_URL}/rest/v1/profiles?user_id=eq.${authUser.id}&select=full_name`, { headers });
  const profs = await profR.json();
  const fullName = profs?.[0]?.full_name || '';

  // Create session token
  const token = createSessionToken(authUser.id, email, role, fullName);

  return res.status(200).json({ token, user: { id: authUser.id, email, role, fullName } });
}
