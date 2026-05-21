// ============================================================
// StarTouch — Ranking competitivo (recurso Pro)
// Compara o negócio do usuário com concorrentes da mesma
// categoria por perto (Google Places Nearby Search).
// Retorna posição por NOTA e por Nº DE AVALIAÇÕES.
// Gate: admin (hardcoded) OU plano pro. Free não chama isto.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_EMAIL = "ricardo.fiorini@gmail.com";
const API_KEY = process.env.PLACES_API_KEY;

// Tipos genéricos do Google que não servem como "categoria" de busca
const GENERIC_TYPES = new Set([
  "point_of_interest", "establishment", "premise", "geocode",
  "political", "store_storage"
]);

// Tipos amplos demais pra comparar (muitos ramos diferentes compartilham
// "store"/"food" etc). Só servem de fallback quando não há tipo específico.
const BROAD_TYPES = new Set([
  "store", "food", "health", "finance", "general_contractor",
  "home_goods_store", "shopping_mall"
]);

async function authUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return { error: "Token obrigatório", status: 401 };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { error: "Token inválido", status: 401 };
  return { user: data.user };
}

const isAdmin = (user) => user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  // 1. Auth
  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const user = auth.user;

  // 2. Negócio do usuário (place_id + plano)
  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select("place_id, name, plan")
    .eq("user_id", user.id)
    .maybeSingle();

  if (bizErr || !biz?.place_id) {
    return res.status(404).json({ error: "Nenhum negócio com Google vinculado" });
  }

  // 3. Gate: admin ou pro
  if (!isAdmin(user) && biz.plan !== "pro") {
    return res.status(403).json({ error: "Recurso Pro" });
  }

  const radius = Math.min(parseInt(req.query.radius, 10) || 3000, 25000);

  try {
    // 4. Detalhes do meu negócio: localização + categoria + nota
    const detRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${biz.place_id}&fields=name,rating,user_ratings_total,geometry,types&language=pt-BR&key=${API_KEY}`
    );
    const det = await detRes.json();
    const me = det.result;
    if (!me?.geometry?.location) {
      return res.status(404).json({ error: "Localização do negócio não encontrada no Google" });
    }
    const { lat, lng } = me.geometry.location;

    // Escolhe a categoria de comparação: prioriza o tipo ESPECÍFICO do
    // negócio (ex: "cafe", "bicycle_store"); só usa um tipo amplo ("store")
    // como último recurso. Esse mesmo tipo é usado pra filtrar concorrentes.
    const myTypes = me.types || [];
    const specific = myTypes.filter(t => !GENERIC_TYPES.has(t) && !BROAD_TYPES.has(t));
    const broad = myTypes.filter(t => !GENERIC_TYPES.has(t) && BROAD_TYPES.has(t));
    const matchType = specific[0] || broad[0] || null;

    // 5. Nearby Search por perto, restringindo pela categoria do negócio
    let nearbyUrl =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&language=pt-BR&key=${API_KEY}`;
    if (matchType) nearbyUrl += `&type=${matchType}`;

    const nearRes = await fetch(nearbyUrl);
    const near = await nearRes.json();
    const rawResults = near.results || [];

    // Só compara quem REALMENTE compartilha a categoria específica do negócio.
    // (o filtro `type` do Nearby é frouxo e mistura ramos; isto é o que evita
    // comparar bicicletaria com café.)
    const sameCategory = (p) => !matchType || (p.types || []).includes(matchType);

    // 6. Monta lista de concorrentes (com nota), incluindo o próprio negócio
    const byId = new Map();
    for (const p of rawResults) {
      if (typeof p.rating !== "number") continue; // sem nota não entra no ranking
      if (!sameCategory(p)) continue;             // categoria diferente, ignora
      byId.set(p.place_id, {
        place_id: p.place_id,
        name: p.name,
        rating: p.rating,
        reviews: p.user_ratings_total || 0
      });
    }
    // Garante que o próprio negócio esteja na lista (dados oficiais dos detalhes)
    byId.set(biz.place_id, {
      place_id: biz.place_id,
      name: me.name || biz.name,
      rating: typeof me.rating === "number" ? me.rating : 0,
      reviews: me.user_ratings_total || 0
    });

    const list = Array.from(byId.values());
    const total = list.length;

    if (total < 2) {
      return res.json({
        enough: false,
        total,
        category: matchType,
        radius,
        me: byId.get(biz.place_id)
      });
    }

    // 7. Rankings (1-indexed). Desempate: por avaliações na nota; por nota nas avaliações.
    const byRating = [...list].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    const byReviews = [...list].sort((a, b) => b.reviews - a.reviews || b.rating - a.rating);

    const rankByRating = byRating.findIndex(p => p.place_id === biz.place_id) + 1;
    const rankByReviews = byReviews.findIndex(p => p.place_id === biz.place_id) + 1;

    // 8. Top 5 por nota (pra exibir), marcando o próprio negócio
    const top = byRating.slice(0, 5).map(p => ({
      ...p,
      is_me: p.place_id === biz.place_id
    }));

    return res.json({
      enough: true,
      total,
      category: matchType,
      radius,
      me: byId.get(biz.place_id),
      rank_by_rating: rankByRating,
      rank_by_reviews: rankByReviews,
      top
    });
  } catch (err) {
    console.error("[competitors] erro:", err);
    return res.status(500).json({ error: err.message });
  }
}
