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

  // 3. Ranking liberado no plano FREE (decisao 2026-05-23). Requer apenas
  //    negocio com Google vinculado (place_id ja checado acima).

  const radius = Math.min(parseInt(req.query.radius, 10) || 3000, 25000);
  const keyword = (req.query.keyword || "").trim(); // categoria informada pelo cliente (opcional)

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

    // 5. Nearby Search por perto. Se o cliente informou a categoria (keyword),
    //    usamos busca por palavra-chave — resolve negocios mal-categorizados no
    //    Google (ex: grafica cadastrada como "eletronicos"). Senao, caimos no
    //    tipo detectado pelo Google.
    const useKeyword = keyword.length >= 2;
    let nearbyUrl =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&language=pt-BR&key=${API_KEY}`;
    let comparisonLabel;
    if (useKeyword) {
      nearbyUrl += `&keyword=${encodeURIComponent(keyword)}`;
      comparisonLabel = keyword;
    } else if (matchType) {
      nearbyUrl += `&type=${matchType}`;
      comparisonLabel = matchType;
    } else {
      comparisonLabel = null;
    }

    const nearRes = await fetch(nearbyUrl);
    const near = await nearRes.json();
    const rawResults = near.results || [];

    // Com keyword confiamos na relevancia da busca do Google. Sem keyword, so
    // compara quem compartilha o tipo especifico do negocio (evita comparar
    // bicicletaria com cafe quando caimos no tipo do Google).
    const sameCategory = (p) => useKeyword || !matchType || (p.types || []).includes(matchType);

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
        category: comparisonLabel,
        radius,
        me: byId.get(biz.place_id)
      });
    }

    // 7. Score que SIMULA a lógica de prominência do Google (estimativa):
    // o volume de avaliações domina (com retorno decrescente via log) e a
    // nota modula. Ex: nota 4.6 com 4623 aval supera nota 5.0 com 96 aval.
    // (O Google usa mais sinais que a API não expõe — isto é aproximação.)
    const gscore = (p) => (p.rating || 0) * Math.log10((p.reviews || 0) + 1);
    const byGoogle = [...list].sort((a, b) => gscore(b) - gscore(a) || b.reviews - a.reviews);

    const rankGoogle = byGoogle.findIndex(p => p.place_id === biz.place_id) + 1;

    // 8. Top 5 na ordem estimada do Google, marcando o próprio negócio.
    //    PAYWALL: nome dos concorrentes só pra plano pago. Free ve posicao +
    //    nota + nº de avaliacoes (o "buraco"), mas o NOME fica bloqueado no
    //    backend (nao vai no JSON) — nao da pra burlar pelo inspetor.
    const paid = biz.plan === "pro";
    const top = byGoogle.slice(0, 5).map((p, i) => {
      const mine = p.place_id === biz.place_id;
      if (!mine && !paid) {
        return { place_id: `locked-${i}`, name: null, rating: p.rating, reviews: p.reviews, is_me: false };
      }
      return { ...p, is_me: mine };
    });

    return res.json({
      enough: true,
      total,
      category: comparisonLabel,
      radius,
      me: byId.get(biz.place_id),
      rank_google: rankGoogle,
      names_locked: !paid,
      top
    });
  } catch (err) {
    console.error("[competitors] erro:", err);
    return res.status(500).json({ error: err.message });
  }
}
