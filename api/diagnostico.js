// ============================================================
// StarTouch — Diagnóstico público (isca de captação)
// ============================================================
// Endpoint PÚBLICO (sem auth). Usa o MESMO motor do app
// (fetchRankingByTerm) — ranqueia pela ordem real do Google
// (Text Search do termo). Assim o número do diagnóstico bate
// com o que o cliente vê depois de virar usuário.
//
// Uso: /api/diagnostico?place_id=XXX  (opcional &keyword= &radius=)
// É marketing — mostra nomes dos líderes (diferente do paywall do app).
// ============================================================
import { fetchRankingByTerm, fetchVisibilityLenses, applyNameLocking } from "./_lib/competitors.js";

const gscore = (rt, rv) => (rt || 0) * Math.log10((rv || 0) + 1);

// Sugestões de termo relacionadas — viram botões clicáveis no diagnóstico.
const SUGGESTIONS = {
  "padaria": ["padaria", "padaria artesanal", "confeitaria"],
  "padaria artesanal": ["padaria artesanal", "padaria", "confeitaria"],
  "confeitaria": ["confeitaria", "doceria", "padaria"],
  "cafeteria": ["cafeteria", "padaria", "confeitaria"],
  "restaurante": ["restaurante", "restaurante japonês", "churrascaria", "pizzaria"],
  "restaurante japonês": ["restaurante japonês", "sushi", "restaurante"],
  "restaurante árabe": ["restaurante árabe", "esfiharia", "restaurante"],
  "restaurante italiano": ["restaurante italiano", "pizzaria", "restaurante"],
  "pizzaria": ["pizzaria", "pizzaria napolitana", "restaurante"],
  "pizzaria napolitana": ["pizzaria napolitana", "pizzaria"],
  "hamburgueria": ["hamburgueria", "hamburgueria artesanal", "lanchonete"],
  "hamburgueria artesanal": ["hamburgueria artesanal", "hamburgueria", "lanchonete"],
  "lanchonete": ["lanchonete", "hamburgueria", "pastelaria"],
  "churrascaria": ["churrascaria", "restaurante"],
  "açaí": ["açaí", "sorveteria"],
  "sorveteria": ["sorveteria", "gelateria", "açaí"],
  "gelateria": ["gelateria", "sorveteria"],
  "barbearia": ["barbearia", "salão de beleza"],
  "salão de beleza": ["salão de beleza", "barbearia", "estética"],
  "estética": ["estética", "salão de beleza"],
  "petshop": ["petshop", "pet shop"],
  "farmácia": ["farmácia", "drogaria"],
  "academia": ["academia", "crossfit"],
  "mercado": ["mercado", "hortifruti", "mercearia"],
  "hortifruti": ["hortifruti", "mercado"],
  "pastelaria": ["pastelaria", "lanchonete"],
  "esfiharia": ["esfiharia", "restaurante árabe"],
  "clínica": ["clínica", "clínica odontológica"],
  "clínica odontológica": ["clínica odontológica", "dentista"],
  "bakery": ["padaria", "padaria artesanal", "confeitaria"],
  "restaurant": ["restaurante", "restaurante japonês", "pizzaria"],
  "bar": ["bar", "boteco", "pub", "restaurante"],
  "cafe": ["cafeteria", "padaria"],
  "beauty_salon": ["salão de beleza", "estética"],
  "hair_care": ["barbearia", "salão de beleza"],
  "gym": ["academia"],
  "pharmacy": ["farmácia", "drogaria"],
  "meal_takeaway": ["lanchonete", "restaurante"],
  "meal_delivery": ["lanchonete", "restaurante"],
  "supermarket": ["mercado", "hortifruti"],
  "grocery_or_supermarket": ["mercado", "hortifruti"]
};
function suggestFor(term) {
  const base = SUGGESTIONS[term] || SUGGESTIONS[(term || "").toLowerCase()] || [];
  if (!base.length) return [];
  return [...new Set([term, ...base])].slice(0, 4);
}

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

  // Modo VISIBILIDADE MULTI-LENTE: mesma busca (ordem real do Google) em raios
  // diferentes. Nomes de concorrente bloqueados (público), como no resto.
  if (req.query.lenses) {
    try {
      const vis = await fetchVisibilityLenses({ placeId, keyword });
      const lenses = (vis.lenses || []).map((L) => ({
        key: L.key,
        label: L.label,
        radiusKm: L.radiusKm,
        rank: L.rank,
        total: L.total,
        inResults: L.inResults,
        // Nomes liberados (sem blur) — concorrentes são free no projeto e o dono
        // precisa ver pra validar a fidelidade do ranking.
        top: (L.top || []).slice(0, 6).map((c, i) => ({
          pos: i + 1,
          name: c.name || null,
          rating: c.rating ?? null,
          reviews: c.reviews ?? 0,
          isMe: !!c.is_me
        }))
      }));
      return res.json({ ok: true, term: vis.term, name: vis.me?.name || null, lenses });
    } catch (err) {
      console.error("[diagnostico/lenses] erro:", err);
      return res.status(500).json({ error: err.message || "Erro ao gerar lentes" });
    }
  }

  try {
    const snap = await fetchRankingByTerm({ placeId, keyword, radius });

    if (!snap.enough) {
      return res.json({
        ok: true,
        enough: false,
        name: snap.me?.name || null,
        rating: snap.me?.rating ?? null,
        reviews: snap.me?.reviews ?? 0,
        category: snap.category || null,
        radius: snap.radius,
        total: snap.total || 0
      });
    }

    const myReviews = snap.me?.reviews || 0;
    const ahead = snap.ahead; // { reviews, rating, name } | null
    const reviewsToNext = ahead ? Math.max(0, (ahead.reviews || 0) - myReviews) : 0;

    // Nomes de concorrente são recurso Pro — trava no público (mesmo paywall do app).
    // Mostra posição, nota e nº de avaliações; nome vem null (front borra).
    const lockedTop = applyNameLocking(snap.top || [], false);
    const top = lockedTop.slice(0, 5).map((c, i) => ({
      pos: i + 1,
      name: c.name || null,   // null = concorrente (borrado no front)
      rating: c.rating ?? null,
      reviews: c.reviews ?? 0,
      isMe: !!c.is_me
    }));

    return res.json({
      ok: true,
      enough: true,
      name: snap.me?.name || null,
      rating: snap.me?.rating ?? 0,
      reviews: myReviews,
      category: snap.category || null,
      radius: snap.radius,
      rank: snap.myRank,
      total: snap.total,
      inResults: snap.inResults,
      reviewsToNext,
      aheadName: null,         // nome do concorrente à frente não é revelado (Pro)
      ratingShortcut: null,
      suggestions: suggestFor(snap.category),
      top
    });
  } catch (err) {
    console.error("[diagnostico] erro:", err);
    return res.status(500).json({ error: err.message || "Erro ao gerar diagnóstico" });
  }
}
