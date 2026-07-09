// ============================================================
// StarTouch — Ranking por grade (GET /api/ranking-grid) — Passo 1
// ============================================================
// DORMENTE por padrão: só responde com RANKING_GRID_ENABLED=true. Sem a flag,
// devolve 503 — nenhum fluxo de produção o chama ainda (a UI vem no Passo 2).
// Isola custo (5–15 chamadas Places/diagnóstico) atrás da flag + cache + rate limit.
//
//   ?place_id=…&suggest=1          → termos sugeridos (categoria/nome do Google)
//   ?place_id=…&terms=a,b,c        → ranking por grade (com cache 7 dias/termo)
// ============================================================
import { suggestTerms, fetchPlaceSeed } from "./_lib/competitors.js";
import { fetchGridRankingCached } from "./_lib/ranking-grid-cache.js";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_LIMIT) { hits.set(ip, arr); return true; }
  arr.push(now); hits.set(ip, arr); return false;
}
function getIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  return fwd ? fwd.split(",")[0].trim() : (req.socket?.remoteAddress || "unknown");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  // Flag: dormente em produção até virarmos a chave (Passo 4).
  if (process.env.RANKING_GRID_ENABLED !== "true") {
    return res.status(503).json({ error: "Ranking por grade ainda não está ativo." });
  }
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  const placeId = (req.query.place_id || "").toString().trim();
  if (!placeId) return res.status(400).json({ error: "place_id é obrigatório" });
  if (!process.env.PLACES_API_KEY) return res.status(503).json({ error: "PLACES_API_KEY ausente" });
  if (rateLimited(getIp(req))) return res.status(429).json({ error: "Muitas consultas seguidas. Tente em alguns minutos." });

  try {
    // Sugestão de termos (antes do dono escolher).
    if (req.query.suggest) {
      const seed = await fetchPlaceSeed(placeId);
      if (!seed) return res.status(404).json({ error: "Negócio não encontrado" });
      return res.json({
        name: seed.name,
        suggestions: suggestTerms(seed.name, seed.types, seed.primaryDisplay, seed.primaryType),
      });
    }

    // Ranking por grade (com cache).
    const terms = (req.query.terms || "").toString().split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3);
    if (!terms.length) return res.status(400).json({ error: "Informe ao menos 1 termo (?terms=a,b,c)." });

    const grid = await fetchGridRankingCached({ placeId, terms });
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.json(grid);
  } catch (err) {
    console.error("[ranking-grid] erro:", err);
    return res.status(502).json({ error: err.message || "Não foi possível calcular o ranking agora." });
  }
}
