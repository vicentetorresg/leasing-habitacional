export default async function handler(req, res) {
  // GET /api/mailing-aprobados
  // Sends property match emails to approved leads every 4 days
  // ?test=email@example.com  → send one test email to that address
  // ?force=1                 → skip 4-day cooldown

  const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co';
  const CRM_KEY = process.env.CRM_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const STORAGE_URL = CRM_URL + '/storage/v1/object/public/vivienda-files';

  if (!CRM_KEY || !RESEND_KEY) return res.status(500).json({ error: 'Missing env vars' });

  const url = new URL(req.url, 'https://www.llavepropia.cl');
  const testEmail = url.searchParams.get('test');
  const force = url.searchParams.get('force') === '1';

  // Map valor_pesos ranges to max UF value
  const RANGE_TO_MAX_UF = {
    '0_800': 800, '800_1000': 1000, '1000_1200': 1200,
    '1200_1400': 1400, '1400_1600': 1600, '1600_1800': 1800, '1800_2000': 2000,
    // CLP-based ranges (from -55 forms) → approx UF
    '0_25': 610, '25_30': 730, '30_35': 850, '35_40': 975,
    '40_45': 1100, '45_50': 1220, '50_55': 1340
  };

  const RANGE_LABEL = {
    '0_800': '< 800 UF', '800_1000': '800–1.000 UF', '1000_1200': '1.000–1.200 UF',
    '1200_1400': '1.200–1.400 UF', '1400_1600': '1.400–1.600 UF',
    '1600_1800': '1.600–1.800 UF', '1800_2000': '1.800–2.000 UF',
    '0_25': '< $25M', '25_30': '$25–30M', '30_35': '$30–35M', '35_40': '$35–40M',
    '40_45': '$40–45M', '45_50': '$45–50M', '50_55': '$50–55M'
  };

  // 1. Fetch approved leads
  const leadsRes = await fetch(
    `${CRM_URL}/rest/v1/leads?status=in.(buscando_vivienda,rechaza_oferta)&select=id,name,email,phone,uf_aprobado_austra,uf_aprobado_casa_pronta,last_match_mailing_at,created_at`,
    { headers: { apikey: CRM_KEY, Authorization: 'Bearer ' + CRM_KEY } }
  );
  const leads = await leadsRes.json();
  if (!Array.isArray(leads)) return res.status(200).json({ error: 'bad leads response' });

  // 2. Fetch all active viviendas
  const vivRes = await fetch(
    `${CRM_URL}/rest/v1/viviendas?archived=eq.false&select=id,tipo_vivienda,valor_pesos,direccion,comuna,superficie,dormitorios,banos,photo_count&order=created_at.desc`,
    { headers: { apikey: CRM_KEY, Authorization: 'Bearer ' + CRM_KEY } }
  );
  const viviendas = await vivRes.json();
  if (!Array.isArray(viviendas)) return res.status(200).json({ error: 'bad viviendas response' });

  // 3. Get first photo for each vivienda with photos
  const photoCache = {};
  for (const v of viviendas) {
    if (v.photo_count && v.photo_count > 0) {
      try {
        const listRes = await fetch(`${CRM_URL}/storage/v1/object/list/vivienda-files`, {
          method: 'POST',
          headers: { apikey: CRM_KEY, Authorization: 'Bearer ' + CRM_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix: v.id + '/', limit: 1, sortBy: { column: 'name', order: 'asc' } })
        });
        const files = await listRes.json();
        if (Array.isArray(files) && files.length > 0) {
          photoCache[v.id] = STORAGE_URL + '/' + v.id + '/' + files[0].name;
        }
      } catch (e) { /* skip */ }
    }
  }

  // Sort viviendas by price (cheapest first) for fallback
  const sortedByPrice = [...viviendas].sort((a, b) => {
    const maxA = RANGE_TO_MAX_UF[a.valor_pesos] || 9999;
    const maxB = RANGE_TO_MAX_UF[b.valor_pesos] || 9999;
    return maxA - maxB;
  });

  const now = new Date();
  const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
  let sent = 0;
  const results = [];

  // Test mode: create a fake lead and process only that
  if (testEmail) {
    leads.length = 0;
    leads.push({ id: 'test', name: 'Vicente (Test)', email: testEmail, uf_aprobado_austra: 2000, uf_aprobado_casa_pronta: 2000 });
  }

  for (const lead of leads) {
    // Skip if no email
    if (!lead.email) { results.push({ id: lead.id, skipped: 'no email' }); continue; }

    // Skip if recently mailed (unless force)
    if (!force && !testEmail && lead.last_match_mailing_at) {
      const elapsed = now - new Date(lead.last_match_mailing_at);
      if (elapsed < FOUR_DAYS_MS) { results.push({ id: lead.id, skipped: 'too recent' }); continue; }
    }

    // Determine max approved UF
    const ufAustra = parseFloat(lead.uf_aprobado_austra) || 0;
    const ufCasaPronta = parseFloat(lead.uf_aprobado_casa_pronta) || 0;
    const maxAprobado = Math.max(ufAustra, ufCasaPronta);

    if (maxAprobado <= 0 && !testEmail) { results.push({ id: lead.id, skipped: 'no monto aprobado' }); continue; }

    // Match viviendas where max UF of range <= maxAprobado
    const effectiveMax = testEmail && maxAprobado <= 0 ? 2000 : maxAprobado;
    let matched = viviendas.filter(v => {
      const rangeMax = RANGE_TO_MAX_UF[v.valor_pesos] || 9999;
      return rangeMax <= effectiveMax;
    });

    // If no matches, use 6 cheapest
    const usedFallback = matched.length === 0;
    if (usedFallback) {
      matched = sortedByPrice.slice(0, 6);
    } else {
      // Limit to 6, prioritize those with photos
      matched.sort((a, b) => (b.photo_count || 0) - (a.photo_count || 0));
      matched = matched.slice(0, 6);
    }

    const firstName = (lead.name || '').trim().split(' ')[0] || 'Cliente';
    const toEmail = testEmail || lead.email;

    // Build property cards HTML
    const cardsHtml = matched.map(v => {
      const tipo = v.tipo_vivienda === 'departamento' ? 'Depto' : 'Casa';
      const photoUrl = photoCache[v.id] || null;
      const rangeLabel = RANGE_LABEL[v.valor_pesos] || v.valor_pesos || '—';
      const details = [];
      if (v.superficie) details.push(v.superficie + ' m²');
      if (v.dormitorios) details.push(v.dormitorios + ' dorm');
      if (v.banos) details.push(v.banos + ' baño' + (v.banos !== '1' ? 's' : ''));
      const detailStr = details.join(' · ');
      const galeriaUrl = v.photo_count > 0 ? 'https://www.llavepropia.cl/galeria?id=' + v.id : 'https://www.llavepropia.cl/marketplace';

      const imgBlock = photoUrl
        ? `<img src="${photoUrl}" alt="${tipo} en ${v.comuna || ''}" style="width:100%;height:140px;object-fit:cover;display:block">`
        : `<div style="width:100%;height:140px;background:linear-gradient(135deg,#e8dcc8,#d4c4a8);display:flex;align-items:center;justify-content:center">
            <span style="font-size:36px">${v.tipo_vivienda === 'departamento' ? '🏢' : '🏠'}</span>
           </div>`;

      return `<td style="width:50%;vertical-align:top;padding:6px">
        <a href="${galeriaUrl}" style="text-decoration:none;color:inherit;display:block">
        <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
          ${imgBlock}
          <div style="padding:12px 14px">
            <p style="margin:0 0 2px;font-size:13px;font-weight:800;color:#1B3A6B">${tipo} en ${v.comuna || '—'}</p>
            <p style="margin:0 0 4px;font-size:12px;color:#C9871A;font-weight:700">${rangeLabel}</p>
            <p style="margin:0;font-size:11px;color:#9A8878">${detailStr || '—'}</p>
          </div>
        </div>
        </a>
      </td>`;
    }).join('');

    // Arrange cards in rows of 2
    const rows = [];
    for (let i = 0; i < matched.length; i += 2) {
      const cells = matched.length > i + 1
        ? cardsHtml.split('</td>').slice(i, i + 2).join('</td>') + '</td>'
        : cardsHtml.split('</td>')[i] + '</td>';
      rows.push(cells);
    }

    // Actually build rows properly
    const cardItems = matched.map((v, idx) => {
      const tipo = v.tipo_vivienda === 'departamento' ? 'Depto' : 'Casa';
      const photoUrl = photoCache[v.id] || null;
      const rangeLabel = RANGE_LABEL[v.valor_pesos] || v.valor_pesos || '—';
      const details = [];
      if (v.superficie) details.push(v.superficie + ' m²');
      if (v.dormitorios) details.push(v.dormitorios + ' dorm');
      if (v.banos) details.push(v.banos + ' baño' + (v.banos !== '1' ? 's' : ''));
      const detailStr = details.join(' · ');
      const galeriaUrl = v.photo_count > 0 ? 'https://www.llavepropia.cl/galeria?id=' + v.id : 'https://www.llavepropia.cl/marketplace';

      const imgBlock = photoUrl
        ? `<img src="${photoUrl}" alt="${tipo} en ${v.comuna || ''}" style="width:100%;height:140px;object-fit:cover;display:block">`
        : `<div style="width:100%;height:140px;background:linear-gradient(135deg,#e8dcc8,#d4c4a8);display:flex;align-items:center;justify-content:center">
            <span style="font-size:36px">${v.tipo_vivienda === 'departamento' ? '🏢' : '🏠'}</span>
           </div>`;

      return `<td style="width:50%;vertical-align:top;padding:6px">
        <a href="${galeriaUrl}" style="text-decoration:none;color:inherit;display:block">
        <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
          ${imgBlock}
          <div style="padding:12px 14px">
            <p style="margin:0 0 2px;font-size:13px;font-weight:800;color:#1B3A6B">${tipo} en ${v.comuna || '—'}</p>
            <p style="margin:0 0 4px;font-size:12px;color:#C9871A;font-weight:700">${rangeLabel}</p>
            <p style="margin:0;font-size:11px;color:#9A8878">${detailStr || '—'}</p>
          </div>
        </div>
        </a>
      </td>`;
    });

    let gridHtml = '';
    for (let i = 0; i < cardItems.length; i += 2) {
      gridHtml += '<tr>' + cardItems[i] + (cardItems[i + 1] || '<td></td>') + '</tr>';
    }

    const subject = `${firstName}, hay propiedades que te pueden interesar`;

    const introText = usedFallback
      ? `Aún no tenemos propiedades exactas en tu rango aprobado, pero estas son las <strong>opciones más accesibles</strong> disponibles ahora:`
      : `Encontramos <strong>${matched.length} propiedad${matched.length > 1 ? 'es' : ''}</strong> que calzan con tu monto aprobado. ¡Revísalas!`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Propiedades para ti</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:28px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
  <tr><td style="background:#ffffff;padding:24px 32px;border-bottom:1px solid #f0ece4">
    <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="140" style="display:block;height:auto;max-width:140px">
  </td></tr>
  <tr><td style="background:linear-gradient(135deg,#1B3A6B 0%,#C9871A 100%);padding:24px 32px">
    <p style="margin:0;color:rgba(255,255,255,0.65);font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase">Llave Propia</p>
    <p style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700">Propiedades que te pueden interesar</p>
  </td></tr>
  <tr><td style="padding:32px 28px">
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1B3A6B">Hola, ${firstName}!</p>
    <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7">${introText}</p>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${gridHtml}
    </table>

    <div style="text-align:center;margin:28px 0 8px">
      <a href="https://www.llavepropia.cl/marketplace"
         style="display:inline-block;background:#C9871A;color:#fff;padding:16px 36px;border-radius:50px;font-weight:800;font-size:15px;text-decoration:none;box-shadow:0 4px 16px rgba(201,135,26,0.3)">
        Ver todas las propiedades
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#9A8878;margin:12px 0 0">Nuevas propiedades se agregan cada semana</p>
  </td></tr>
  <tr><td style="padding:20px 32px;background:#fafaf8;border-top:1px solid #f0ece4">
    <p style="margin:0 0 6px;font-size:12px;color:#777;text-align:center">¿Tienes preguntas? Responde este correo y te ayudamos.</p>
    <p style="margin:0;font-size:11px;color:#bbb;text-align:center">Llave Propia · <a href="https://www.llavepropia.cl" style="color:#bbb">llavepropia.cl</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    const emailPayload = {
      from: 'Llave Propia <notificaciones@llavepropia.cl>',
      to: [toEmail],
      reply_to: ['vicente@llavepropia.cl', 'rodrigo.canas@llavepropia.cl'],
      subject,
      html
    };

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload)
    });

    if (emailRes.ok) {
      sent++;
      // Update last_match_mailing_at (skip for test mode)
      if (!testEmail) {
        await fetch(`${CRM_URL}/rest/v1/leads?id=eq.${lead.id}`, {
          method: 'PATCH',
          headers: { apikey: CRM_KEY, Authorization: 'Bearer ' + CRM_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ last_match_mailing_at: now.toISOString() })
        });
      }
      results.push({ id: lead.id, name: lead.name, sent: true, matched: matched.length, fallback: usedFallback });
    } else {
      const errBody = await emailRes.text();
      results.push({ id: lead.id, name: lead.name, error: errBody });
    }
  }

  return res.status(200).json({ total_leads: leads.length, sent, results });
}
