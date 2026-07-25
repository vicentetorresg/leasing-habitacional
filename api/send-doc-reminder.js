export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.llavepropia.cl');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co';
  const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
  const CC_EMAILS = ['rodrigo.canas@llavepropia.cl', 'karina.valenzuela@llavepropia.cl', 'vicente@llavepropia.cl'];
  const REPLY_TO = ['rodrigo.canas@llavepropia.cl', 'karina.valenzuela@llavepropia.cl', 'vicente@llavepropia.cl'];

  let withEmail = [];

  // Mode 1: Manual — leads passed in body
  if (req.body?.leads && Array.isArray(req.body.leads) && req.body.leads.length > 0) {
    withEmail = req.body.leads.filter(l => l.email);
  }
  // Mode 2: Auto — fetch leads from CRM by status
  else {
    const TARGET_STATUSES = ['nuevo','contactado','recontactar','no_contesta','esperando_documentos','solicitando_documentos'];
    const statusFilter = TARGET_STATUSES.map(s => `status.eq.${s}`).join(',');
    const leadsRes = await fetch(
      `${CRM_URL}/rest/v1/leads?or=(${statusFilter})&is_demo=eq.false&select=id,name,email,doc_token&email=not.is.null&order=created_at.desc`,
      { headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY } }
    );
    const leadsData = await leadsRes.json();
    withEmail = (Array.isArray(leadsData) ? leadsData : []).filter(l => l.email);
  }

  if (withEmail.length === 0) {
    return res.status(400).json({ error: 'Ninguno de los leads tiene email' });
  }

  let sent = 0;
  let failed = 0;

  for (const lead of withEmail) {
    const firstName = (lead.name || '').trim().split(' ')[0] || lead.name || 'Cliente';

    // Build upload button — ensure every lead has a doc_token
    let docToken = lead.doc_token;
    if (!docToken && lead.id) {
      // Fetch doc_token from CRM
      const tRes = await fetch(`${CRM_URL}/rest/v1/leads?id=eq.${lead.id}&select=doc_token`, {
        headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY }
      });
      const tData = await tRes.json();
      if (tData?.[0]?.doc_token) {
        docToken = tData[0].doc_token;
      } else {
        // Generate and save a new doc_token
        docToken = crypto.randomUUID();
        await fetch(`${CRM_URL}/rest/v1/leads?id=eq.${lead.id}`, {
          method: 'PATCH',
          headers: { 'apikey': CRM_KEY, 'Authorization': 'Bearer ' + CRM_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ doc_token: docToken })
        });
      }
    }

    const uploadUrl = docToken ? `https://www.llavepropia.cl/documentos.html?t=${docToken}` : '';

    const html = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#FEFCF7;border-radius:16px;overflow:hidden;border:1px solid #EDE3D4">
  <div style="background:linear-gradient(135deg,#1B3A6B,#243870);padding:28px;text-align:center">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="display:inline-block;height:auto;max-width:140px">
  </div>
  <div style="padding:32px 28px">
    <p style="font-size:22px;font-weight:800;color:#1B3A6B;margin:0 0 16px">${firstName}, tu casa propia te esta esperando</p>

    <p style="font-size:15px;color:#1A150F;line-height:1.7;margin:0 0 8px">
      Ya diste el primer paso y <strong>pre-calificaste</strong> para acceder a tu vivienda propia. Pero aun no hemos recibido tus documentos para enviar tu caso a evaluacion.
    </p>
    <p style="font-size:15px;color:#1A150F;line-height:1.7;margin:0 0 24px">
      <strong>Sin tus documentos, no podemos avanzar.</strong> No dejes pasar esta oportunidad.
    </p>

    ${uploadUrl ? `<div style="background:linear-gradient(135deg,#1B3A6B,#2DB89E);border-radius:14px;padding:28px 24px;margin:0 0 24px;text-align:center">
      <p style="font-size:18px;font-weight:800;color:#fff;margin:0 0 6px">Solo toma 5 minutos</p>
      <p style="font-size:13px;color:rgba(255,255,255,0.85);margin:0 0 18px">Sube tus documentos ahora y quedaras un paso mas cerca de las llaves de tu hogar.</p>
      <a href="${uploadUrl}" target="_blank" style="display:inline-block;background:#fff;color:#1B3A6B;font-size:18px;font-weight:900;padding:18px 50px;border-radius:14px;text-decoration:none;box-shadow:0 6px 20px rgba(0,0,0,0.2)">SUBIR DOCUMENTOS AHORA</a>
    </div>` : ''}

    <div style="background:#FEF3E2;border:1.5px solid rgba(230,126,34,0.25);border-radius:10px;padding:14px 18px;margin:0 0 24px;text-align:center">
      <p style="font-size:14px;color:#1B3A6B;margin:0;font-weight:700;line-height:1.5">Cada dia que pasa es un dia mas pagando arriendo en vez de invertir en lo tuyo.</p>
    </div>

    <p style="font-size:14px;font-weight:700;color:#1B3A6B;margin:0 0 12px">Documentos que necesitamos:</p>
    <div style="background:#fff;border:1.5px solid #EDE3D4;border-radius:12px;padding:16px 18px;margin:0 0 12px">
      <p style="font-size:11px;font-weight:800;color:#2DB89E;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Dependientes</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:13px;color:#1A150F">
        ${['Cedula de identidad por ambos lados','6 ultimas liquidaciones de sueldo','Cotizaciones AFP ultimo ano','Contrato de trabajo con antiguedad','Deuda CMF (se obtiene gratuita)','Certificado de matrimonio o no matrimonio'].map((d,i) => `<tr><td width="24" valign="middle" style="padding:3px 0"><div style="background:#2DB89E;color:#fff;width:18px;height:18px;border-radius:50%;text-align:center;line-height:18px;font-size:9px;font-weight:800">${i+1}</div></td><td style="padding:3px 0 3px 6px">${d}</td></tr>`).join('')}
      </table>
    </div>
    <div style="background:#fff;border:1.5px solid #EDE3D4;border-radius:12px;padding:16px 18px;margin:0 0 12px">
      <p style="font-size:11px;font-weight:800;color:#1B3A6B;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Independientes</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:13px;color:#1A150F">
        ${['Cedula de identidad por ambos lados','Informe de deudas CMF','Certificado de matrimonio o no matrimonio','Carpeta tributaria','Certificado ultimas 12 cotizaciones AFP','Ultimas 12 boletas de honorarios'].map((d,i) => `<tr><td width="24" valign="middle" style="padding:3px 0"><div style="background:#1B3A6B;color:#fff;width:18px;height:18px;border-radius:50%;text-align:center;line-height:18px;font-size:9px;font-weight:800">${i+1}</div></td><td style="padding:3px 0 3px 6px">${d}</td></tr>`).join('')}
      </table>
    </div>
    <div style="background:#E5F7F4;border:1px solid rgba(45,184,158,0.3);border-radius:10px;padding:10px 14px;margin:0 0 24px">
      <p style="font-size:12px;color:#1B3A6B;margin:0;line-height:1.5"><strong>Si complementas renta</strong>, necesitamos los mismos documentos de esa persona.</p>
    </div>

    ${uploadUrl ? `<div style="text-align:center;margin:0 0 20px">
      <a href="${uploadUrl}" target="_blank" style="display:inline-block;background:#2DB89E;color:#fff;font-size:16px;font-weight:800;padding:16px 44px;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(45,184,158,0.3)">SUBIR DOCUMENTOS</a>
    </div>` : ''}
    <p style="font-size:13px;color:#888;margin:0 0 16px;text-align:center">Tambien puedes enviarlos respondiendo este correo o por WhatsApp:</p>
    <div style="text-align:center">
      <a href="https://wa.me/56962078510" target="_blank" style="display:inline-block;background:#25D366;color:#fff;font-size:14px;font-weight:800;padding:12px 32px;border-radius:12px;text-decoration:none">WhatsApp</a>
    </div>
  </div>
  <div style="background:#F7F0E6;padding:18px 28px;text-align:center;border-top:1px solid #EDE3D4">
    <p style="font-size:13px;color:#9A8878;margin:0;line-height:1.6">Saludos,<br><strong style="color:#1B3A6B">Equipo Llave Propia</strong></p>
  </div>
</div>`;

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Llave Propia <notificaciones@proppi.cl>',
          to: [lead.email],
          cc: CC_EMAILS,
          reply_to: REPLY_TO,
          subject: `${firstName}, no pierdas tu pre-aprobacion! Sube tus documentos y acercate a tu casa propia`,
          html,
        }),
      });
      if (r.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return res.status(200).json({ sent, failed, total: withEmail.length });
}
