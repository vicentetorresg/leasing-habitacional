function buildWelcomeHtml(nombre, isLeasing) {
  const productoLabel = isLeasing ? 'Leasing Habitacional DS120' : 'Credito Hipotecario';
  const headerBg    = isLeasing ? 'linear-gradient(135deg,#1B2B5E 0%,#2BA89C 100%)' : 'linear-gradient(135deg,#1B2B5E 0%,#162244 100%)';
  const accentColor = isLeasing ? '#2BA89C' : '#C9871A';
  const badge       = isLeasing ? 'Programa DS120 · MINVU' : 'Crédito Hipotecario · UF';
  const intro       = isLeasing
    ? 'Estás más cerca de lo que crees de tener tu primera casa o departamento. Con el subsidio DS120 el Estado pone el pie por ti — solo necesitamos verificar que calificas. Para avanzar con tu pre-evaluación, envíanos la siguiente documentación:'
    : 'Estás comenzando el proceso para tu Credito Hipotecario. Para avanzar con tu pre-evaluación necesitamos la siguiente documentación:';
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

  // Allow GET for cron-triggered actions
  if (['engagement', 'test-engagement', 'send-backlog', 'weekly-followup', 'wa-click'].includes(req.query.action)) {
    // These actions work with GET or POST
  } else if (req.method !== 'POST') {
    return res.status(405).end();
  }

  // --- WhatsApp click tracker from email ---
  if (req.query.action === 'wa-click') {
    const leadId = req.query.id;
    const waNum = req.query.wa || '56962078510';
    const waText = req.query.text || 'Hola, quiero enviar mis documentos para el leasing habitacional';
    if (leadId) {
      const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
      const crmHeaders = { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' };
      await fetch(`https://evuxdhvvarfxredghvpu.supabase.co/rest/v1/leads?id=eq.${leadId}`, {
        method: 'PATCH', headers: crmHeaders,
        body: JSON.stringify({ click_whatsapp_mail: new Date().toISOString() })
      }).catch(() => null);
    }
    return res.redirect(302, `https://wa.me/${waNum}?text=${encodeURIComponent(waText)}`);
  }

  // --- Lead flag sub-action ---
  if (req.query.action === 'flag') {
    const { email: flagEmail, telefono: flagPhone, field } = req.body || {};
    if ((!flagEmail && !flagPhone) || !field) return res.status(400).json({ error: 'Missing email/telefono or field' });
    const allowed = ['acepto_monto', 'click_whatsapp'];
    if (!allowed.includes(field)) return res.status(400).json({ error: 'Invalid field' });
    const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
    const mkHeaders = (key) => ({ 'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' });
    const body = JSON.stringify({ [field]: true });
    // Match by email first, fallback to phone
    const encEmail = flagEmail ? encodeURIComponent(flagEmail.trim().toLowerCase()) : '';
    const encPhone = flagPhone ? encodeURIComponent(flagPhone.trim()) : '';
    const emailFilter = encEmail ? `email=eq.${encEmail}` : `telefono=eq.${encPhone}`;
    const crmPhoneFilter = encPhone ? `phone=eq.${encPhone}` : '';
    const crmFilter = encEmail ? `email=eq.${encEmail}` : crmPhoneFilter;
    const results = await Promise.allSettled([
      fetch(`https://unptkiyggkuxtkzedluv.supabase.co/rest/v1/leasing_leads?${emailFilter}&order=created_at.desc&limit=1`, { method: 'PATCH', headers: mkHeaders(SUPA_KEY), body }),
      (CRM_KEY && crmFilter) ? fetch(`https://evuxdhvvarfxredghvpu.supabase.co/rest/v1/leads?${crmFilter}&order=created_at.desc&limit=1`, { method: 'PATCH', headers: mkHeaders(CRM_KEY), body }) : Promise.resolve()
    ]);
    console.log('[flag]', field, flagEmail, flagPhone, results.map(r => r.status));
    return res.status(200).json({ ok: true });
  }

  // --- Engagement email sub-action (called by cron-job.org every 2 min) ---
  if (req.query.action === 'engagement') {
    const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
    const RESEND_KEY = process.env.RESEND_API_KEY;
    const crmBase = 'https://evuxdhvvarfxredghvpu.supabase.co/rest/v1';
    const crmHeaders = { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY, 'Content-Type': 'application/json' };

    // Find leads created > 2 min ago, with email, not yet sent engagement email, leasing only
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const tenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const leadsRes = await fetch(
      `${crmBase}/leads?engagement_email_sent=eq.false&email=neq.&email=not.is.null&created_at=lt.${twoMinAgo}&created_at=gt.${tenMinAgo}&is_demo=eq.false&select=id,name,email,phone,acepto_monto,click_whatsapp,assigned_to,valor_vivienda_uf,valor_financiamiento_uf,doc_token,sueldo_liquido_raw,renta_complemento,complementa_renta,en_dicom&limit=10`,
      { headers: crmHeaders }
    );
    const leads = await leadsRes.json();
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(200).json({ ok: true, sent: 0 });
    }

    const KARINA_ID_E = '6608503b-3cc7-447a-9ffd-f8f94795cd50';
    const COMERCIAL_ID_E = '9f156deb-c219-4b51-b454-5a4692629332';
    const WA_MAP_E = { [KARINA_ID_E]: '56962078510', [COMERCIAL_ID_E]: '56957852275' };
    const UF_CLP = 38800; // approximate UF value in CLP

    let sentCount = 0;
    for (const lead of leads) {
      const firstName = (lead.name || '').trim().split(' ')[0] || lead.name || 'Postulante';
      const waNum = WA_MAP_E[lead.assigned_to] || '56962078510';
      const vivUf = parseFloat(lead.valor_vivienda_uf) || 0;
      const finUf = parseFloat(lead.valor_financiamiento_uf) || 0;
      const vivClp = Math.round(vivUf * UF_CLP);
      const finClp = Math.round(finUf * UF_CLP);
      const fmtClp = (n) => '$' + n.toLocaleString('es-CL');
      const fmtUf = (n) => n.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' UF';
      const uploadUrl = lead.doc_token ? `https://www.llavepropia.cl/documentos.html?t=${lead.doc_token}` : 'https://www.llavepropia.cl';
      const waTrackUrl = `https://www.llavepropia.cl/api/new-lead?action=wa-click&id=${lead.id}&wa=${waNum}`;

      // Determine email variant
      let variant, subject, heroBg, heroTitle, heroSub, bodyText;
      if (lead.click_whatsapp) {
        variant = 'wa';
        subject = `${firstName}, ¿cómo va tu proceso de leasing?`;
        heroBg = 'linear-gradient(135deg,#1B3A6B 0%,#2DB89E 100%)';
        heroTitle = `${firstName}, tu proceso ya está en marcha`;
        heroSub = 'Vimos que ya iniciaste contacto con tu ejecutiva';
        bodyText = `Nos alegra que hayas dado el primer paso. Para <strong>confirmar tu monto de financiamiento</strong>, necesitamos que nos envíes tus documentos por WhatsApp lo antes posible:`;
      } else if (lead.acepto_monto) {
        variant = 'acepto';
        subject = `${firstName}, tu monto aproximado de financiamiento`;
        heroBg = 'linear-gradient(135deg,#1B3A6B 0%,#2B7A4E 100%)';
        heroTitle = `${firstName}, tu estimación está lista`;
        heroSub = 'Revisaste la propuesta — solo falta un paso';
        bodyText = `Vimos que revisaste el monto aproximado de financiamiento. Para <strong>confirmar este monto</strong>, necesitamos que nos envíes tus documentos por WhatsApp:`;
      } else {
        variant = 'frio';
        subject = `${firstName}, esto es lo que podríamos financiarte`;
        heroBg = 'linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%)';
        heroTitle = `${firstName}, tienes un monto aproximado`;
        heroSub = 'Revisamos tu información — mira tu resultado';
        bodyText = `Analizamos la información que nos dejaste y tenemos buenas noticias: <strong>podrías acceder al Leasing Habitacional con subsidio del Estado</strong>.<br><br>Para confirmar este monto, envíanos tus documentos por WhatsApp:`;
      }

      const subUf = vivUf > 0 ? Math.ceil(Math.max(Math.min(725 - vivUf * 0.375, 425), 125)) : 0;
      const subClp = Math.round(subUf * UF_CLP);
      const rentaLabel = lead.sueldo_liquido_raw || '—';
      const rentaCompLabel = lead.renta_complemento || null;
      const dicomLabel = lead.en_dicom === false ? 'Sin DICOM ✅' : lead.en_dicom === true ? 'En DICOM' : '';

      const montoCardHtml = (vivUf > 0 || finUf > 0) ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-radius:14px;overflow:hidden;border:2px solid #1B3A6B">
          <tr><td style="background:#1B3A6B;padding:14px 24px">
            <p style="margin:0;font-size:12px;color:#fff;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;text-align:center">Podrías optar a una vivienda de hasta</p>
          </td></tr>
          ${vivUf > 0 ? `<tr><td style="padding:28px 24px 20px;text-align:center;background:#fff">
            <p style="margin:0;color:#111;font-size:36px;font-weight:900;letter-spacing:-1px;line-height:1">${fmtClp(vivClp)}</p>
            <p style="margin:6px 0 0;color:#555;font-size:14px;font-weight:600">${fmtUf(vivUf)}</p>
          </td></tr>` : ''}
          <tr><td style="padding:0 24px 20px;background:#fff">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee">
              ${finUf > 0 ? `<tr>
                <td style="padding:14px 0 4px;color:#111;font-size:14px;font-weight:700">Financiamiento aprox.</td>
                <td align="right" style="padding:14px 0 4px;color:#111;font-size:16px;font-weight:800">${fmtClp(finClp)} <span style="color:#555;font-size:11px">(${fmtUf(finUf)})</span></td>
              </tr>` : ''}
              ${subUf > 0 ? `<tr>
                <td style="padding:4px 0;color:#111;font-size:14px;font-weight:700">Subsidio DS120</td>
                <td align="right" style="padding:4px 0;color:#2B7A4E;font-size:16px;font-weight:800">${fmtClp(subClp)} <span style="color:#555;font-size:11px">(${fmtUf(subUf)})</span></td>
              </tr>` : ''}
              <tr>
                <td style="padding:4px 0;color:#111;font-size:14px;font-weight:700">Pie inicial</td>
                <td align="right" style="padding:4px 0;color:#2B7A4E;font-size:16px;font-weight:900">$0</td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:12px 24px;background:#f8f7f4;border-top:1px solid #eee">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#111;font-size:13px;font-weight:700">Renta titular</td>
                <td align="right" style="color:#111;font-size:13px;font-weight:700">${rentaLabel}</td>
              </tr>
              ${rentaCompLabel ? `<tr>
                <td style="color:#111;font-size:13px;font-weight:700;padding-top:4px">Renta complemento</td>
                <td align="right" style="color:#111;font-size:13px;font-weight:700;padding-top:4px">${rentaCompLabel}</td>
              </tr>` : ''}
              ${dicomLabel ? `<tr>
                <td colspan="2" style="padding-top:6px;color:#2B7A4E;font-size:13px;font-weight:800">${dicomLabel}</td>
              </tr>` : ''}
            </table>
          </td></tr>
          <tr><td style="padding:8px 24px 10px;background:#f0eeea;border-top:1px solid #eee">
            <p style="margin:0;font-size:11px;color:#666;text-align:center">* Estimación preliminar sujeta a verificación de antecedentes.</p>
          </td></tr>
        </table>` : '';

      const emailHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:28px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <tr><td style="background:#fff;padding:20px 36px;border-bottom:1px solid #f0ece4">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="display:block;height:auto;max-width:140px">
  </td></tr>
  <tr><td style="background:${heroBg};padding:28px 36px">
    <p style="margin:0 0 6px;color:#fff;font-size:22px;font-weight:800;line-height:1.3">${heroTitle}</p>
    <p style="margin:0;color:rgba(255,255,255,0.75);font-size:14px">${heroSub}</p>
  </td></tr>
  <tr><td style="padding:28px 36px">
    <p style="margin:0 0 8px;font-size:15px;color:#444;line-height:1.75">${bodyText}</p>
    ${montoCardHtml}
    <div style="text-align:center;margin:24px 0 16px">
      <a href="${waTrackUrl}" target="_blank" style="display:inline-block;background:#25D366;color:#fff;font-size:18px;font-weight:900;padding:20px 48px;border-radius:16px;text-decoration:none;box-shadow:0 6px 20px rgba(37,211,102,0.35)">
        📄 Enviar documentos AHORA por WhatsApp
      </a>
    </div>
    <div style="margin:20px 0 0;background:#FEF3E2;border:1.5px solid rgba(230,126,34,0.3);border-radius:10px;padding:14px 18px;text-align:center">
      <p style="margin:0;font-size:14px;color:#1B3A6B;line-height:1.6;font-weight:900;text-transform:uppercase">⚠️ AVANZA SOLO SI ESTE MONTO TE SIRVE. TENEMOS MUCHAS SOLICITUDES Y LOS CUPOS SON LIMITADOS.</p>
    </div>
    <div style="margin:20px 0 0;background:#f8f7f4;border-radius:10px;padding:16px 18px">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1B3A6B;text-transform:uppercase;letter-spacing:1px">Documentos que necesitas enviar</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#555">
        ${['Cédula de identidad (ambos lados)','Últimas 6 liquidaciones de sueldo','Cotizaciones AFP (último año)','Informe de deudas CMF','Certificado de matrimonio o soltería'].map(d => `<tr><td style="padding:4px 0">• ${d}</td></tr>`).join('')}
      </table>
    </div>
  </td></tr>
  <tr><td style="padding:20px 36px;background:#fafaf8;border-top:1px solid #f0ece4">
    <p style="margin:0 0 4px;font-size:13px;color:#1B3A6B;font-weight:700">Equipo Llave Propia</p>
    <p style="margin:0;font-size:11px;color:#aaa">llavepropia.cl · Leasing Habitacional con subsidio del Estado</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

      try {
        const sendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Llave Propia <notificaciones@proppi.cl>',
            to: [lead.email],
            reply_to: ['contacto@llavepropia.cl', 'rodrigo.canas@llavepropia.cl'],
            subject,
            html: emailHtml
          })
        });
        const sendData = await sendRes.json();
        console.log(`[engagement] ${variant} email to ${lead.email}:`, sendData?.id || sendData);

        // Mark as sent
        await fetch(`${crmBase}/leads?id=eq.${lead.id}`, {
          method: 'PATCH',
          headers: { ...crmHeaders, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ engagement_email_sent: true, engagement_email_count: 1, last_engagement_email_at: new Date().toISOString() })
        });
        sentCount++;
      } catch (e) {
        console.error(`[engagement] Error sending to ${lead.email}:`, e.message);
      }
    }

    return res.status(200).json({ ok: true, sent: sentCount });
  }

  // --- Test engagement emails sub-action ---
  if (req.query.action === 'test-engagement') {
    const RESEND_KEY = process.env.RESEND_API_KEY;
    const testEmail = req.query.to || 'vicente.torres@proppi.cl';
    const UF_CLP = 38800;
    const testVivUf = 2500;
    const testFinUf = 2200;
    const vivClp = Math.round(testVivUf * UF_CLP);
    const finClp = Math.round(testFinUf * UF_CLP);
    const fmtClp = (n) => '$' + n.toLocaleString('es-CL');
    const fmtUf = (n) => n.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' UF';
    const uploadUrl = 'https://www.llavepropia.cl/documentos.html?t=test-demo';
    const waNum = '56962078510';

    const testSubUf = Math.ceil(Math.max(Math.min(725 - testVivUf * 0.375, 425), 125));
    const testSubClp = Math.round(testSubUf * UF_CLP);
    const montoCardHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-radius:14px;overflow:hidden;border:2px solid #1B3A6B">
        <tr><td style="background:#1B3A6B;padding:14px 24px">
          <p style="margin:0;font-size:12px;color:#fff;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;text-align:center">Podrías optar a una vivienda de hasta</p>
        </td></tr>
        <tr><td style="padding:28px 24px 20px;text-align:center;background:#fff">
          <p style="margin:0;color:#111;font-size:36px;font-weight:900;letter-spacing:-1px;line-height:1">${fmtClp(vivClp)}</p>
          <p style="margin:6px 0 0;color:#555;font-size:14px;font-weight:600">${fmtUf(testVivUf)}</p>
        </td></tr>
        <tr><td style="padding:0 24px 20px;background:#fff">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee">
            <tr>
              <td style="padding:14px 0 4px;color:#111;font-size:14px;font-weight:700">Financiamiento aprox.</td>
              <td align="right" style="padding:14px 0 4px;color:#111;font-size:16px;font-weight:800">${fmtClp(finClp)} <span style="color:#555;font-size:11px">(${fmtUf(testFinUf)})</span></td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#111;font-size:14px;font-weight:700">Subsidio DS120</td>
              <td align="right" style="padding:4px 0;color:#2B7A4E;font-size:16px;font-weight:800">${fmtClp(testSubClp)} <span style="color:#555;font-size:11px">(${fmtUf(testSubUf)})</span></td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#111;font-size:14px;font-weight:700">Pie inicial</td>
              <td align="right" style="padding:4px 0;color:#2B7A4E;font-size:16px;font-weight:900">$0</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:12px 24px;background:#f8f7f4;border-top:1px solid #eee">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#111;font-size:13px;font-weight:700">Renta titular</td>
              <td align="right" style="color:#111;font-size:13px;font-weight:700">$1.300.001 – $1.400.000</td>
            </tr>
            <tr>
              <td style="color:#111;font-size:13px;font-weight:700;padding-top:4px">Renta complemento</td>
              <td align="right" style="color:#111;font-size:13px;font-weight:700;padding-top:4px">$850.000 – $1.000.000</td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:6px;color:#2B7A4E;font-size:13px;font-weight:800">Sin DICOM ✅</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 24px 10px;background:#f0eeea;border-top:1px solid #eee">
          <p style="margin:0;font-size:11px;color:#666;text-align:center">* Estimación preliminar sujeta a verificación de antecedentes.</p>
        </td></tr>
      </table>`;

    const docsHtml = `
      <div style="margin:24px 0 0;background:#f8f7f4;border-radius:10px;padding:16px 18px">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1B3A6B;text-transform:uppercase;letter-spacing:1px">Documentos que necesitas enviar</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#555">
          ${['Cédula de identidad (ambos lados)','Últimas 6 liquidaciones de sueldo','Cotizaciones AFP (último año)','Informe de deudas CMF','Certificado de matrimonio o soltería'].map(d => `<tr><td style="padding:4px 0">• ${d}</td></tr>`).join('')}
        </table>
      </div>`;

    const waTrackUrl = `https://wa.me/${waNum}?text=Hola%2C%20quiero%20enviar%20mis%20documentos%20para%20el%20leasing%20habitacional`;

    const variants = [
      {
        variant: 'frio',
        subject: 'Vicente, esto es lo que podríamos financiarte',
        heroBg: 'linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%)',
        heroTitle: 'Vicente, tienes un monto aproximado',
        heroSub: 'Revisamos tu información — mira tu resultado',
        bodyText: 'Analizamos la información que nos dejaste y tenemos buenas noticias: <strong>podrías acceder al Leasing Habitacional con subsidio del Estado</strong>.<br><br>Para confirmar este monto, envíanos tus documentos por WhatsApp:',
      },
      {
        variant: 'acepto',
        subject: 'Vicente, tu monto aproximado de financiamiento',
        heroBg: 'linear-gradient(135deg,#1B3A6B 0%,#2B7A4E 100%)',
        heroTitle: 'Vicente, tu estimación está lista',
        heroSub: 'Revisaste la propuesta — solo falta un paso',
        bodyText: 'Vimos que revisaste el monto aproximado de financiamiento. Para <strong>confirmar este monto</strong>, necesitamos que nos envíes tus documentos por WhatsApp:',
      },
      {
        variant: 'wa',
        subject: 'Vicente, ¿cómo va tu proceso de leasing?',
        heroBg: 'linear-gradient(135deg,#1B3A6B 0%,#2DB89E 100%)',
        heroTitle: 'Vicente, tu proceso ya está en marcha',
        heroSub: 'Vimos que ya iniciaste contacto con tu ejecutiva',
        bodyText: 'Nos alegra que hayas dado el primer paso. Para <strong>confirmar tu monto de financiamiento</strong>, necesitamos que nos envíes tus documentos por WhatsApp lo antes posible:',
      },
    ];

    const results = [];
    for (const v of variants) {
      const emailHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:28px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <tr><td style="background:#fff;padding:20px 36px;border-bottom:1px solid #f0ece4">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="display:block;height:auto;max-width:140px">
  </td></tr>
  <tr><td style="background:${v.heroBg};padding:28px 36px">
    <p style="margin:0 0 6px;color:#fff;font-size:22px;font-weight:800;line-height:1.3">${v.heroTitle}</p>
    <p style="margin:0;color:rgba(255,255,255,0.75);font-size:14px">${v.heroSub}</p>
  </td></tr>
  <tr><td style="padding:28px 36px">
    <p style="margin:0 0 8px;font-size:15px;color:#444;line-height:1.75">${v.bodyText}</p>
    ${montoCardHtml}
    <div style="text-align:center;margin:24px 0 16px">
      <a href="${waTrackUrl}" target="_blank" style="display:inline-block;background:#25D366;color:#fff;font-size:18px;font-weight:900;padding:20px 48px;border-radius:16px;text-decoration:none;box-shadow:0 6px 20px rgba(37,211,102,0.35)">
        📄 Enviar documentos AHORA por WhatsApp
      </a>
    </div>
    <div style="margin:20px 0 0;background:#FEF3E2;border:1.5px solid rgba(230,126,34,0.3);border-radius:10px;padding:14px 18px;text-align:center">
      <p style="margin:0;font-size:14px;color:#1B3A6B;line-height:1.6;font-weight:900;text-transform:uppercase">⚠️ AVANZA SOLO SI ESTE MONTO TE SIRVE. TENEMOS MUCHAS SOLICITUDES Y LOS CUPOS SON LIMITADOS.</p>
    </div>
    ${docsHtml}
  </td></tr>
  <tr><td style="padding:20px 36px;background:#fafaf8;border-top:1px solid #f0ece4">
    <p style="margin:0 0 4px;font-size:13px;color:#1B3A6B;font-weight:700">Equipo Llave Propia</p>
    <p style="margin:0;font-size:11px;color:#aaa">llavepropia.cl · Leasing Habitacional con subsidio del Estado</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Llave Propia <notificaciones@proppi.cl>',
            to: [testEmail],
            subject: `[TEST ${v.variant.toUpperCase()}] ${v.subject}`,
            html: emailHtml
          })
        });
        const data = await r.json();
        results.push({ variant: v.variant, id: data?.id, status: r.ok ? 'sent' : 'error' });
      } catch (e) {
        results.push({ variant: v.variant, error: e.message });
      }
    }
    return res.status(200).json({ ok: true, results });
  }

  // --- Send backlog engagement emails (one-time for leads from a date range) ---
  // Also used as weekly followup: ?action=weekly-followup (cron every day, sends to leads >= 7 days since last email)
  if (req.query.action === 'send-backlog' || req.query.action === 'weekly-followup') {
    const isWeekly = req.query.action === 'weekly-followup';
    const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
    const RESEND_KEY = process.env.RESEND_API_KEY;
    const crmBase = 'https://evuxdhvvarfxredghvpu.supabase.co/rest/v1';
    const crmHeaders = { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY, 'Content-Type': 'application/json' };
    const KARINA_ID_B = '6608503b-3cc7-447a-9ffd-f8f94795cd50';
    const COMERCIAL_ID_B = '9f156deb-c219-4b51-b454-5a4692629332';
    const WA_MAP_B = { [KARINA_ID_B]: '56962078510', [COMERCIAL_ID_B]: '56957852275' };
    const UF_CLP = 38800;
    const fmtClp = (n) => '$' + n.toLocaleString('es-CL');
    const fmtUf = (n) => n.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' UF';

    // Exclude these statuses from emails
    const excludeStatuses = ['archivado', 'rechazado', 'aprobado', 'firmado'];

    let url;
    if (isWeekly) {
      // Leads where last engagement email was >= 7 days ago, max 4 emails total, not in final statuses
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      // Created since Oct 28 2026 (start of system)
      url = `${crmBase}/leads?email=not.is.null&email=neq.&is_demo=eq.false&engagement_email_count=lt.4&created_at=gte.2026-10-28T00:00:00&status=not.in.(${excludeStatuses.join(',')})&or=(last_engagement_email_at.is.null,last_engagement_email_at.lt.${sevenDaysAgo})&select=id,name,email,phone,acepto_monto,click_whatsapp,assigned_to,valor_vivienda_uf,valor_financiamiento_uf,doc_token,sueldo_liquido_raw,renta_complemento,complementa_renta,en_dicom,status,engagement_email_count&order=created_at.asc&limit=30`;
    } else {
      // Backlog: send first email to leads from date range that haven't received any
      const since = req.query.since || '2026-10-28T00:00:00';
      const until = req.query.until || new Date().toISOString();
      url = `${crmBase}/leads?email=not.is.null&email=neq.&is_demo=eq.false&engagement_email_sent=eq.false&created_at=gte.${since}&created_at=lte.${until}&status=not.in.(${excludeStatuses.join(',')})&select=id,name,email,phone,acepto_monto,click_whatsapp,assigned_to,valor_vivienda_uf,valor_financiamiento_uf,doc_token,sueldo_liquido_raw,renta_complemento,complementa_renta,en_dicom,status,engagement_email_count&order=created_at.asc&limit=50`;
    }

    const leadsRes = await fetch(url, { headers: crmHeaders });
    const leads = await leadsRes.json();
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, message: 'No leads to email' });
    }

    let sentCount = 0;
    const sentList = [];
    for (const lead of leads) {
      const firstName = (lead.name || '').trim().split(' ')[0] || lead.name || 'Postulante';
      const waNum = WA_MAP_B[lead.assigned_to] || '56962078510';
      const vivUf = parseFloat(lead.valor_vivienda_uf) || 0;
      const finUf = parseFloat(lead.valor_financiamiento_uf) || 0;
      const vivClp = Math.round(vivUf * UF_CLP);
      const finClp = Math.round(finUf * UF_CLP);
      const uploadUrl = lead.doc_token ? `https://www.llavepropia.cl/documentos.html?t=${lead.doc_token}` : 'https://www.llavepropia.cl';
      const waTrackUrl = `https://www.llavepropia.cl/api/new-lead?action=wa-click&id=${lead.id}&wa=${waNum}`;
      const emailCount = (lead.engagement_email_count || 0) + 1;

      // Determine variant based on status + engagement
      let subject, heroBg, heroTitle, heroSub, bodyText;
      const st = lead.status || 'nuevo';

      if (['solicitando_documentos', 'esperando_documentos'].includes(st)) {
        subject = `${firstName}, estamos esperando tus documentos`;
        heroBg = 'linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%)';
        heroTitle = `${firstName}, no pierdas tu cupo`;
        heroSub = 'Necesitamos tus documentos para avanzar';
        bodyText = `Tu proceso de leasing habitacional está en pausa porque aún no recibimos tu documentación. <strong>Envíala ahora por WhatsApp</strong> para no perder tu cupo:`;
      } else if (['contactado'].includes(st)) {
        subject = `${firstName}, ¿seguimos con tu leasing?`;
        heroBg = 'linear-gradient(135deg,#1B3A6B 0%,#2DB89E 100%)';
        heroTitle = `${firstName}, tu ejecutiva te espera`;
        heroSub = 'Ya hablamos contigo — sigamos avanzando';
        bodyText = `Ya tuvimos un primer contacto contigo y queremos seguir avanzando con tu proceso. Para <strong>confirmar tu monto</strong>, necesitamos que nos envíes tus documentos por WhatsApp:`;
      } else if (['no_contesta'].includes(st)) {
        subject = `${firstName}, intentamos contactarte`;
        heroBg = 'linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%)';
        heroTitle = `${firstName}, no queremos que pierdas esta oportunidad`;
        heroSub = 'Intentamos llamarte pero no pudimos';
        bodyText = `Hemos intentado contactarte sin éxito. Tu estimación de leasing habitacional sigue vigente. <strong>Escríbenos por WhatsApp</strong> cuando puedas y retomamos tu proceso:`;
      } else if (lead.click_whatsapp) {
        subject = `${firstName}, ¿cómo va tu proceso de leasing?`;
        heroBg = 'linear-gradient(135deg,#1B3A6B 0%,#2DB89E 100%)';
        heroTitle = `${firstName}, tu proceso ya está en marcha`;
        heroSub = 'Ya iniciaste contacto con tu ejecutiva';
        bodyText = `Para <strong>confirmar tu monto de financiamiento</strong>, necesitamos que nos envíes tus documentos por WhatsApp lo antes posible:`;
      } else if (lead.acepto_monto) {
        subject = `${firstName}, tu monto aproximado de financiamiento`;
        heroBg = 'linear-gradient(135deg,#1B3A6B 0%,#2B7A4E 100%)';
        heroTitle = `${firstName}, tu estimación está lista`;
        heroSub = 'Revisaste la propuesta — solo falta un paso';
        bodyText = `Vimos que revisaste el monto aproximado de financiamiento. Para <strong>confirmar este monto</strong>, necesitamos que nos envíes tus documentos por WhatsApp:`;
      } else {
        subject = `${firstName}, esto es lo que podríamos financiarte`;
        heroBg = 'linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%)';
        heroTitle = `${firstName}, tienes un monto aproximado`;
        heroSub = 'Revisamos tu información — mira tu resultado';
        bodyText = `Analizamos la información que nos dejaste y tenemos buenas noticias: <strong>podrías acceder al Leasing Habitacional con subsidio del Estado</strong>.<br><br>Para confirmar este monto, envíanos tus documentos por WhatsApp:`;
      }

      // Add follow-up number to subject if not first email
      if (emailCount > 1) subject = `Recordatorio: ${subject}`;

      // Build monto card
      const subUf = vivUf > 0 ? Math.ceil(Math.max(Math.min(725 - vivUf * 0.375, 425), 125)) : 0;
      const subClp = Math.round(subUf * UF_CLP);
      const rentaLabel = lead.sueldo_liquido_raw || '—';
      const rentaCompLabel = lead.renta_complemento || null;
      const dicomLabel = lead.en_dicom === false ? 'Sin DICOM ✅' : lead.en_dicom === true ? 'En DICOM' : '';

      const montoCardHtml = (vivUf > 0 || finUf > 0) ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-radius:14px;overflow:hidden;border:2px solid #1B3A6B">
          <tr><td style="background:#1B3A6B;padding:14px 24px">
            <p style="margin:0;font-size:12px;color:#fff;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;text-align:center">Podrías optar a una vivienda de hasta</p>
          </td></tr>
          ${vivUf > 0 ? `<tr><td style="padding:28px 24px 20px;text-align:center;background:#fff">
            <p style="margin:0;color:#111;font-size:36px;font-weight:900;letter-spacing:-1px;line-height:1">${fmtClp(vivClp)}</p>
            <p style="margin:6px 0 0;color:#555;font-size:14px;font-weight:600">${fmtUf(vivUf)}</p>
          </td></tr>` : ''}
          <tr><td style="padding:0 24px 20px;background:#fff">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee">
              ${finUf > 0 ? `<tr>
                <td style="padding:14px 0 4px;color:#111;font-size:14px;font-weight:700">Financiamiento aprox.</td>
                <td align="right" style="padding:14px 0 4px;color:#111;font-size:16px;font-weight:800">${fmtClp(finClp)} <span style="color:#555;font-size:11px">(${fmtUf(finUf)})</span></td>
              </tr>` : ''}
              ${subUf > 0 ? `<tr>
                <td style="padding:4px 0;color:#111;font-size:14px;font-weight:700">Subsidio DS120</td>
                <td align="right" style="padding:4px 0;color:#2B7A4E;font-size:16px;font-weight:800">${fmtClp(subClp)} <span style="color:#555;font-size:11px">(${fmtUf(subUf)})</span></td>
              </tr>` : ''}
              <tr>
                <td style="padding:4px 0;color:#111;font-size:14px;font-weight:700">Pie inicial</td>
                <td align="right" style="padding:4px 0;color:#2B7A4E;font-size:16px;font-weight:900">$0</td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:12px 24px;background:#f8f7f4;border-top:1px solid #eee">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#111;font-size:13px;font-weight:700">Renta titular</td>
                <td align="right" style="color:#111;font-size:13px;font-weight:700">${rentaLabel}</td>
              </tr>
              ${rentaCompLabel ? `<tr>
                <td style="color:#111;font-size:13px;font-weight:700;padding-top:4px">Renta complemento</td>
                <td align="right" style="color:#111;font-size:13px;font-weight:700;padding-top:4px">${rentaCompLabel}</td>
              </tr>` : ''}
              ${dicomLabel ? `<tr>
                <td colspan="2" style="padding-top:6px;color:#2B7A4E;font-size:13px;font-weight:800">${dicomLabel}</td>
              </tr>` : ''}
            </table>
          </td></tr>
          <tr><td style="padding:8px 24px 10px;background:#f0eeea;border-top:1px solid #eee">
            <p style="margin:0;font-size:11px;color:#666;text-align:center">* Estimación preliminar sujeta a verificación de antecedentes.</p>
          </td></tr>
        </table>` : '';

      const emailHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:28px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <tr><td style="background:#fff;padding:20px 36px;border-bottom:1px solid #f0ece4">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="display:block;height:auto;max-width:140px">
  </td></tr>
  <tr><td style="background:${heroBg};padding:28px 36px">
    <p style="margin:0 0 6px;color:#fff;font-size:22px;font-weight:800;line-height:1.3">${heroTitle}</p>
    <p style="margin:0;color:rgba(255,255,255,0.75);font-size:14px">${heroSub}</p>
  </td></tr>
  <tr><td style="padding:28px 36px">
    <p style="margin:0 0 8px;font-size:15px;color:#444;line-height:1.75">${bodyText}</p>
    ${montoCardHtml}
    <div style="text-align:center;margin:24px 0 16px">
      <a href="${waTrackUrl}" target="_blank" style="display:inline-block;background:#25D366;color:#fff;font-size:18px;font-weight:900;padding:20px 48px;border-radius:16px;text-decoration:none;box-shadow:0 6px 20px rgba(37,211,102,0.35)">
        📄 Enviar documentos AHORA por WhatsApp
      </a>
    </div>
    <div style="margin:20px 0 0;background:#FEF3E2;border:1.5px solid rgba(230,126,34,0.3);border-radius:10px;padding:14px 18px;text-align:center">
      <p style="margin:0;font-size:14px;color:#1B3A6B;line-height:1.6;font-weight:900;text-transform:uppercase">⚠️ AVANZA SOLO SI ESTE MONTO TE SIRVE. TENEMOS MUCHAS SOLICITUDES Y LOS CUPOS SON LIMITADOS.</p>
    </div>
    <div style="margin:20px 0 0;background:#f8f7f4;border-radius:10px;padding:16px 18px">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1B3A6B;text-transform:uppercase;letter-spacing:1px">Documentos que necesitas enviar</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#555">
        ${['Cédula de identidad (ambos lados)','Últimas 6 liquidaciones de sueldo','Cotizaciones AFP (último año)','Informe de deudas CMF','Certificado de matrimonio o soltería'].map(d => `<tr><td style="padding:4px 0">• ${d}</td></tr>`).join('')}
      </table>
    </div>
  </td></tr>
  <tr><td style="padding:20px 36px;background:#fafaf8;border-top:1px solid #f0ece4">
    <p style="margin:0 0 4px;font-size:13px;color:#1B3A6B;font-weight:700">Equipo Llave Propia</p>
    <p style="margin:0;font-size:11px;color:#aaa">llavepropia.cl · Leasing Habitacional con subsidio del Estado</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

      try {
        const sendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Llave Propia <notificaciones@proppi.cl>',
            to: [lead.email],
            reply_to: ['contacto@llavepropia.cl', 'rodrigo.canas@llavepropia.cl'],
            subject,
            html: emailHtml
          })
        });
        const sendData = await sendRes.json();
        console.log(`[${isWeekly ? 'weekly' : 'backlog'}] email #${emailCount} to ${lead.email} (${st}):`, sendData?.id || sendData);

        await fetch(`${crmBase}/leads?id=eq.${lead.id}`, {
          method: 'PATCH',
          headers: { ...crmHeaders, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ engagement_email_sent: true, engagement_email_count: emailCount, last_engagement_email_at: new Date().toISOString() })
        });
        sentCount++;
        sentList.push({ name: lead.name, email: lead.email, status: st, variant: emailCount === 1 ? 'first' : `followup_${emailCount}` });
      } catch (e) {
        console.error(`[${isWeekly ? 'weekly' : 'backlog'}] Error sending to ${lead.email}:`, e.message);
      }
    }

    return res.status(200).json({ ok: true, sent: sentCount, leads: sentList });
  }

  const { nombre, telefono, email, arriendo, renta, dicom, contrato, vivienda, tiene_propiedad_vista, comuna_propiedad, precio_propiedad_ok, complementa_renta, renta_complemento, cuando_comprar, fuente, utm_source, utm_medium, utm_campaign, renta_liquida, monto_propiedad, valor_vivienda_uf, valor_financiamiento_uf, rut, edad, tipo_trabajador, tipo_ingreso_independiente, antiguedad_independiente, acredita_ingresos } = req.body || {};
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
    body: JSON.stringify({ nombre, telefono, email, arriendo, renta, dicom, contrato, vivienda, tiene_propiedad_vista, comuna_propiedad, precio_propiedad_ok, complementa_renta, renta_complemento, cuando_comprar, fuente, utm_source, utm_medium, utm_campaign, renta_liquida, monto_propiedad, rut, edad, tipo_trabajador, tipo_ingreso_independiente, antiguedad_independiente, acredita_ingresos })
  });
  if (r1.ok) { saved = true; }
  if (!saved) {
    const r = await fetch(SUPA_URL, {
      method: 'POST', headers: supaHeaders,
      body: JSON.stringify({ nombre, telefono, email, arriendo, renta, dicom, contrato, vivienda, fuente })
    });
    saved = r.ok;
  }

  // Detect hipotecario leads early
  const fLowerEarly = (fuente || '').toLowerCase();
  const isHipotecarioLead = fLowerEarly.includes('hipotecario') || fLowerEarly.includes('mutuo') || fLowerEarly.includes('credito');

  // 1b. Dual-write to CRM Supabase (leads table) with round-robin assignment
  // Skip CRM insert for hipotecario leads — they only go to crm-hipotecarios
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
  const EJECUTIVA_NAMES = { [KARINA_ID]: 'Karina Valenzuela', [COMERCIAL_ID]: 'Comercial' };
  let assignedTo = KARINA_ID;
  try {
    const crmBase = 'https://evuxdhvvarfxredghvpu.supabase.co/rest/v1';
    const crmHeaders = { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY };
    const lastRes = await fetch(`${crmBase}/leads?is_demo=eq.false&select=assigned_to&order=created_at.desc&limit=1`, { headers: crmHeaders });
    const lastData = await lastRes.json();
    const lastAssigned = lastData?.[0]?.assigned_to;
    assignedTo = lastAssigned === KARINA_ID ? COMERCIAL_ID : KARINA_ID;
  } catch {}

  if (!isHipotecarioLead) {
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
      valor_vivienda_uf: valor_vivienda_uf || null,
      valor_financiamiento_uf: valor_financiamiento_uf || null,
      tipo_trabajador: tipo_trabajador || null,
      tipo_ingreso_independiente: tipo_ingreso_independiente || null,
      antiguedad_independiente: antiguedad_independiente || null,
      acredita_ingresos: acredita_ingresos || null,
    };
    await fetch(CRM_URL, {
      method: 'POST',
      headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify(crmLead),
    }).catch(() => null);
  }

  // 2. Notification email to team
  const tipoTrabLabel  = tipo_trabajador === 'dependiente' ? '👔 Dependiente' : tipo_trabajador === 'independiente' ? '📋 Independiente' : '—';
  const contratoLabel  = contrato === 'si' ? '✅ Sí' : contrato === 'no' ? '❌ No' : contrato === 'independiente' ? '— (independiente)' : '—';
  const tipoIngresoLabels = { boletas_honorarios: 'Boletas de honorarios', facturas_rut: 'Facturas con RUT (persona natural)', socio_empresa: 'Socio empresa (liquidaciones/retiros)' };
  const tipoIngresoLabel = tipoIngresoLabels[tipo_ingreso_independiente] || '—';
  const antiguedadLabels = { entre_1_2_anos: '1-2 años', mas_2_anos: 'Más de 2 años' };
  const antiguedadLabel = antiguedadLabels[antiguedad_independiente] || '—';
  const acreditaLabels = { boletas_honorarios: 'Boletas de honorarios', dai_balance: 'DAI y balance' };
  const acreditaLabel = acreditaLabels[acredita_ingresos] || '—';
  const viviendaLabel  = vivienda === 'si' ? '❌ Sí (tiene vivienda)' : vivienda === 'no' ? '✅ No' : '—';
  const dicomLabel     = dicom === 'si' ? '❌ Sí (en DICOM)' : dicom === 'no' ? '✅ No' : '—';
  const propVistaLabel = tiene_propiedad_vista === 'si' ? ('✅ Sí' + (comuna_propiedad ? ' — ' + comuna_propiedad : '')) : tiene_propiedad_vista === 'no' ? '⚠️ No tiene propiedad vista' : '—';
  const precioOkLabel = precio_propiedad_ok ? '✅ ' + precio_propiedad_ok : '—';
  const complementaLabel = complementa_renta || '—';
  const rentaCompLabel = renta_complemento || '—';
  const cuandoComprarLabel = cuando_comprar === 'lo_antes_posible' ? '🔥 Lo antes posible' : cuando_comprar === 'dentro_3_meses' ? '📅 Dentro de 3 meses' : cuando_comprar === 'mas_3_meses' ? '📆 En más de 3 meses' : '—';
  const now = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  const fLower = (fuente || '').toLowerCase();
  const isHipotecario = fLower.includes('hipotecario') || fLower.includes('mutuo') || fLower.includes('credito');
  const producto = isHipotecario ? 'Credito Hipotecario' : 'Leasing DS120';
  const waPhone = (telefono || '').replace(/\D/g, '').replace(/^0/, '56');

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Nuevo Lead</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:28px 16px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
  <tr><td style="background:${isHipotecario ? 'linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%)' : 'linear-gradient(135deg,#1B3A6B 0%,#2DB89E 100%)'};padding:22px 32px">
    <p style="margin:0;color:rgba(255,255,255,0.65);font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase">Llave Propia · Nuevo Lead</p>
    <p style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700;line-height:1.2">${nombre}</p>
    <p style="margin:5px 0 0;color:rgba(255,255,255,0.6);font-size:12px">${producto} · ${now}</p>
  </td></tr>
  <tr><td style="padding:26px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      ${(isHipotecario ? [
        ['📱 WhatsApp',             telefono || '—'],
        ['✉️ Email',                email    || '—'],
        ['🪪 RUT',                   rut      || '—'],
        ['🎂 Edad',                  edad ? edad + ' años' : '—'],
        ['💰 Renta líquida',        renta_liquida || renta || '—'],
        ['🏠 Valor propiedad (UF)', monto_propiedad || '—'],
        ['⚠️ En DICOM',             dicomLabel],
        ['📌 Fuente',               fuente   || '—'],
      ] : [
        ['📱 WhatsApp',             telefono || '—'],
        ['✉️ Email',                email    || '—'],
        ['💰 Renta mensual',        renta    || '—'],
        ['💼 Tipo trabajador',      tipoTrabLabel],
        ...(tipo_trabajador === 'independiente' ? [
          ['📋 Tipo ingreso',        tipoIngresoLabel],
          ['⏳ Antigüedad indep.',   antiguedadLabel],
          ['📄 Acredita ingresos',   acreditaLabel],
        ] : [
          ['📋 Contrato indefinido',  contratoLabel],
        ]),
        ...(vivienda ? [['🏡 Tiene vivienda propia', viviendaLabel]] : []),
        ['🏠 Propiedad vista',      propVistaLabel],
        ['💲 Valor propiedad',       precioOkLabel],
        ['👥 Complementa renta',    complementaLabel],
        ['💰 Renta complemento',    rentaCompLabel],
        ['⚠️ En DICOM',             dicomLabel],
        ['🗓️ Cuándo comprar',       cuandoComprarLabel],
        ['📌 Fuente',               fuente   || '—'],
      ]).map(([label, val]) => `
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
      from:    'Llave Propia <notificaciones@proppi.cl>',
      to:      ['rodrigo.canas@llavepropia.cl'],
      bcc:     ['vicente@llavepropia.cl', ejecutivaEmail],
      subject: `🏠 Nuevo lead: ${nombre} — ${producto}`,
      html
    })
  });

  // 3. Engagement email directly to the lead (immediate, replaces 2-min cron)
  const fuenteLower = (fuente || '').toLowerCase();
  const isLeasing = !fuenteLower.includes('mutuo') && !fuenteLower.includes('hipotecario') && !fuenteLower.includes('credito');
  if (isLeasing && email && valor_vivienda_uf) {
    try {
    const firstNameE = (nombre || '').trim().split(' ')[0] || nombre || 'Postulante';
    const waNumE = { [KARINA_ID]: '56962078510', [COMERCIAL_ID]: '56957852275' }[assignedTo] || '56962078510';
    const UF_CLP_E = 38800;
    const vivUfE = parseFloat(valor_vivienda_uf) || 0;
    const finUfE = parseFloat(valor_financiamiento_uf) || 0;
    const vivClpE = Math.round(vivUfE * UF_CLP_E);
    const finClpE = Math.round(finUfE * UF_CLP_E);
    const fmtClpE = (n) => '$' + n.toLocaleString('es-CL');
    const fmtUfE = (n) => n.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' UF';
    const subUfE = vivUfE > 0 ? Math.ceil(Math.max(Math.min(725 - vivUfE * 0.375, 425), 125)) : 0;
    const subClpE = Math.round(subUfE * UF_CLP_E);
    const rentaLabelE = renta || '—';
    const rentaCompLabelE = renta_complemento || null;
    const dicomLabelE = dicom === 'no' ? 'Sin DICOM ✅' : '';

    // Find CRM lead ID for wa-click tracking
    const crmBaseE = 'https://evuxdhvvarfxredghvpu.supabase.co/rest/v1';
    const crmHeadersE = { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY, 'Content-Type': 'application/json' };
    let crmLeadId = '';
    try {
      const findRes = await fetch(`${crmBaseE}/leads?email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1&select=id`, { headers: crmHeadersE });
      const findData = await findRes.json();
      crmLeadId = findData?.[0]?.id || '';
    } catch {}
    const waTrackUrlE = crmLeadId ? `https://www.llavepropia.cl/api/new-lead?action=wa-click&id=${crmLeadId}&wa=${waNumE}` : `https://wa.me/${waNumE}?text=Hola%2C%20escribo%20para%20enviar%20mis%20documentos%20y%20formalizar%20evaluaci%C3%B3n%20para%20comprar%20una%20vivienda`;

    const subjectE = `${firstNameE}, esto es lo que podríamos financiarte`;
    const montoCardE = (vivUfE > 0 || finUfE > 0) ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-radius:14px;overflow:hidden;border:2px solid #1B3A6B">
          <tr><td style="background:#1B3A6B;padding:14px 24px">
            <p style="margin:0;font-size:12px;color:#fff;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;text-align:center">Podrías optar a una vivienda de hasta</p>
          </td></tr>
          ${vivUfE > 0 ? `<tr><td style="padding:28px 24px 20px;text-align:center;background:#fff">
            <p style="margin:0;color:#111;font-size:36px;font-weight:900;letter-spacing:-1px;line-height:1">${fmtClpE(vivClpE)}</p>
            <p style="margin:6px 0 0;color:#555;font-size:14px;font-weight:600">${fmtUfE(vivUfE)}</p>
          </td></tr>` : ''}
          <tr><td style="padding:0 24px 20px;background:#fff">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee">
              ${finUfE > 0 ? `<tr>
                <td style="padding:14px 0 4px;color:#111;font-size:14px;font-weight:700">Financiamiento aprox.</td>
                <td align="right" style="padding:14px 0 4px;color:#111;font-size:16px;font-weight:800">${fmtClpE(finClpE)} <span style="color:#555;font-size:11px">(${fmtUfE(finUfE)})</span></td>
              </tr>` : ''}
              ${subUfE > 0 ? `<tr>
                <td style="padding:4px 0;color:#111;font-size:14px;font-weight:700">Subsidio DS120</td>
                <td align="right" style="padding:4px 0;color:#2B7A4E;font-size:16px;font-weight:800">${fmtClpE(subClpE)} <span style="color:#555;font-size:11px">(${fmtUfE(subUfE)})</span></td>
              </tr>` : ''}
              <tr>
                <td style="padding:4px 0;color:#111;font-size:14px;font-weight:700">Pie inicial</td>
                <td align="right" style="padding:4px 0;color:#2B7A4E;font-size:16px;font-weight:900">$0</td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:12px 24px;background:#f8f7f4;border-top:1px solid #eee">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#111;font-size:13px;font-weight:700">Renta titular</td>
                <td align="right" style="color:#111;font-size:13px;font-weight:700">${rentaLabelE}</td>
              </tr>
              ${rentaCompLabelE ? `<tr>
                <td style="color:#111;font-size:13px;font-weight:700;padding-top:4px">Renta complemento</td>
                <td align="right" style="color:#111;font-size:13px;font-weight:700;padding-top:4px">${rentaCompLabelE}</td>
              </tr>` : ''}
              ${dicomLabelE ? `<tr>
                <td colspan="2" style="padding-top:6px;color:#2B7A4E;font-size:13px;font-weight:800">${dicomLabelE}</td>
              </tr>` : ''}
            </table>
          </td></tr>
          <tr><td style="padding:8px 24px 10px;background:#f0eeea;border-top:1px solid #eee">
            <p style="margin:0;font-size:11px;color:#666;text-align:center">* Estimación preliminar sujeta a verificación de antecedentes.</p>
          </td></tr>
        </table>` : '';

    const engagementHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:28px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <tr><td style="background:#fff;padding:20px 36px;border-bottom:1px solid #f0ece4">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="display:block;height:auto;max-width:140px">
  </td></tr>
  <tr><td style="background:linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%);padding:28px 36px">
    <p style="margin:0 0 6px;color:#fff;font-size:22px;font-weight:800;line-height:1.3">${firstNameE}, tienes un monto aproximado</p>
    <p style="margin:0;color:rgba(255,255,255,0.75);font-size:14px">Revisamos tu información — mira tu resultado</p>
  </td></tr>
  <tr><td style="padding:28px 36px">
    <p style="margin:0 0 8px;font-size:15px;color:#444;line-height:1.75">Analizamos la información que nos dejaste y tenemos buenas noticias: <strong>podrías acceder al Leasing Habitacional con subsidio del Estado</strong>.<br><br>Para confirmar este monto, envíanos tus documentos por WhatsApp:</p>
    ${montoCardE}
    <div style="text-align:center;margin:24px 0 16px">
      <a href="${waTrackUrlE}" target="_blank" style="display:inline-block;background:#25D366;color:#fff;font-size:18px;font-weight:900;padding:20px 48px;border-radius:16px;text-decoration:none;box-shadow:0 6px 20px rgba(37,211,102,0.35)">
        📄 Enviar documentos AHORA por WhatsApp
      </a>
    </div>
    <div style="margin:20px 0 0;background:#FEF3E2;border:1.5px solid rgba(230,126,34,0.3);border-radius:10px;padding:14px 18px;text-align:center">
      <p style="margin:0;font-size:14px;color:#1B3A6B;line-height:1.6;font-weight:900;text-transform:uppercase">⚠️ AVANZA SOLO SI ESTE MONTO TE SIRVE. TENEMOS MUCHAS SOLICITUDES Y LOS CUPOS SON LIMITADOS.</p>
    </div>
    <div style="margin:20px 0 0;background:#f8f7f4;border-radius:10px;padding:16px 18px">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1B3A6B;text-transform:uppercase;letter-spacing:1px">Documentos que necesitas enviar</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#555">
        ${['Cédula de identidad (ambos lados)','Últimas 6 liquidaciones de sueldo','Cotizaciones AFP (último año)','Informe de deudas CMF','Certificado de matrimonio o soltería'].map(d => `<tr><td style="padding:4px 0">• ${d}</td></tr>`).join('')}
      </table>
    </div>
  </td></tr>
  <tr><td style="padding:20px 36px;background:#fafaf8;border-top:1px solid #f0ece4">
    <p style="margin:0 0 4px;font-size:13px;color:#1B3A6B;font-weight:700">Equipo Llave Propia</p>
    <p style="margin:0;font-size:11px;color:#aaa">llavepropia.cl · Leasing Habitacional con subsidio del Estado</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Llave Propia <notificaciones@proppi.cl>',
        to: [email],
        reply_to: ['contacto@llavepropia.cl', 'rodrigo.canas@llavepropia.cl'],
        subject: subjectE,
        html: engagementHtml
      })
    });

    // Mark engagement email sent in CRM
    if (crmLeadId) {
      await fetch(`${crmBaseE}/leads?id=eq.${crmLeadId}`, {
        method: 'PATCH',
        headers: { ...crmHeadersE, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ engagement_email_sent: true, engagement_email_count: 1, last_engagement_email_at: new Date().toISOString() })
      });
    }
    console.log(`[engagement-inline] Sent to ${email}`);
    } catch (engErr) { console.error('[engagement-inline] Error:', engErr.message); }

    // OLD CODE BELOW — SKIP
    if (false) {
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
      : `Felicidades ${firstName}, estás pre-aprobado!`;
    const subtitleText = isCondicionado
      ? 'Pre-aprobado condicionado para Leasing Habitacional'
      : 'Pre-aprobado para Leasing Habitacional';
    const introText = isCondicionado
      ? `Según la información que nos enviaste, <strong>podrias acceder al Leasing Habitacional con subsidio del Estado</strong>, condicionado a que complementes tu renta con otra persona. Para confirmar tu pre-aprobación, necesitamos verificar tu documentación.`
      : `Según la información que nos enviaste, <strong>calificas para comprar tu vivienda con subsidio del Estado</strong> a través del Leasing Habitacional DS120. Para formalizar tu proceso de compra, necesitamos verificar tu documentación.`;
    const urgencyText = isCondicionado
      ? 'Los cupos para complementar renta son limitados. Confirma tu pre-aprobación lo antes posible.'
      : 'Tu pre-aprobación tiene vigencia limitada. Asegura tu cupo enviando tus documentos ahora.';

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
      <p style="font-size:15px;color:rgba(255,255,255,0.9);margin:0 0 24px;line-height:1.5">Revisa tu pre-aprobación y sube tus documentos para avanzar con la compra de tu vivienda.</p>
      <a href="${uploadUrl}" target="_blank" style="display:inline-block;background:#fff;color:#1B3A6B;font-size:18px;font-weight:900;padding:18px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(0,0,0,0.15)">REVISA TU PRE-APROBACIÓN</a>
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
      <a href="${uploadUrl}" target="_blank" style="display:inline-block;background:#2DB89E;color:#fff;font-size:16px;font-weight:900;padding:16px 40px;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(45,184,158,0.3)">VER MI PRE-APROBACIÓN</a>
    </div>
    <p style="font-size:13px;color:#888;margin:0 0 16px;text-align:center">También puedes enviarlos respondiendo este correo o por WhatsApp:</p>
    <div style="text-align:center;margin:0 0 8px">
      <a href="https://wa.me/${assignedTo === COMERCIAL_ID ? '56957852275' : '56962078510'}" target="_blank" style="display:inline-block;background:#25D366;color:#fff;font-size:14px;font-weight:800;padding:12px 32px;border-radius:12px;text-decoration:none">WhatsApp</a>
    </div>
  </div>
  <div style="background:#F7F0E6;padding:18px 28px;text-align:center;border-top:1px solid #EDE3D4">
    <p style="font-size:13px;color:#9A8878;margin:0;line-height:1.6">Saludos,<br><strong style="color:#1B3A6B">Equipo Llave Propia</strong></p>
    <p style="font-size:10px;color:#BBA88A;margin:10px 0 0;line-height:1.5">* Esta pre-aprobación es preliminar y está basada en la información declarada. La aprobación definitiva está sujeta a verificación de antecedentes y evaluación de la entidad financiera.</p>
  </div>
</div>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Llave Propia <notificaciones@proppi.cl>',
        to: [email],
        reply_to: ['rodrigo.canas@llavepropia.cl', 'vicente@llavepropia.cl'],
        subject: isCondicionado ? `${firstName}, tenemos novedades sobre tu evaluación` : `Tu resultado de pre-evaluación está listo, ${firstName}`,
        html: preApprovalHtml
      })
    }).catch(() => null);
  }

  // 3b. Welcome email for hipotecario leads (1-to-1, no CC)
  if (!isLeasing && email) {
    const firstNameH = (nombre || '').trim().split(' ')[0] || nombre;
    const welcomeHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef3f2;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f2;padding:28px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06)">
  <tr><td style="background:#1B2B3E;padding:28px 36px;text-align:center">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="150" style="display:inline-block;height:auto;max-width:150px">
  </td></tr>
  <tr><td style="padding:32px 36px 0">
    <p style="margin:0 0 18px;font-size:21px;font-weight:700;color:#1B2B3E;line-height:1.3">Hola ${firstNameH},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.75">
      Recibimos tu solicitud de credito hipotecario. Nuestro equipo ya tiene tus datos y se pondra en contacto contigo.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.75">
      Para iniciar la evaluacion, requerimos la siguiente documentacion:
    </p>
  </td></tr>
  <tr><td style="padding:0 36px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #c8e2dc;border-radius:10px;overflow:hidden;margin:0 0 14px">
      <tr><td style="background:#2BA89C;padding:10px 18px">
        <p style="margin:0;color:#fff;font-size:12px;font-weight:700;letter-spacing:1px">TRABAJADORES DEPENDIENTES</p>
      </td></tr>
      <tr><td style="padding:16px 18px;background:#f7fbfa">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${['Copia de cedula de identidad (ambos lados)','6 ultimas liquidaciones de sueldo','Certificado de cotizaciones AFP (ultimos 24 meses con RUT del empleador)','Informe de deudas CMF'].map(doc => `
          <tr><td style="padding:5px 0;border-bottom:1px solid #e5eeec">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:20px;vertical-align:top;padding-top:3px;color:#2BA89C;font-size:13px;font-weight:700">&#8226;</td>
              <td style="padding-left:6px;font-size:13px;color:#333;line-height:1.55">${doc}</td>
            </tr></table>
          </td></tr>`).join('')}
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 36px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #c8d4d8;border-radius:10px;overflow:hidden;margin:0 0 24px">
      <tr><td style="background:#1B2B3E;padding:10px 18px">
        <p style="margin:0;color:#fff;font-size:12px;font-weight:700;letter-spacing:1px">TRABAJADORES INDEPENDIENTES</p>
      </td></tr>
      <tr><td style="padding:16px 18px;background:#f7fafb">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${['Copia de cedula de identidad (ambos lados)','Carpeta tributaria (empresa y personal)','Malla societaria o escritura con porcentaje de participacion','Boletas de honorarios de los ultimos 6 periodos','Informe de deudas CMF','Balances 2024-2025','Formulario 22 compacto 2024-2025 (personal y de la empresa)'].map(doc => `
          <tr><td style="padding:5px 0;border-bottom:1px solid #e5eaed">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:20px;vertical-align:top;padding-top:3px;color:#1B2B3E;font-size:13px;font-weight:700">&#8226;</td>
              <td style="padding-left:6px;font-size:13px;color:#333;line-height:1.55">${doc}</td>
            </tr></table>
          </td></tr>`).join('')}
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 36px">
    <p style="margin:0 0 10px;font-size:14px;color:#444;line-height:1.7">
      Puedes enviar tus documentos respondiendo este correo a <strong style="color:#1B2B3E">contacto@llavepropia.cl</strong>, o directamente por WhatsApp:
    </p>
  </td></tr>
  <tr><td style="padding:16px 36px 0" align="center">
    <table cellpadding="0" cellspacing="0" style="background:#25D366;border-radius:14px;box-shadow:0 4px 18px rgba(37,211,102,0.3)">
      <tr><td style="padding:18px 44px" align="center">
        <a href="https://wa.me/56976302641?text=Hola%2C%20quiero%20enviar%20mis%20documentos%20para%20el%20credito%20hipotecario" target="_blank" style="color:#fff;text-decoration:none;display:block;text-align:center">
          <p style="margin:0 0 2px;font-size:18px;font-weight:800">Hablar con ejecutiva</p>
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.8);font-weight:600">Iniciar evaluacion por WhatsApp</p>
        </a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:28px 36px 28px">
    <hr style="border:none;border-top:1px solid #e0e8e6;margin:0 0 18px">
    <p style="margin:0;font-size:13px;color:#1B2B3E;font-weight:700">Equipo Llave Propia</p>
    <p style="margin:3px 0 0;font-size:12px;color:#999">contacto@llavepropia.cl · <a href="https://www.llavepropia.cl" style="color:#2BA89C">llavepropia.cl</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Llave Propia <notificaciones@proppi.cl>',
        to: [email],
        reply_to: ['contacto@llavepropia.cl', 'pia@llavepropia.cl'],
        subject: 'Tu solicitud de credito hipotecario — Llave Propia',
        html: welcomeHtml
      })
    }).catch(() => null);
  } // end if(false) old code
  } // end if(isLeasing && email)

  // 4. Send WhatsApp welcome template via Kapso
  const KAPSO_API_KEY = (process.env.KAPSO_API_KEY || '').trim();
  const BOT_PHONE_ID = (process.env.WHATSAPP_PHONE_ID || '').trim();
  const KAPSO_BASE = 'https://api.kapso.ai/meta/whatsapp/v24.0';
  // Normalize to 569XXXXXXXX (digits only, no +)
  const rawDigits = (telefono || '').replace(/\D/g, '');
  const botPhone = rawDigits.match(/^(?:56)?(9\d{8})$/)?.[0]
    ? (rawDigits.startsWith('56') ? rawDigits : '56' + rawDigits.match(/(9\d{8})$/)[1])
    : '';

  // Check if WhatsApp flow is enabled
  const SUPA_KEY_BOT = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  let waFlowActive = true;
  try {
    const cfgR = await fetch(`${process.env.SUPABASE_URL?.trim()}/rest/v1/bot_config?key=eq.followup_config&select=value`, {
      headers: { apikey: SUPA_KEY_BOT, Authorization: 'Bearer ' + SUPA_KEY_BOT, 'Content-Type': 'application/json' }
    });
    const cfgRows = await cfgR.json();
    if (cfgRows?.[0]?.value) {
      const cfg = JSON.parse(cfgRows[0].value);
      if (cfg.active === false) waFlowActive = false;
    }
  } catch(e) { console.error('Failed to check followup config:', e.message); }

  if (KAPSO_API_KEY && BOT_PHONE_ID && botPhone && waFlowActive && !isHipotecarioLead) {
    try {
      const firstName = (nombre || '').trim().split(' ')[0] || nombre;
      const templateResult = await fetch(`${KAPSO_BASE}/${BOT_PHONE_ID}/messages`, {
        method: 'POST',
        headers: { 'X-API-Key': KAPSO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: botPhone,
          type: 'template',
          template: {
            name: 'bienvenida_mas_comercial_fin',
            language: { code: 'es_CL' },
            components: [{
              type: 'body',
              parameters: [{ type: 'text', parameter_name: 'customer_name', text: firstName }],
            }],
          },
        }),
      });
      const templateData = await templateResult.json();
      console.log(`Welcome template sent to ${botPhone}:`, JSON.stringify(templateData));

      // Create conversation + lead_profile for bot
      const sbBot = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };
      const nowISO = new Date().toISOString();

      // Save template message
      await fetch(`${process.env.SUPABASE_URL?.trim()}/rest/v1/whatsapp_messages`, {
        method: 'POST',
        headers: sbBot,
        body: JSON.stringify({ phone: botPhone, role: 'assistant', content: '[PLANTILLA: bienvenida_mas_comercial_fin]', bot_phone: BOT_PHONE_ID }),
      });

      // Create/update conversation
      await fetch(`${process.env.SUPABASE_URL?.trim()}/rest/v1/whatsapp_conversations`, {
        method: 'POST',
        headers: { ...sbBot, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          phone: botPhone,
          bot_phone: BOT_PHONE_ID,
          bot_enabled: true,
          name: nombre || null,
          last_message: '[PLANTILLA: bienvenida_mas_comercial_fin]',
          last_message_at: nowISO,
          updated_at: nowISO,
          template_sent_at: nowISO,
          followup_count: 0,
          reengagement_count: 0,
          source: fuente || null,
          assigned_name: EJECUTIVA_NAMES[assignedTo] || null,
        }),
      });

      // Create lead_profile
      await fetch(`${process.env.SUPABASE_URL?.trim()}/rest/v1/lead_profiles`, {
        method: 'POST',
        headers: { ...sbBot, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          phone: botPhone,
          name: nombre,
          employment_type: tipo_trabajador === 'dependiente' ? 'dependent' : tipo_trabajador === 'independiente' ? 'independent' : (contrato === 'si' ? 'dependent' : 'unknown'),
          has_property_in_mind: tiene_propiedad_vista === 'si' ? 'true' : tiene_propiedad_vista === 'no' ? 'false' : 'unknown',
          comuna: comuna_propiedad || null,
          complements_income: complementa_renta === 'si' ? 'true' : complementa_renta === 'no' ? 'false' : 'unknown',
        }),
      });
    } catch (e) {
      console.error('WhatsApp welcome template error:', e);
    }
  }

  const WA_MAP = { [KARINA_ID]: '56962078510', [COMERCIAL_ID]: '56957852275' };
  return res.status(200).json({ saved, emailed: emailRes.ok, wa: WA_MAP[assignedTo] || '56962078510' });
}
