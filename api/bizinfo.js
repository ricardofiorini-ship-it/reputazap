import { createClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "./_lib/fetch-timeout.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Sem cache — Google Places mudou ou banco mudou e queremos refletir na hora
  res.setHeader("Cache-Control", "private, no-store, no-cache, max-age=0");
  const { place_id } = req.query;
  if (!place_id) return res.status(400).json({ error: "place_id obrigatório" });

  const API_KEY = process.env.PLACES_API_KEY;
  try {
    const [googleRes, bizRes] = await Promise.all([
      fetchWithTimeout(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,rating,user_ratings_total,photos,formatted_address,formatted_phone_number,international_phone_number,url,types&language=pt-BR&key=${API_KEY}`, {}, 6000).then(r => r.json()),
      supabase.from("businesses").select("plan").eq("place_id", place_id).maybeSingle()
    ]);

    const result = googleRes.result;
    if (!result) return res.status(404).json({ error: "Negócio não encontrado" });

    // Photo URL pra avatar — usa a primeira foto se houver. Key fica na URL;
    // restringir o PLACES_API_KEY por HTTP referrer em GCP é recomendado.
    let photoUrl = null;
    const ref = result.photos?.[0]?.photo_reference;
    if (ref) {
      photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photo_reference=${encodeURIComponent(ref)}&key=${API_KEY}`;
    }

    // Categoria: pega o primeiro tipo "específico" do Google (filtra genéricos)
    const GENERIC = new Set(["point_of_interest","establishment","premise","geocode","political"]);
    const category = (result.types || []).find(t => !GENERIC.has(t)) || null;

    res.json({
      name: result.name,
      rating: result.rating,
      total: result.user_ratings_total,
      photoUrl,
      address: result.formatted_address || null,
      phone: result.formatted_phone_number || result.international_phone_number || null,
      gmapsUrl: result.url || null,
      category,
      types: result.types || [],
      plan: bizRes.data?.plan || "free"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
