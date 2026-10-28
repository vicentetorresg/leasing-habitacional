module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, field } = req.body || {};
  if (!email || !field) return res.status(400).json({ error: 'Missing email or field' });

  const allowed = ['acepto_monto', 'click_whatsapp'];
  if (!allowed.includes(field)) return res.status(400).json({ error: 'Invalid field' });

  const SUPA_URL = 'https://unptkiyggkuxtkzedluv.supabase.co/rest/v1/leasing_leads';
  const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co/rest/v1/leads';
  const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;

  const headers = (key) => ({
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  });

  const body = JSON.stringify({ [field]: true });
  const emailEnc = encodeURIComponent(email.trim().toLowerCase());

  // Update both tables in parallel
  await Promise.allSettled([
    fetch(`${SUPA_URL}?email=eq.${emailEnc}&order=created_at.desc&limit=1`, {
      method: 'PATCH', headers: headers(SUPA_KEY), body
    }),
    CRM_KEY ? fetch(`${CRM_URL}?email=eq.${emailEnc}&order=created_at.desc&limit=1`, {
      method: 'PATCH', headers: headers(CRM_KEY), body
    }) : Promise.resolve()
  ]);

  return res.status(200).json({ ok: true });
};
