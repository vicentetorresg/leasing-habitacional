function buildWelcomeHtml(nombre, isLeasing) {
  const productoLabel = isLeasing ? 'Leasing Habitacional DS120' : 'Mutuo Hipotecario';
  const headerBg    = isLeasing ? 'linear-gradient(135deg,#1B2B5E 0%,#2BA89C 100%)' : 'linear-gradient(135deg,#1B2B5E 0%,#162244 100%)';
  const accentColor = isLeasing ? '#2BA89C' : '#C9871A';
  const badge       = isLeasing ? 'Programa DS120 · MINVU' : 'Crédito Hipotecario · UF';
  const intro       = isLeasing
    ? 'Estás más cerca de lo que crees de tener tu primera casa o departamento. Con el subsidio DS120 el Estado pone el pie por ti — solo necesitamos verificar que calificas. Para avanzar con tu pre-evaluación, envíanos la siguiente documentación:'
    : 'Estás comenzando el proceso para tu Mutuo Hipotecario. Para avanzar con tu pre-evaluación necesitamos la siguiente documentación:';
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Documentación requerida — ${productoLabel}</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" style="max-width:580px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <tr><td style="background:#ffffff;padding:24px 40px;border-bottom:1px solid #f0ece4">
        <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="160" style="display:block;height:auto;max-width:160px">
      </td></tr>
      <tr><td style="background:${headerBg};padding:28px 40px 24px">
        <p style="margin:0 0 4px;color:rgba(255,255,255,0.65);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${badge}</p>
        <p style="margin:0;color:rgba(255,255,255,0.9);font-size:15px;font-weight:600">${productoLabel}</p>
      </td></tr>
      <tr><td style="padding:36px 40px 0">
        <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#1B2B5E">Hola, ${nombre}! ${isLeasing ? '🏠' : ''}</p>
        <p style="margin:0;font-size:15px;color:#555;line-height:1.7">${intro}</p>
      </td></tr>
      <tr><td style="padding:28px 40px 0">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;border-radius:12px;overflow:hidden">
          <tr><td style="background:${accentColor};padding:12px 20px">
            <p style="margin:0;color:#fff;font-size:13px;font-weight:700;letter-spacing:0.5px">TRABAJADOR DEPENDIENTE</p>
          </td></tr>
          <tr><td style="padding:20px">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${['6 últimas liquidaciones de sueldo','24 cotizaciones AFP','DICOM (Informe comercial)','Certificado CMF (deudas vigentes)'].map(doc => `
              <tr><td style="padding:6px 0;border-bottom:1px solid #ece9e1">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:22px;vertical-align:top;padding-top:1px">
                    <div style="width:18px;height:18px;background:${accentColor};border-radius:50%;text-align:center;line-height:18px">
                      <span style="color:#fff;font-size:11px;font-weight:700">✓</span>
                    </div>
                  </td>
                  <td style="padding-left:10px;font-size:14px;color:#333;line-height:1.5">${doc}</td>
                </tr></table>
              </td></tr>`).join('')}
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:16px 40px 0">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;border-radius:12px;overflow:hidden">
          <tr><td style="background:#1B2B5E;padding:12px 20px">
            <p style="margin:0;color:#fff;font-size:13px;font-weight:700;letter-spacing:0.5px">TRABAJADOR INDEPENDIENTE</p>
          </td></tr>
          <tr><td style="padding:20px">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${['Carpeta tributaria (razón social o persona con giro)','DICOM (Informe comercial)','Balance de la sociedad o declaración de renta'].map(doc => `
              <tr><td style="padding:6px 0;border-bottom:1px solid #ece9e1">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:22px;vertical-align:top;padding-top:1px">
                    <div style="width:18px;height:18px;background:#1B2B5E;border-radius:50%;text-align:center;line-height:18px">
                      <span style="color:#fff;font-size:11px;font-weight:700">✓</span>
                    </div>
                  </td>
                  <td style="padding-left:10px;font-size:14px;color:#333;line-height:1.5">${doc}</td>
                </tr></table>
              </td></tr>`).join('')}
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 40px 0">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${isLeasing ? '#e8f7f5' : '#fff8ec'};border-radius:10px;border-left:4px solid ${accentColor}">
          <tr><td style="padding:16px 20px">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${accentColor}">ENVIAR DOCUMENTACIÓN A:</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#1B2B5E">rodrigo.canas@llavepropia.cl</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:32px 40px 36px">
        <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.7">
          ${isLeasing
            ? 'Con esta documentación damos inicio formal a tu proceso. Recuerda que el subsidio DS120 <strong style="color:#1B2B5E">no requiere postulación ni sorteo</strong> — si calificas, avanzamos de inmediato. ¡Estás a muy poco de tener tu propio hogar!'
            : 'Cualquier consulta estoy disponible para orientarte en cada paso del proceso. ¡Nos ponemos en contacto muy pronto!'
          }
        </p>
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:top;padding-right:14px">
              <div style="width:42px;height:42px;background:${headerBg};border-radius:50%;text-align:center;line-height:42px">
                <span style="color:#fff;font-size:18px;font-weight:700">R</span>
              </div>
            </td>
            <td>
              <p style="margin:0;font-size:14px;font-weight:700;color:#1B2B5E">Rodrigo Cañas</p>
              <p style="margin:2px 0 0;font-size:12px;color:#888">Fundador · Llave Propia</p>
              <p style="margin:2px 0 0;font-size:12px;color:#888">rodrigo.canas@llavepropia.cl</p>
            </td>
          </tr>
        </table>
        <hr style="border:none;border-top:1px solid #ece9e1;margin:24px 0 16px">
        <p style="margin:0;font-size:11px;color:#aaa;line-height:1.6">
          Este correo fue enviado por Llave Propia · <a href="https://www.llavepropia.cl" style="color:#aaa">llavepropia.cl</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.llavepropia.cl');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { nombre, telefono, email, arriendo, renta, dicom, contrato, vivienda, tiene_propiedad_vista, comuna_propiedad, complementa_renta, fuente } = req.body || {};
  if (!nombre || !telefono) return res.status(400).json({ error: 'Faltan campos' });

  const SUPA_URL = 'https://unptkiyggkuxtkzedluv.supabase.co/rest/v1/leasing_leads';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVucHRraXlnZ2t1eHRremVkbHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTMxMTU1OCwiZXhwIjoyMDk0ODg3NTU4fQ.vx78MEuZFpc57IC9I36rmLHUvi8XbWAs3nk-HiQca4E';
  const RESEND_KEY = 're_fFtYwjwm_3YXpMdCWAgcnncKW48RTXSHa';
  const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co/rest/v1/leads';
  const CRM_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2dXhkaHZ2YXJmeHJlZGdodnB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2NDg3MywiZXhwIjoyMDk2MjQwODczfQ.CmHahWoYtBcZHHJIF1tEOEfqx9Xe4unRpV2fpyvzVv8';

  // 1. Save to Supabase — try with contrato, fallback without
  const supaHeaders = {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  let saved = false;
  // Try with contrato + vivienda columns
  const r1 = await fetch(SUPA_URL, {
    method: 'POST', headers: supaHeaders,
    body: JSON.stringify({ nombre, telefono, email, arriendo, renta, dicom, contrato, vivienda, tiene_propiedad_vista, comuna_propiedad, complementa_renta, fuente })
  });
  if (r1.ok) { saved = true; }
  if (!saved) {
    const r = await fetch(SUPA_URL, {
      method: 'POST', headers: supaHeaders,
      body: JSON.stringify({ nombre, telefono, email, arriendo, renta, dicom, contrato, vivienda, fuente })
    });
    saved = r.ok;
  }

  // 1b. Dual-write to CRM Supabase (leads table)
  const normalizePhone = (raw) => {
    if (!raw) return '';
    let p = raw.replace(/[\s\-\(\)]/g, '');
    if (/^9\d{8}$/.test(p)) p = '+56' + p;
    else if (/^56\d{9}$/.test(p)) p = '+' + p;
    else if (!p.startsWith('+') && p.length > 0) p = '+' + p;
    return p;
  };
  const crmLead = {
    name: nombre,
    phone: normalizePhone(telefono),
    email: email || null,
    source: fuente || 'web',
    status: 'nuevo',
    is_demo: false,
    sueldo_liquido_raw: renta || null,
    en_dicom: dicom === 'si' ? true : dicom === 'no' ? false : null,
    arriendo: arriendo || null,
    contrato: contrato || null,
    vivienda: vivienda || null,
    tiene_propiedad_vista: tiene_propiedad_vista || null,
    comuna_propiedad: comuna_propiedad || null,
    complementa_renta: complementa_renta || null,
  };
  await fetch(CRM_URL, {
    method: 'POST',
    headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(crmLead),
  }).catch(() => null); // fire-and-forget, don't block response

  // 2. Notification email to team
  const contratoLabel  = contrato === 'si' ? '✅ Sí' : contrato === 'no' ? '❌ No' : '—';
  const viviendaLabel  = vivienda === 'si' ? '❌ Sí (tiene vivienda)' : vivienda === 'no' ? '✅ No' : '—';
  const dicomLabel     = dicom === 'si' ? '❌ Sí (en DICOM)' : dicom === 'no' ? '✅ No' : '—';
  const propVistaLabel = tiene_propiedad_vista === 'si' ? ('✅ Sí' + (comuna_propiedad ? ' — ' + comuna_propiedad : '')) : tiene_propiedad_vista === 'no' ? '⚠️ No tiene propiedad vista' : '—';
  const complementaLabel = complementa_renta || '—';
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
        ...(vivienda ? [['🏡 Tiene vivienda propia', viviendaLabel]] : []),
        ['🏠 Propiedad vista',      propVistaLabel],
        ['👥 Complementa renta',    complementaLabel],
        ['⚠️ En DICOM',             dicomLabel],
        ['📌 Fuente',               fuente   || '—'],
      ].map(([label, val]) => `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #f0ece4;color:#9a8878;font-size:12px;font-weight:600;width:42%">${label}</td>
        <td style="padding:9px 0;border-bottom:1px solid #f0ece4;color:#1B3A6B;font-size:13px;font-weight:700">${val}</td>
      </tr>`).join('')}
    </table>
    <div style="margin-top:22px;text-align:center">
      <a href="https://wa.me/${waPhone || '56962078510'}"
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

  // 2a. Notification email to team
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Llave Propia <notificaciones@llavepropia.cl>',
      to:      ['rodrigo.canas@llavepropia.cl'],
      bcc:     ['vicente@llavepropia.cl', 'karina.valenzuela@llavepropia.cl'],
      subject: `🏠 Nuevo lead: ${nombre} — ${producto}`,
      html
    })
  });

  return res.status(200).json({ saved, emailed: emailRes.ok });
}
