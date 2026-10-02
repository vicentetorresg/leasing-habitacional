export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.llavepropia.cl');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { action, code, email: userEmail } = req.body || {};
  const SUPA = 'https://unptkiyggkuxtkzedluv.supabase.co/rest/v1';
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const headers = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' };

  if (action === 'request') {
    const ALLOWED = ['pia@llavepropia.cl', 'rodrigo@llavepropia.cl', 'vicente@llavepropia.cl'];
    if (!userEmail || !ALLOWED.includes(userEmail)) return res.status(400).json({ error: 'Email no autorizado' });

    const loginCode = Math.floor(100000 + Math.random() * 900000).toString();

    await fetch(SUPA + '/crm_login_codes', {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ code: loginCode, email: userEmail })
    });

    // Send code ONLY to the requesting user
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Llave Propia <notificaciones@proppi.cl>',
        to: [userEmail],
        subject: 'Código de acceso CRM Hipotecarios — ' + ({
          'pia@llavepropia.cl':'Pía','rodrigo@llavepropia.cl':'Rodrigo','vicente@llavepropia.cl':'Vicente'
        }[userEmail] || userEmail.split('@')[0]) + ' — ' + loginCode,
        html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:40px 20px;text-align:center">
          <h2 style="color:#1B3A6B;margin-bottom:8px">CRM Hipotecarios</h2>
          <p style="color:#666;margin-bottom:24px">Tu código de acceso temporal:</p>
          <div style="background:#f1f5f9;border-radius:12px;padding:24px;margin-bottom:24px">
            <p style="font-size:36px;font-weight:900;letter-spacing:8px;color:#1B3A6B;margin:0">${loginCode}</p>
          </div>
          <p style="color:#999;font-size:13px">Este código expira en 5 minutos.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#bbb;font-size:11px">Llave Propia &middot; llavepropia.cl</p>
        </div>`
      })
    });

    return res.status(200).json({ sent: true });
  }

  if (action === 'verify') {
    if (!code || code.length !== 6) return res.status(400).json({ error: 'Codigo invalido' });

    // Check code exists and is not expired (5 min)
    const r = await fetch(SUPA + '/crm_login_codes?code=eq.' + code + '&used=eq.false&order=created_at.desc&limit=1', { headers });
    const rows = await r.json();

    if (!rows.length) return res.status(401).json({ error: 'Codigo invalido o expirado' });

    const created = new Date(rows[0].created_at);
    const now = new Date();
    const diffMin = (now - created) / 60000;

    if (diffMin > 5) return res.status(401).json({ error: 'Codigo expirado' });

    // Mark as used
    await fetch(SUPA + '/crm_login_codes?id=eq.' + rows[0].id, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ used: true })
    });

    // Notify admins on every login
    const loginEmail = rows[0].email;
    const USER_NAMES = { 'pia@llavepropia.cl': 'Pía', 'rodrigo@llavepropia.cl': 'Rodrigo', 'vicente@llavepropia.cl': 'Vicente' };
    const loginName = USER_NAMES[loginEmail] || loginEmail;
    const loginNow = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Llave Propia <notificaciones@proppi.cl>',
        to: ['vicente@llavepropia.cl', 'rodrigo.canas@llavepropia.cl'],
        subject: `CRM Hipotecarios: ${loginName} acaba de ingresar`,
        html: `<p><strong>${loginName}</strong> (${loginEmail}) acaba de iniciar sesión en el CRM Hipotecarios.</p><p>Hora: ${loginNow}</p>`,
      })
    }).catch(() => {});

    return res.status(200).json({ valid: true, email: loginEmail });
  }

  return res.status(400).json({ error: 'Action invalida' });
}
