export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nombre, email, producto } = req.body;
  if (!nombre || !email || !producto) return res.status(400).json({ error: 'Faltan campos' });

  const isLeasing = producto === 'leasing';
  const productoLabel = isLeasing ? 'Leasing Habitacional DS120' : 'Mutuo Hipotecario';
  const headerBg    = isLeasing ? 'linear-gradient(135deg,#1B2B5E 0%,#2BA89C 100%)' : 'linear-gradient(135deg,#1B2B5E 0%,#162244 100%)';
  const accentColor = isLeasing ? '#2BA89C' : '#C9871A';
  const badge       = isLeasing ? 'Programa DS120 · MINVU' : 'Crédito Hipotecario · UF';
  const intro       = isLeasing
    ? 'Estás más cerca de lo que crees de tener tu primera casa o departamento. Con el subsidio DS120 el Estado pone el pie por ti — solo necesitamos verificar que calificas. Para avanzar con tu pre-evaluación, envíanos la siguiente documentación:'
    : 'Estás comenzando el proceso para tu Mutuo Hipotecario. Para avanzar con tu pre-evaluación necesitamos la siguiente documentación:';

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Documentación requerida — ${productoLabel}</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" style="max-width:580px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

      <!-- LOGO BAR -->
      <tr><td style="background:#ffffff;padding:24px 40px;border-bottom:1px solid #f0ece4">
        <img src="https://www.llavepropia.cl/logo-lp.png" alt="Llave Propia" width="160" style="display:block;height:auto;max-width:160px">
      </td></tr>

      <!-- HEADER -->
      <tr><td style="background:${headerBg};padding:28px 40px 24px">
        <p style="margin:0 0 4px;color:rgba(255,255,255,0.65);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${badge}</p>
        <p style="margin:0;color:rgba(255,255,255,0.9);font-size:15px;font-weight:600">${productoLabel}</p>
      </td></tr>

      <!-- GREETING -->
      <tr><td style="padding:36px 40px 0">
        <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#1B2B5E">Hola, ${nombre}! ${isLeasing ? '🏠' : ''}</p>
        <p style="margin:0;font-size:15px;color:#555;line-height:1.7">${intro}</p>
      </td></tr>

      <!-- DEPENDIENTE -->
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

      <!-- INDEPENDIENTE -->
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

      <!-- ENVIO -->
      <tr><td style="padding:24px 40px 0">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${isLeasing ? '#e8f7f5' : '#fff8ec'};border-radius:10px;border-left:4px solid ${accentColor}">
          <tr><td style="padding:16px 20px">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${accentColor}">ENVIAR DOCUMENTACIÓN A:</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#1B2B5E">contacto@llavepropia.cl</p>
          </td></tr>
        </table>
      </td></tr>

      <!-- FOOTER -->
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
</body>
</html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from:     'Llave Propia Vivienda <notificaciones@proppi.cl>',
      to:       [email],
      cc:       ['rodrigo.canas@llavepropia.cl', 'vicente@llavepropia.cl', 'karina.valenzuela@llavepropia.cl'],
      reply_to: ['rodrigo.canas@llavepropia.cl', 'vicente@llavepropia.cl'],
      subject: `Documentación para tu ${productoLabel} — Llave Propia`,
      html
    })
  });

  if (!response.ok) {
    const err = await response.text();
    return res.status(500).json({ error: err });
  }

  return res.status(200).json({ ok: true });
}
