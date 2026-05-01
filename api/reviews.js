export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const API_KEY = process.env.PLACES_API_KEY;
  const place_id = req.query.place_id;

  if (!place_id) {
    return res.status(400).json({ error: "place_id é obrigatório" });
  }

  try {
    console.log("[reviews] Buscando reviews do place_id:", place_id);

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
