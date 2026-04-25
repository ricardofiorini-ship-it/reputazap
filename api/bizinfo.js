export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { place_id } = req.query;
  if (!place_id) return res.status(400).json({ error: "place_id obrigatório" });

  const API_KEY = process.env.PLACES_API_KEY;
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,rating,user_ratings_total&language=pt-BR&key=${API_KEY}`
    );
    const data = await r.json();
    const result = data.result;
    if (!result) return res.status(404).json({ error: "Negócio não encontrado" });
    res.json({ name: result.name, rating: result.rating, total: result.user_ratings_total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
