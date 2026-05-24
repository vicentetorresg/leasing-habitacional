export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.llavepropia.cl');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { nombre, telefono, email, arriendo, renta, dicom, contrato, fuente } = req.body || {};
  if (!nombre || !telefono) return res.status(400).json({ error: 'Faltan campos' });

  const SUPA_URL = 'https://unptkiyggkuxtkzedluv.supabase.co/rest/v1/leasing_leads';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVucHRraXlnZ2t1eHRremVkbHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTMxMTU1OCwiZXhwIjoyMDk0ODg3NTU4fQ.vx78MEuZFpc57IC9I36rmLHUvi8XbWAs3nk-HiQca4E';
  const RESEND_KEY = 're_fFtYwjwm_3YXpMdCWAgcnncKW48RTXSHa';

  // 1. Save to Supabase — try with contrato, fallback without
  const supaHeaders = {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  let saved = false;
  // Try with contrato column
  if (contrato) {
    const r = await fetch(SUPA_URL, {
      method: 'POST', headers: supaHeaders,
      body: JSON.stringify({ nombre, telefono, email, arriendo, renta, dicom, contrato, fuente })
    });
    if (r.ok) { saved = true; }
  }
  // Fallback without contrato (column may not exist yet)
  if (!saved) {
    const r = await fetch(SUPA_URL, {
      method: 'POST', headers: supaHeaders,
      body: JSON.stringify({ nombre, telefono, email, arriendo, renta, dicom, fuente })
    });
    saved = r.ok;
  }

  // 2. Notification email to team
  const contratoLabel = contrato === 'si' ? '✅ Sí' : contrato === 'no' ? '❌ No' : '—';
  const dicomLabel    = dicom === 'si' ? '❌ Sí (en DICOM)' : dicom === 'no' ? '✅ No' : '—';
  const now = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  const producto = (fuente || '').toLowerCase().includes('mutuo') ? 'Mutuo Hipotecario' : 'Leasing DS120';
  const waPhone = (telefono || '').replace(/\D/g, '').replace(/^0/, '56');

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Nuevo Lead</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:28px 16px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
  <tr><td style="background:linear-gradient(135deg,#1B3A6B 0%,#2DB89E 100%);padding:22px 32px">
    <p style="margin:0;color:rgba(255,255,255,0.65);font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase">Llave Propia · Nuevo Lead</p>
    <p style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700;line-height:1.2">${nombre}</p>
    <p style="margin:5px 0 0;color:rgba(255,255,255,0.6);font-size:12px">${producto} · ${now}</p>
  </td></tr>
  <tr><td style="padding:26px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      ${[
        ['📱 WhatsApp',             telefono || '—'],
        ['✉️ Email',                email    || '—'],
        ['💰 Renta mensual',        renta    || '—'],
        ['🏠 Arriendo actual',      arriendo || '—'],
        ['📋 Contrato indefinido',  contratoLabel],
        ['⚠️ En DICOM',             dicomLabel],
        ['📌 Fuente',               fuente   || '—'],
      ].map(([label, val]) => `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #f0ece4;color:#9a8878;font-size:12px;font-weight:600;width:42%">${label}</td>
        <td style="padding:9px 0;border-bottom:1px solid #f0ece4;color:#1B3A6B;font-size:13px;font-weight:700">${val}</td>
      </tr>`).join('')}
    </table>
    <div style="margin-top:22px;text-align:center">
      <a href="https://wa.me/${waPhone || '56957823672'}"
         style="display:inline-block;background:#25D366;color:#fff;padding:13px 30px;border-radius:50px;font-weight:800;font-size:14px;text-decoration:none;box-shadow:0 4px 14px rgba(37,211,102,0.3)">
        💬 Contactar por WhatsApp
      </a>
    </div>
  </td></tr>
  <tr><td style="padding:14px 32px;background:#fafaf8;border-top:1px solid #f0ece4">
    <p style="margin:0;font-size:11px;color:#bbb">Llave Propia · <a href="https://www.llavepropia.cl" style="color:#bbb">llavepropia.cl</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Llave Propia <notificaciones@llavepropia.cl>',
      to:      ['rodrigo.canas@llavepropia.cl'],
      bcc:     ['vicente@llavepropia.cl'],
      subject: `🏠 Nuevo lead: ${nombre} — ${producto}`,
      html
    })
  });

  return res.status(200).json({ saved, emailed: emailRes.ok });
}
