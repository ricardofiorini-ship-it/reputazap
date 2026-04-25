export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query obrigatória" });

  const API_KEY = process.env.PLACES_API_KEY;

  try {
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(q)}&inputtype=textquery&fields=place_id,name,formatted_address,rating,user_ratings_total&key=${API_KEY}`
    );
    const data = await searchRes.json();

    if (!data.candidates?.length) {
      return res.json({ results: [] });
    }

    // Retorna até 3 resultados
    const results = data.candidates.slice(0, 3).map(p => ({
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
