import { readFileSync } from 'fs';
import { join } from 'path';

const CRM_URL = 'https://evuxdhvvarfxredghvpu.supabase.co';
const CRM_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2dXhkaHZ2YXJmeHJlZGdodnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjQ4NzMsImV4cCI6MjA5NjI0MDg3M30.9Rv6MNHeNwb2-2shyaP9f2aUSrbDN_0syN7PTp6mLUs';

const UF_LABELS = {
  '0_800': '< 800 UF', '800_1000': '800 – 1.000 UF', '1000_1200': '1.000 – 1.200 UF',
  '1200_1400': '1.200 – 1.400 UF', '1400_1600': '1.400 – 1.600 UF',
  '1600_1800': '1.600 – 1.800 UF', '1800_2000': '1.800 – 2.000 UF',
};

export default async function handler(req, res) {
  const vivId = req.query.id;

  // Read the static HTML
  const htmlPath = join(process.cwd(), 'galeria-template.html');
  let html = readFileSync(htmlPath, 'utf-8');

  if (!vivId) {
    return res.setHeader('Content-Type', 'text/html').status(200).send(html);
  }

  try {
    // Fetch vivienda data
    const vivRes = await fetch(
      `${CRM_URL}/rest/v1/viviendas?id=eq.${vivId}&select=id,tipo_vivienda,direccion,detalle_depto,comuna,superficie,dormitorios,banos,valor_pesos`,
      { headers: { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}` } },
    );
    const data = await vivRes.json();

    if (!data || !data.length) {
      return res.setHeader('Content-Type', 'text/html').status(200).send(html);
    }

    const v = data[0];
    const tipo = v.tipo_vivienda === 'departamento' ? 'Departamento' : 'Casa';
    const comuna = v.comuna || '';

    // Build meta info
    const ogTitle = `${tipo} en ${comuna} — Llave Propia`;
    const descParts = [tipo];
    if (comuna) descParts.push(`en ${comuna}`);
    if (v.superficie) descParts.push(`${v.superficie} m²`);
    if (v.dormitorios) descParts.push(`${v.dormitorios} dormitorios`);
    if (v.banos) descParts.push(`${v.banos} baños`);
    if (v.valor_pesos && UF_LABELS[v.valor_pesos]) descParts.push(UF_LABELS[v.valor_pesos]);
    const ogDescription = descParts.join(' · ') + '. Arrienda con opción de compra.';

    // Get first photo for og:image
    let ogImage = 'https://www.llavepropia.cl/logo-lp.png';
    try {
      const listRes = await fetch(`${CRM_URL}/storage/v1/object/list/vivienda-files`, {
        method: 'POST',
        headers: { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: vivId + '/', limit: 10, offset: 0 }),
      });
      const files = await listRes.json();
      if (Array.isArray(files)) {
        const img = files.find(f => f.name !== '.emptyFolderPlaceholder' && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name));
        if (img) {
          ogImage = `${CRM_URL}/storage/v1/object/public/vivienda-files/${vivId}/${img.name}`;
        }
      }
    } catch (_) { /* fallback to logo */ }

    // Inject meta tags before </head>
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const metaTags = `
<meta property="og:title" content="${esc(ogTitle)}" />
<meta property="og:description" content="${esc(ogDescription)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://www.llavepropia.cl/galeria?id=${vivId}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(ogTitle)}" />
<meta name="twitter:description" content="${esc(ogDescription)}" />
<meta name="twitter:image" content="${esc(ogImage)}" />
<meta name="description" content="${esc(ogDescription)}" />
`;

    html = html.replace('<title>Propiedad — Llave Propia</title>', `<title>${esc(ogTitle)}</title>${metaTags}`);

    return res.setHeader('Content-Type', 'text/html').status(200).send(html);
  } catch (err) {
    console.error('galeria meta error:', err);
    return res.setHeader('Content-Type', 'text/html').status(200).send(html);
  }
}
