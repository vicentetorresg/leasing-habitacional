export default async function handler(req, res) {
  try {
    const response = await fetch('https://mindicador.cl/api/uf');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const valor = data?.serie?.[0]?.valor;
    if (valor == null) throw new Error('UF no encontrada');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    return res.status(200).json({ valor });
  } catch (e) {
    return res.status(502).json({ error: 'No se pudo obtener UF' });
  }
}
