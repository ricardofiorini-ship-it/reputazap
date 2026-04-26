export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const API_KEY = process.env.PLACES_API_KEY;
  let place_id = req.query.place_id;

  try {
    // Se não veio place_id na URL, cai no fallback antigo (SAIF)
    if (!place_id) {
      console.log("[reviews] Sem place_id na URL, usando fallback SAIF");
      const query = "SAIF A Loja da Limpeza Carapicuíba SP";
      const searchRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,rating,user_ratings_total&key=${API_KEY}`
      );
      const searchData = await searchRes.json();
      const place = searchData.candidates?.[0];
      if (!place) return res.status(404).json({ error: "Negócio não encontrado" });
      place_id = place.place_id;
    } else {
      console.log("[reviews] Buscando reviews do place_id:", place_id);
    }

    // Busca os reviews do place_id (seja o do usuário ou o fallback)
    const detailRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,rating,user_ratings_total,reviews&language=pt-BR&key=${API_KEY}`
    );
    const detailData = await detailRes.json();
    const result = detailData.result;

    if (!result) {
      console.error("[reviews] Resposta do Google sem 'result':", detailData);
      return res.status(404).json({ error: "Detalhes do negócio não encontrados" });
    }

    res.json({
      name: result.name,
      rating: result.rating,
      total: result.user_ratings_total,
      reviews: (result.reviews || []).map(r => ({
        id: r.time,
        author: r.author_name,
        avatar: r.author_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
        rating: r.rating,
        text: r.text,
        date: r.relative_time_description,
        replied: false,
        reply: null,
        via: "organic"
      }))
    });
  } catch (err) {
    console.error("[reviews] Erro:", err);
    res.status(500).json({ error: err.message });
  }
}
