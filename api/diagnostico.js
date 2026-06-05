// ============================================================
// StarTouch — Diagnóstico público (isca de captação)
// ============================================================
// Endpoint PÚBLICO (sem auth): dado um place_id, devolve o
// diagnóstico competitivo do negócio — posição no ranking,
// nota, avaliações, líderes da categoria e quanto falta pra subir.
// Reusa o mesmo motor do produto (fetchCompetitorsSnapshot →
// gscore = nota × log10(avaliações+1)).
//
// Uso: /api/diagnostico?place_id=XXX  (opcional &keyword=)
// É marketing/demo — por isso mostra nomes dos líderes (diferente
// do paywall do app, onde nome de concorrente é Pro).
// ============================================================
import { fetchCompetitorsSnapshot } from "./_lib/competitors.js";

const gscore = (rt, rv) => (rt || 0) * Math.log10((rv || 0) + 1);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=600"); // 10 min
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  const placeId = req.query.place_id || req.query.place;
  const keyword = (req.query.keyword || "").trim();
  if (!placeId) return res.status(400).json({ error: "place_id obrigatório" });

  try {
    const snap = await fetchCompetitorsSnapshot({ placeId, keyword });

    // Negócio achado, mas sem concorrentes suficientes pra ranquear
    if (!snap.enough) {
      return res.json({
        ok: true,
        enough: false,
        name: snap.me?.name || null,
        rating: snap.me?.rating ?? null,
        reviews: snap.me?.reviews ?? 0,
        category: snap.category || null,
        total: snap.total || 0
      });
    }

    const rank = snap.myRank;
    const total = snap.total;
    const myRating = snap.me?.rating || 0;
    const myReviews = snap.me?.reviews || 0;

    // Concorrente diretamente à frente (uma posição acima)
    const ahead = snap.ahead; // { reviews, rating } | null
    // Nome do "à frente" só se ele estiver no top 5 retornado
    let aheadName = null;
    if (rank > 1 && Array.isArray(snap.top) && snap.top[rank - 2]) {
      aheadName = snap.top[rank - 2].name || null;
    }

    // Quanto falta em avaliações pra alcançar quem está à frente
    const reviewsToNext = ahead ? Math.max(0, (ahead.reviews || 0) - myReviews) : 0;

    // Atalho da nota: que nota empataria com o "à frente" mantendo as avaliações atuais
    let ratingShortcut = null;
    if (ahead) {
      const needed = gscore(ahead.rating, ahead.reviews) / Math.log10(myReviews + 1);
      if (needed > myRating && needed <= 5 && (needed - myRating) <= 0.3) {
        ratingShortcut = Math.ceil(needed * 10) / 10;
      }
    }

    const top = (snap.top || []).map((c, i) => ({
      pos: i + 1,
      name: c.name || null,
      rating: c.rating ?? null,
      reviews: c.reviews ?? 0,
      isMe: !!c.is_me
    }));

    return res.json({
      ok: true,
      enough: true,
      name: snap.me?.name || null,
      rating: myRating,
      reviews: myReviews,
      category: snap.category || null,
      rank,
      total,
      reviewsToNext,
      aheadName,
      ratingShortcut,
      top
    });
  } catch (err) {
    console.error("[diagnostico] erro:", err);
    return res.status(500).json({ error: err.message || "Erro ao gerar diagnóstico" });
  }
}
