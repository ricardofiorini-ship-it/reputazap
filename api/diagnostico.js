// ============================================================
// StarTouch — Diagnóstico público (isca de captação)
// ============================================================
// Endpoint PÚBLICO (sem auth). Emula a busca do CLIENTE:
//   "[termo] perto do negócio" via Google Text Search, e lê a
//   POSIÇÃO na ordem que o Google devolveu (sem re-ranquear).
// É o número honesto — o mesmo que o dono vê ao buscar no Google.
//
// (Difere do motor do app, que usa Nearby Search + gscore; ver
//  _lib/competitors.js. Aqui priorizamos fidelidade ao Google.)
//
// Uso: /api/diagnostico?place_id=XXX  (opcional &keyword= &radius=)
// ============================================================
import { fetchWithTimeout } from "./_lib/fetch-timeout.js";

const API_KEY = process.env.PLACES_API_KEY;

const GENERIC = new Set([
  "point_of_interest", "establishment", "premise", "geocode", "political", "store_storage"
]);
const BROAD = new Set([
  "store", "food", "health", "finance", "general_contractor", "home_goods_store", "shopping_mall"
]);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=600");
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  const placeId = req.query.place_id || req.query.place;
  const keyword = (req.query.keyword || "").trim();
  // Diagnóstico trava em até 3km (recorte fiel ao que o cliente percorre).
  const rIn = parseInt(req.query.radius, 10);
  const radius = Number.isFinite(rIn) ? Math.min(Math.max(rIn, 500), 3000) : 3000;
  if (!placeId) return res.status(400).json({ error: "place_id obrigatório" });
  if (!API_KEY) return res.status(500).json({ error: "PLACES_API_KEY ausente" });

  try {
    // 1. Detalhes do negócio: localização, nota, avaliações, tipos
    const det = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,geometry,types&language=pt-BR&key=${API_KEY}`,
      {}, 6000
    ).then(r => r.json());
    const me = det.result;
    if (!me?.geometry?.location) {
      return res.json({ ok: true, enough: false, name: me?.name || null, rating: me?.rating ?? null, reviews: me?.user_ratings_total ?? 0, category: null, radius, total: 0 });
    }
    const { lat, lng } = me.geometry.location;
    const myRating = typeof me.rating === "number" ? me.rating : 0;
    const myReviews = me.user_ratings_total || 0;

    // 2. Termo de busca (o que o cliente digita). keyword > tipo específico.
    let term = keyword;
    if (!term) {
      const types = me.types || [];
      const specific = types.filter(t => !GENERIC.has(t) && !BROAD.has(t));
      const broad = types.filter(t => !GENERIC.has(t) && BROAD.has(t));
      term = specific[0] || broad[0] || "";
    }
    if (!term) {
      return res.json({ ok: true, enough: false, name: me.name, rating: myRating, reviews: myReviews, category: null, radius, total: 0 });
    }

    // 3. Emula a busca do cliente: Text Search do termo, ancorado no local.
    //    Lê a ORDEM do Google (relevância/proeminência) — sem re-ranquear.
    const tsUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(term)}&location=${lat},${lng}&radius=${radius}&language=pt-BR&region=br&key=${API_KEY}`;
    const ts = await fetchWithTimeout(tsUrl, {}, 8000).then(r => r.json());

    // Filtra fechados/sem nota e deduplica preservando a ordem do Google
    const seen = new Set();
    const ordered = [];
    for (const p of (ts.results || [])) {
      if (seen.has(p.place_id)) continue;
      if (p.business_status && p.business_status !== "OPERATIONAL") continue;
      if (typeof p.rating !== "number") continue;
      seen.add(p.place_id);
      ordered.push(p);
    }

    const total = ordered.length;
    if (total < 2) {
      return res.json({ ok: true, enough: false, name: me.name, rating: myRating, reviews: myReviews, category: term, radius, total });
    }

    // 4. Posição do alvo NA ORDEM DO GOOGLE
    const idx = ordered.findIndex(p => p.place_id === placeId);
    const inResults = idx >= 0;
    const rank = inResults ? idx + 1 : null;

    // 5. Top 5 na ordem do Google
    const top = ordered.slice(0, 5).map((p, i) => ({
      pos: i + 1,
      name: p.name || null,
      rating: p.rating ?? null,
      reviews: p.user_ratings_total || 0,
      isMe: p.place_id === placeId
    }));

    // 6. Quem está logo acima (se o alvo aparece na lista)
    let aheadName = null, reviewsToNext = 0;
    if (inResults && idx > 0) {
      const ahead = ordered[idx - 1];
      aheadName = ahead.name || null;
      reviewsToNext = Math.max(0, (ahead.user_ratings_total || 0) - myReviews);
    }

    return res.json({
      ok: true,
      enough: true,
      name: me.name,
      rating: myRating,
      reviews: myReviews,
      category: term,
      radius,
      rank,
      total,
      inResults,
      reviewsToNext,
      aheadName,
      ratingShortcut: null,
      top
    });
  } catch (err) {
    console.error("[diagnostico] erro:", err);
    return res.status(500).json({ error: err.message || "Erro ao gerar diagnóstico" });
  }
}
