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
              ${['Cédula de identidad por ambos lados','Informe de deudas CMF','Certificado de matrimonio o no matrimonio','Carpeta tributaria','Certificado últimas 12 cotizaciones AFP','Últimas 12 boletas de honorarios'].map(doc => `
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
            <p style="margin:0;font-size:15px;font-weight:600;color:#1B2B5E">contacto@llavepropia.cl</p>
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

  const { nombre, telefono, email, arriendo, renta, dicom, contrato, vivienda, tiene_propiedad_vista, comuna_propiedad, precio_propiedad_ok, complementa_renta, renta_complemento, cuando_comprar, fuente, utm_source, utm_medium, utm_campaign } = req.body || {};
  if (!nombre || !telefono) return res.status(400).json({ error: 'Faltan campos' });

  // Blocklist
  const BLOCKED_EMAILS = ['acmari2030@gmail.com'];
  const BLOCKED_PHONES = ['993866203'];
  const BLOCKED_NAMES  = ['ambrosio escobar', 'ambosio escobar'];
  const normPhone = (telefono || '').replace(/\D/g, '').slice(-9);
  const normName  = (nombre || '').toLowerCase().trim();
  if (BLOCKED_EMAILS.includes((email || '').toLowerCase().trim()) ||
      BLOCKED_PHONES.some(bp => normPhone.endsWith(bp)) ||
      BLOCKED_NAMES.includes(normName)) {
    return res.status(200).json({ saved: true, emailed: true, wa: '56962078510' });
  }

  const SUPA_URL = 'https://unptkiyggkuxtkzedluv.supabase.co/rest/v1/leasing_leads';
  const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co/rest/v1/leads';
  const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;

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
    body: JSON.stringify({ nombre, telefono, email, arriendo, renta, dicom, contrato, vivienda, tiene_propiedad_vista, comuna_propiedad, precio_propiedad_ok, complementa_renta, renta_complemento, cuando_comprar, fuente, utm_source, utm_medium, utm_campaign })
  });
  if (r1.ok) { saved = true; }
  if (!saved) {
    const r = await fetch(SUPA_URL, {
      method: 'POST', headers: supaHeaders,
      body: JSON.stringify({ nombre, telefono, email, arriendo, renta, dicom, contrato, vivienda, fuente })
    });
    saved = r.ok;
  }

  // 1b. Dual-write to CRM Supabase (leads table) with round-robin assignment
  const docToken = crypto.randomUUID();
  const normalizePhone = (raw) => {
    if (!raw) return '';
    let p = raw.replace(/[\s\-\(\)]/g, '');
    if (/^9\d{8}$/.test(p)) p = '+56' + p;
    else if (/^56\d{9}$/.test(p)) p = '+' + p;
    else if (!p.startsWith('+') && p.length > 0) p = '+' + p;
    return p;
  };

  // Round-robin: alternate based on last assigned lead
  const KARINA_ID = '6608503b-3cc7-447a-9ffd-f8f94795cd50';
  const COMERCIAL_ID = '9f156deb-c219-4b51-b454-5a4692629332';
  let assignedTo = KARINA_ID;
  try {
    const crmBase = 'https://evuxdhvvarfxredghvpu.supabase.co/rest/v1';
    const crmHeaders = { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY };
    const lastRes = await fetch(`${crmBase}/leads?is_demo=eq.false&select=assigned_to&order=created_at.desc&limit=1`, { headers: crmHeaders });
    const lastData = await lastRes.json();
    const lastAssigned = lastData?.[0]?.assigned_to;
    assignedTo = lastAssigned === KARINA_ID ? COMERCIAL_ID : KARINA_ID;
  } catch {}

  const crmLead = {
    name: nombre,
    phone: normalizePhone(telefono),
    email: email || null,
    source: fuente || 'web',
    status: 'nuevo',
    is_demo: false,
    assigned_to: assignedTo,
    sueldo_liquido_raw: renta || null,
    en_dicom: dicom === 'si' ? true : dicom === 'no' ? false : null,
    arriendo: arriendo || null,
    contrato: contrato || null,
    vivienda: vivienda || null,
    tiene_propiedad_vista: tiene_propiedad_vista || null,
    comuna_propiedad: comuna_propiedad || null,
    precio_propiedad_ok: precio_propiedad_ok || null,
    complementa_renta: complementa_renta || null,
    renta_complemento: renta_complemento || null,
    cuando_comprar: cuando_comprar || null,
    utm_source: utm_source || null,
    utm_medium: utm_medium || null,
    utm_campaign: utm_campaign || null,
    doc_token: docToken,
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
  const precioOkLabel = precio_propiedad_ok ? '✅ ' + precio_propiedad_ok : '—';
  const complementaLabel = complementa_renta || '—';
  const rentaCompLabel = renta_complemento || '—';
  const cuandoComprarLabel = cuando_comprar === 'lo_antes_posible' ? '🔥 Lo antes posible' : cuando_comprar === 'dentro_3_meses' ? '📅 Dentro de 3 meses' : cuando_comprar === 'mas_3_meses' ? '📆 En más de 3 meses' : '—';
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
        ['💲 Valor propiedad',       precioOkLabel],
        ['👥 Complementa renta',    complementaLabel],
        ['💰 Renta complemento',    rentaCompLabel],
        ['⚠️ En DICOM',             dicomLabel],
        ['🗓️ Cuándo comprar',       cuandoComprarLabel],
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

  // 2a. Notification email to team (only the assigned ejecutiva)
  const ejecutivaEmail = assignedTo === COMERCIAL_ID ? 'comercial@llavepropia.cl' : 'karina.valenzuela@llavepropia.cl';
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Llave Propia <notificaciones@llavepropia.cl>',
      to:      ['rodrigo.canas@llavepropia.cl'],
      bcc:     ['vicente@llavepropia.cl', ejecutivaEmail],
      subject: `🏠 Nuevo lead: ${nombre} — ${producto}`,
      html
    })
  });

  // 3. Pre-approval email to the lead (with CC to Vicente)
  const isLeasing = !(fuente || '').toLowerCase().includes('mutuo');
  if (isLeasing && email) {
    const firstName = (nombre || '').trim().split(' ')[0] || nombre;
    const dicomVal = dicom === 'no' ? 'No ✅' : dicom === 'si' ? 'Sí ❌' : '—';
    const contratoVal = contrato === 'si' ? 'Sí ✅' : contrato === 'no' ? 'No ❌' : '—';
    const viviendaVal = vivienda === 'no' ? 'No ✅' : vivienda === 'si' ? 'Sí ❌' : '—';
    const comunaVal = comuna_propiedad || '—';
    const precioVal = precio_propiedad_ok || '—';
    const complementaVal = complementa_renta || '—';
    const rentaCompEmailVal = renta_complemento || '—';
    const arriendoVal = arriendo || '—';
    const rentaVal = renta || '—';
    const telVal = telefono || '—';
    const cuandoComprarVal = cuando_comprar === 'lo_antes_posible' ? 'Lo antes posible' : cuando_comprar === 'dentro_3_meses' ? 'Dentro de 3 meses' : cuando_comprar === 'mas_3_meses' ? 'En más de 3 meses' : '—';
    const rentaCompOblig = ['$850.000 – $1.000.000','$1.000.001 – $1.100.000','$1.100.001 – $1.200.000'];
    const isCondicionado = rentaCompOblig.includes(renta || '');
    const badgeLabel = isCondicionado ? '⚠️ PRE-APROBADO CONDICIONADO' : '✅ PRE-APROBADO';
    const badgeColor = isCondicionado ? '#e67e22' : '#2B7A4E';
    const badgeBg = isCondicionado ? 'linear-gradient(135deg,#FEF3E2,#FFF8EE)' : 'linear-gradient(135deg,#D5F5E3,#E5F7F4)';
    const badgeBorder = isCondicionado ? 'rgba(230,126,34,0.3)' : 'rgba(45,184,158,0.3)';
    const uploadUrl = `https://www.llavepropia.cl/documentos.html?t=${docToken}`;

    const headlineText = isCondicionado
      ? `${firstName}, tienes una oportunidad para tu casa propia`
      : `Felicidades ${firstName}, estas pre-aprobado!`;
    const subtitleText = isCondicionado
      ? 'Pre-aprobado condicionado para Leasing Habitacional'
      : 'Pre-aprobado para Leasing Habitacional';
    const introText = isCondicionado
      ? `Segun la informacion que nos enviaste, <strong>podrias acceder al Leasing Habitacional con subsidio del Estado</strong>, condicionado a que complementes tu renta con otra persona. Para confirmar tu pre-aprobacion, necesitamos verificar tu documentacion.`
      : `Segun la informacion que nos enviaste, <strong>calificas para comprar tu vivienda con subsidio del Estado</strong> a traves del Leasing Habitacional DS120. Para formalizar tu proceso de compra, necesitamos verificar tu documentacion.`;
    const urgencyText = isCondicionado
      ? 'Los cupos para complementar renta son limitados. Confirma tu pre-aprobacion lo antes posible.'
      : 'Tu pre-aprobacion tiene vigencia limitada. Asegura tu cupo enviando tus documentos ahora.';

    const preApprovalHtml = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#FEFCF7;border-radius:16px;overflow:hidden;border:1px solid #EDE3D4">
  <div style="background:linear-gradient(135deg,#1B3A6B,#243870);padding:28px;text-align:center">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="display:inline-block;height:auto;max-width:140px">
  </div>
  <div style="padding:32px 28px">
    <div style="background:${badgeBg};border:2px solid ${badgeBorder};border-radius:14px;padding:22px 24px;margin:0 0 24px;text-align:center">
      <p style="font-size:28px;font-weight:900;color:${badgeColor};margin:0 0 6px;letter-spacing:-0.5px">${badgeLabel}</p>
      <p style="font-size:14px;color:#1B3A6B;margin:0;font-weight:600;line-height:1.5">${subtitleText}</p>
    </div>

    <p style="font-size:16px;color:#1A150F;line-height:1.7;margin:0 0 24px">${introText}</p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px"><tr><td align="center" style="background:#2DB89E;border-radius:16px;padding:32px 28px">
      <p style="font-size:24px;font-weight:900;color:#fff;margin:0 0 8px">${isCondicionado ? 'Confirma tu oportunidad' : 'Solo falta un paso'}</p>
      <p style="font-size:15px;color:rgba(255,255,255,0.9);margin:0 0 24px;line-height:1.5">Revisa tu pre-aprobacion y sube tus documentos para avanzar con la compra de tu vivienda.</p>
      <a href="${uploadUrl}" target="_blank" style="display:inline-block;background:#fff;color:#1B3A6B;font-size:18px;font-weight:900;padding:18px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(0,0,0,0.15)">REVISA TU PRE-APROBACION</a>
      <p style="font-size:12px;color:rgba(255,255,255,0.7);margin:12px 0 0">Solo toma 5 minutos</p>
    </td></tr></table>

    <div style="background:#FEF3E2;border:1.5px solid rgba(230,126,34,0.25);border-radius:10px;padding:14px 18px;margin:0 0 24px;text-align:center">
      <p style="font-size:14px;color:#1B3A6B;margin:0;line-height:1.6;font-weight:700">${urgencyText}</p>
    </div>

    <p style="font-size:14px;font-weight:700;color:#1B3A6B;margin:0 0 12px">Documentos que necesitaremos verificar:</p>

    <div style="background:#fff;border:1.5px solid #EDE3D4;border-radius:12px;padding:16px 18px;margin:0 0 12px">
      <p style="font-size:11px;font-weight:800;color:#2DB89E;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Dependientes</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:13px;color:#1A150F">
        ${['Cedula de identidad por ambos lados','6 ultimas liquidaciones de sueldo','Cotizaciones AFP ultimo ano','Contrato de trabajo con antiguedad','Deuda CMF (se obtiene gratuita)','Certificado de matrimonio o no matrimonio'].map((d,i) => `<tr><td width="24" valign="middle" style="padding:3px 0"><div style="background:#2DB89E;color:#fff;width:18px;height:18px;border-radius:50%;text-align:center;line-height:18px;font-size:9px;font-weight:800">${i+1}</div></td><td style="padding:3px 0 3px 6px">${d}</td></tr>`).join('')}
      </table>
    </div>

    <div style="background:#fff;border:1.5px solid #EDE3D4;border-radius:12px;padding:16px 18px;margin:0 0 12px">
      <p style="font-size:11px;font-weight:800;color:#1B3A6B;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Independientes</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:13px;color:#1A150F">
        ${['Cedula de identidad por ambos lados','Informe de deudas CMF','Certificado de matrimonio o no matrimonio','Carpeta tributaria','Certificado ultimas 12 cotizaciones AFP','Ultimas 12 boletas de honorarios'].map((d,i) => `<tr><td width="24" valign="middle" style="padding:3px 0"><div style="background:#1B3A6B;color:#fff;width:20px;height:20px;border-radius:50%;text-align:center;line-height:20px;font-size:10px;font-weight:800">${i+1}</div></td><td style="padding:3px 0 3px 6px">${d}</td></tr>`).join('')}
      </table>
    </div>

    <div style="background:#E5F7F4;border:1px solid rgba(45,184,158,0.3);border-radius:10px;padding:10px 14px;margin:0 0 24px">
      <p style="font-size:12px;color:#1B3A6B;margin:0;line-height:1.5"><strong>Si complementas renta</strong>, necesitamos los mismos documentos de esa persona.</p>
    </div>

    <div style="text-align:center;margin:0 0 20px">
      <a href="${uploadUrl}" target="_blank" style="display:inline-block;background:#2DB89E;color:#fff;font-size:16px;font-weight:900;padding:16px 40px;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(45,184,158,0.3)">VER MI PRE-APROBACION</a>
    </div>
    <p style="font-size:13px;color:#888;margin:0 0 16px;text-align:center">Tambien puedes enviarlos respondiendo este correo o por WhatsApp:</p>
    <div style="text-align:center;margin:0 0 8px">
      <a href="https://wa.me/${assignedTo === COMERCIAL_ID ? '56957852275' : '56962078510'}" target="_blank" style="display:inline-block;background:#25D366;color:#fff;font-size:14px;font-weight:800;padding:12px 32px;border-radius:12px;text-decoration:none">WhatsApp</a>
    </div>
  </div>
  <div style="background:#F7F0E6;padding:18px 28px;text-align:center;border-top:1px solid #EDE3D4">
    <p style="font-size:13px;color:#9A8878;margin:0;line-height:1.6">Saludos,<br><strong style="color:#1B3A6B">Equipo Llave Propia</strong></p>
    <p style="font-size:10px;color:#BBA88A;margin:10px 0 0;line-height:1.5">* Esta pre-aprobacion es preliminar y esta basada en la informacion declarada. La aprobacion definitiva esta sujeta a verificacion de antecedentes y evaluacion de la entidad financiera.</p>
  </div>
</div>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Llave Propia <notificaciones@llavepropia.cl>',
        to: [email],
        reply_to: ['rodrigo.canas@llavepropia.cl', 'vicente@llavepropia.cl'],
        subject: isCondicionado ? `${firstName}, tenemos novedades sobre tu evaluacion` : `Tu resultado de pre-evaluacion esta listo, ${firstName}`,
        html: preApprovalHtml
      })
    }).catch(() => null);
  }

  const WA_MAP = { [KARINA_ID]: '56962078510', [COMERCIAL_ID]: '56957852275' };
  return res.status(200).json({ saved, emailed: emailRes.ok, wa: WA_MAP[assignedTo] || '56962078510' });
}
