/**
 * Keep-alive do Supabase: o plano gratuito pausa projetos sem atividade por
 * ~7 dias; este endpoint faz uma leitura mínima na API todo dia via Vercel
 * Cron (vercel.json > crons). A consulta usa a anon key e o RLS devolve
 * zero linhas — conta como atividade sem expor nada.
 */
module.exports = async (req, res) => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    res.status(500).json({ ok: false, error: 'env do Supabase ausente' });
    return;
  }
  try {
    const r = await fetch(`${url}/rest/v1/exercises?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: r.ok, supabaseStatus: r.status, at: new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e) });
  }
};
