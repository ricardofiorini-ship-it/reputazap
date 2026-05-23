export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query obrigatória" });

  const API_KEY = process.env.PLACES_API_KEY;

  try {
    // Text Search (e nao Find Place): retorna uma LISTA de lugares (ate 20 por
    // pagina), essencial pra redes com varias unidades. O Find Place antigo so
    // devolvia o "melhor palpite" pra um nome — por isso uma rede com 20 lojas
    // aparecia com 2-3 resultados.
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&language=pt-BR&region=br&key=${API_KEY}`
    );
    const data = await searchRes.json();

    if (!data.results?.length) {
      return res.json({ results: [] });
    }

    // Retorna ate 20 (a pagina inteira do Text Search), ordenados pela
    // relevancia/prominencia do proprio Google.
    const results = data.results.slice(0, 20).map(p => ({
      place_id: p.place_id,
      name: p.name,
      address: p.formatted_address || "",
      rating: p.rating || 0,
      total: p.user_ratings_total || 0
    }));

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
