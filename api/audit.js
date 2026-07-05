// ============================================================
// StarTouch — Auditoria de presença (GET/POST /api/audit)
// ============================================================
// Recebe place_id + (opcional) url do site e devolve o JSON do checklist
// "orçamento de oficina" que alimenta a página /radar/plano (item 1 da
// FUNIL-IMPACTO-SPEC — pré-requisito de todos os outros gatilhos).
//
// Público (sem auth): os dados auditados são públicos (perfil Google + site).
// Camada Google via Places API (já integrada); camada site via fetch+parse.
// Rate limit best-effort por IP/hora — o custo real é 1 chamada Places + 3
// fetches de site por auditoria.
//
// Formato de resposta (200):
// {
//   place_id, business:{name,category,rating,reviews_total,address,phone,website,...},
//   site:{ detected:bool, url },
//   groups:[ { key,title, items:[ {id,label,status,detail} ], note? } ],
//   summary:{ passed, pending, na, total_auditable },
//   pendencias:N, generated_at
// }
// status ∈ "pass" (✓) | "fail" (✗ pendente) | "na" (— não se aplica)
// ============================================================
import { runAudit } from "./_lib/audit/index.js";

// Rate limit simples por IP/hora (best-effort; instância quente da Vercel).
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_LIMIT) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  return false;
}
function getIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // Aceita params por query (GET) ou body (POST).
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== "object") body = {};

  const placeId = (req.query.place_id || body.place_id || "").toString().trim();
  const site = (req.query.site || body.site || "").toString().trim();

  if (!placeId) {
    return res.status(400).json({ error: "place_id é obrigatório" });
  }
  if (!process.env.PLACES_API_KEY) {
    return res.status(503).json({ error: "PLACES_API_KEY não configurada no ambiente." });
  }
  if (rateLimited(getIp(req))) {
    return res.status(429).json({ error: "Muitas auditorias seguidas. Tente novamente em alguns minutos." });
  }

  try {
    const audit = await runAudit({ placeId, site });
    // Cache curto na borda: a mesma placa/link reabre sem re-auditar toda hora,
    // mas o dado não fica velho a ponto de mentir na página de venda.
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    return res.json(audit);
  } catch (err) {
    console.error("[audit] erro:", err);
    return res.status(502).json({ error: err.message || "Não foi possível auditar o negócio agora." });
  }
}
