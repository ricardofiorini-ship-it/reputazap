import { fetchWithTimeout } from "./_lib/fetch-timeout.js";
import { comCachePlaces, freshAutorizado, TTL } from "./_lib/places-cache.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const API_KEY = process.env.PLACES_API_KEY;
  const place_id = req.query.place_id;

  if (!place_id) {
    return res.status(400).json({ error: "place_id é obrigatório" });
  }

  try {
    // Details + Atmosphere (reviews) é o tier mais caro do Places. Cache de
    // algumas horas: o cliente não perde nada (avaliação nova não chega de
    // minuto em minuto) e o alerta de avaliação negativa continua vindo do cron,
    // que bate no Google direto — sem passar por aqui.
    const { data: result, cached, measuredAt } = await comCachePlaces({
      key: `reviews:v1:${place_id}`,
      ttlMs: TTL.REVIEWS,
      fresh: freshAutorizado(req),
      produce: async () => {
        console.log("[reviews] Buscando reviews do place_id:", place_id);
        const detailRes = await fetchWithTimeout(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,rating,user_ratings_total,reviews&reviews_sort=newest&language=pt-BR&key=${API_KEY}`,
          {}, 6000
        );
        const detailData = await detailRes.json();
        if (!detailData.result) {
          console.error("[reviews] Resposta do Google sem 'result':", detailData);
          return null;   // não cacheia falha
        }
        return detailData.result;
      }
    });

    if (!result) {
      return res.status(404).json({ error: "Detalhes do negócio não encontrados" });
    }

    res.json({
      name: result.name,
      rating: result.rating,
      total: result.user_ratings_total,
      cached,
      measuredAt,
      reviews: (result.reviews || []).map(r => {
        // Guard contra author_name null (Google permite reviews anônimas em alguns países)
        const name = (r.author_name || "Cliente Google").toString();
        const initials = name
          .split(" ")
          .filter(Boolean)
          .map(n => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "?";
        return {
          id: r.time,
          author: name,
          avatar: initials,
          rating: r.rating ?? 0,
          text: r.text || "",
          date: r.relative_time_description || "",
          replied: false,
          reply: null,
          via: "organic"
        };
      })
    });
  } catch (err) {
    console.error("[reviews] Erro:", err);
    res.status(500).json({ error: err.message });
  }
}
