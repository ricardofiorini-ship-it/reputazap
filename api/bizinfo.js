import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { place_id } = req.query;
  if (!place_id) return res.status(400).json({ error: "place_id obrigatório" });

  const API_KEY = process.env.PLACES_API_KEY;
  try {
    const [googleRes, bizRes] = await Promise.all([
      fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,rating,user_ratings_total&language=pt-BR&key=${API_KEY}`).then(r => r.json()),
      supabase.from("businesses").select("plan").eq("place_id", place_id).maybeSingle()
    ]);

    const result = googleRes.result;
    if (!result) return res.status(404).json({ error: "Negócio não encontrado" });

    res.json({
      name: result.name,
      rating: result.rating,
      total: result.user_ratings_total,
      plan: bizRes.data?.plan || "free"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
