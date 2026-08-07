export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co';
  const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const BUCKET = 'lead-documents';

  const action = req.query.action || req.body?.action;

  // ─── PORTAL: Get lead info + uploaded docs ───
  if (action === 'portal') {
    const token = req.query.t;
    if (!token) return res.status(400).json({ error: 'Token requerido' });

    const leadRes = await fetch(`${CRM_URL}/rest/v1/leads?doc_token=eq.${token}&select=id,name,phone,email`, {
      headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY }
    });
    const leads = await leadRes.json();
    if (!leads.length) return res.status(404).json({ error: 'Token invalido' });

    const lead = leads[0];
    const docsRes = await fetch(`${CRM_URL}/rest/v1/lead_documents?lead_id=eq.${lead.id}&select=id,doc_type,file_name,file_size,uploaded_at&order=uploaded_at.asc`, {
      headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY }
    });
    const docs = await docsRes.json();
    return res.status(200).json({ lead_id: lead.id, name: lead.name, docs: Array.isArray(docs) ? docs : [] });
  }

  // ─── SIGNED-URL: Create signed upload URL ───
  if (action === 'signed-url') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { token, doc_type, file_name } = req.body || {};
    if (!token || !doc_type || !file_name) return res.status(400).json({ error: 'Faltan campos' });

    const leadRes = await fetch(`${CRM_URL}/rest/v1/leads?doc_token=eq.${token}&select=id`, {
      headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY }
    });
    const leads = await leadRes.json();
    if (!leads.length) return res.status(404).json({ error: 'Token invalido' });

    const leadId = leads[0].id;
    const safeName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${leadId}/${doc_type}/${Date.now()}_${safeName}`;

    const signRes = await fetch(`${CRM_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
      method: 'POST',
      headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!signRes.ok) {
      const err = await signRes.text();
      return res.status(500).json({ error: 'No se pudo crear URL', detail: err });
    }
    const signData = await signRes.json();
    return res.status(200).json({ upload_url: `${CRM_URL}/storage/v1${signData.url}`, path, lead_id: leadId });
  }

  // ─── CONFIRM: Record upload + notify ───
  if (action === 'confirm') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { token, lead_id, doc_type, file_name, file_path, file_size } = req.body || {};
    if (!token || !lead_id || !doc_type || !file_name || !file_path) return res.status(400).json({ error: 'Faltan campos' });

    const leadRes = await fetch(`${CRM_URL}/rest/v1/leads?doc_token=eq.${token}&select=id,name,phone,email,assigned_to`, {
      headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY }
    });
    const leads = await leadRes.json();
    if (!leads.length || leads[0].id !== lead_id) return res.status(403).json({ error: 'Token invalido' });
    const lead = leads[0];
    const COMERCIAL_ID = '9f156deb-c219-4b51-b454-5a4692629332';
    const ejecutivaEmail = lead.assigned_to === COMERCIAL_ID ? 'comercial@llavepropia.cl' : 'karina.valenzuela@llavepropia.cl';

    const docRes = await fetch(`${CRM_URL}/rest/v1/lead_documents`, {
      method: 'POST',
      headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ lead_id, doc_type, file_name, file_path, storage_path: file_path, file_size: file_size || 0 })
    });
    if (!docRes.ok) return res.status(500).json({ error: 'No se pudo guardar' });

    const docLabels = {
      cedula: 'Cédula de identidad', cedula_frontal: 'Cédula - Frontal', cedula_trasera: 'Cédula - Trasera',
      liquidaciones: 'Liquidaciones de sueldo', cotizaciones_afp: 'Cotizaciones AFP',
      contrato_trabajo: 'Contrato de trabajo', deuda_cmf: 'Deuda CMF', certificado_matrimonio: 'Cert. matrimonio',
      carpeta_tributaria: 'Carpeta tributaria', boletas_honorarios: 'Boletas de honorarios',
      comp_cedula: 'Comp. - Cédula', comp_cedula_frontal: 'Comp. - Cédula Frontal', comp_cedula_trasera: 'Comp. - Cédula Trasera',
      comp_liquidaciones: 'Comp. - Liquidaciones',
      comp_cotizaciones_afp: 'Comp. - Cotizaciones AFP', comp_contrato_trabajo: 'Comp. - Contrato',
      comp_deuda_cmf: 'Comp. - Deuda CMF', comp_certificado_matrimonio: 'Comp. - Cert. matrimonio',
    };
    const docLabel = docLabels[doc_type] || doc_type;

    const html = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:500px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e5e5;overflow:hidden">
  <div style="background:linear-gradient(135deg,#1B3A6B,#2DB89E);padding:20px 24px;text-align:center">
    <p style="margin:0;color:#fff;font-size:18px;font-weight:700">Nuevo documento subido</p>
  </div>
  <div style="padding:24px">
    <p style="margin:0 0 12px;font-size:15px;color:#333"><strong>${lead.name}</strong> ha subido un documento:</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:14px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;width:40%">Documento</td><td style="padding:8px 0;border-bottom:1px solid #eee;color:#1B3A6B;font-weight:600">${docLabel}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Archivo</td><td style="padding:8px 0;border-bottom:1px solid #eee;color:#333">${file_name}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Telefono</td><td style="padding:8px 0;border-bottom:1px solid #eee;color:#333">${lead.phone || '-'}</td></tr>
      <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0;color:#333">${lead.email || '-'}</td></tr>
    </table>
    <div style="margin-top:20px;text-align:center">
      <a href="https://www.llavepropia.cl/crm" style="display:inline-block;background:#1B3A6B;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none">Ver en CRM</a>
    </div>
  </div></div>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Llave Propia <notificaciones@proppi.cl>',
        to: [ejecutivaEmail],
        cc: ['rodrigo.canas@llavepropia.cl', 'vicente@llavepropia.cl'],
        subject: `Documento subido: ${lead.name} - ${docLabel}`,
        html
      })
    }).catch(() => null);

    return res.status(200).json({ ok: true });
  }

  // ─── REQUEST: Send email requesting docs ───
  if (action === 'request') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { lead_id } = req.body || {};
    if (!lead_id) return res.status(400).json({ error: 'lead_id requerido' });

    const leadRes = await fetch(`${CRM_URL}/rest/v1/leads?id=eq.${lead_id}&select=id,name,email,doc_token,assigned_to`, {
      headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY }
    });
    const leads = await leadRes.json();
    if (!leads.length) return res.status(404).json({ error: 'Lead no encontrado' });
    const lead = leads[0];
    if (!lead.email) return res.status(400).json({ error: 'Lead no tiene email' });

    const uploadUrl = `https://www.llavepropia.cl/documentos.html?t=${lead.doc_token}`;
    const firstName = (lead.name || '').trim().split(' ')[0] || 'Cliente';
    const COMERCIAL_ID_REQ = '9f156deb-c219-4b51-b454-5a4692629332';
    const waNum = lead.assigned_to === COMERCIAL_ID_REQ ? '56957852275' : '56962078510';
    const ejecutivaEmailReq = lead.assigned_to === COMERCIAL_ID_REQ ? 'comercial@llavepropia.cl' : 'karina.valenzuela@llavepropia.cl';

    const html = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#FEFCF7;border-radius:16px;overflow:hidden;border:1px solid #EDE3D4">
  <div style="background:linear-gradient(135deg,#1B3A6B,#243870);padding:28px;text-align:center">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="display:inline-block;height:auto;max-width:140px">
  </div>
  <div style="padding:32px 28px">
    <p style="font-size:20px;font-weight:800;color:#1B3A6B;margin:0 0 16px">${firstName}, hay una actualizacion en tu proceso</p>
    <p style="font-size:15px;color:#1A150F;line-height:1.7;margin:0 0 20px">
      Necesitamos verificar tu documentacion para avanzar con tu evaluacion de Leasing Habitacional. <strong>Tu pre-aprobacion esta pendiente de confirmacion.</strong>
    </p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px"><tr><td align="center" style="background:#2DB89E;border-radius:14px;padding:28px 24px">
      <p style="font-size:18px;font-weight:900;color:#fff;margin:0 0 8px">Confirma tu pre-aprobacion</p>
      <p style="font-size:13px;color:rgba(255,255,255,0.85);margin:0 0 18px">Sube tus documentos para que podamos formalizar tu proceso.</p>
      <a href="${uploadUrl}" target="_blank" style="display:inline-block;background:#fff;color:#1B3A6B;font-size:16px;font-weight:900;padding:16px 36px;border-radius:12px;text-decoration:none;box-shadow:0 4px 16px rgba(0,0,0,0.15)">VER MI PRE-APROBACION</a>
    </td></tr></table>
    <div style="background:#E5F7F4;border:1px solid rgba(45,184,158,0.3);border-radius:10px;padding:14px 18px;margin:0 0 24px">
      <p style="font-size:13px;color:#1B3A6B;margin:0;line-height:1.6">Tambien puedes enviarlos respondiendo este correo o por <a href="https://wa.me/${waNum}" style="color:#25D366;font-weight:700;text-decoration:none">WhatsApp</a>.</p>
    </div>
  </div>
  <div style="background:#F7F0E6;padding:18px 28px;text-align:center;border-top:1px solid #EDE3D4">
    <p style="font-size:13px;color:#9A8878;margin:0;line-height:1.6">Saludos,<br><strong style="color:#1B3A6B">Equipo Llave Propia</strong></p>
  </div></div>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Llave Propia <notificaciones@proppi.cl>',
        to: [lead.email],
        cc: [ejecutivaEmailReq, 'rodrigo.canas@llavepropia.cl', 'vicente@llavepropia.cl'],
        reply_to: ['rodrigo.canas@llavepropia.cl', ejecutivaEmailReq],
        subject: `${firstName}, hay una actualizacion en tu proceso`,
        html
      })
    });
    if (!emailRes.ok) { const err = await emailRes.text(); return res.status(500).json({ error: err }); }
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Accion invalida. Use ?action=portal|signed-url|confirm|request' });
}
