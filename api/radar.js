// ============================================================
// StarTouch — IA Radar (POST /api/radar)
// ============================================================
// Mede em quantas respostas de IAs com busca na web o negócio é citado,
// quais concorrentes aparecem, e devolve um score 0-100 + diagnóstico.
//
// Stack real do StarTouch (não Next.js): Vercel Serverless Function ESM.
// Custo controlado por cache (radar_cache, 7 dias) e modelos baratos.
// Falha de um motor não derruba o diagnóstico (Promise.allSettled).
// Transparência: só reporta motores que de fato rodaram.
// ============================================================
import { availableEngines, runEngine } from "./_lib/radar/engines.js";
import {
  buildQuestions,
  evaluateEngine,
  consolidateCompetitors,
  computeScore,
  buildDiagnostico,
} from "./_lib/radar/score.js";
import { saveDiagnostic } from "./_lib/radar/cache.js";
import { lookupCep } from "./_lib/radar/cep.js";

// ---- Rate limit simples por IP/hora (best-effort; instância quente da Vercel) ----
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map(); // ip -> [timestamps]
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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  // body (Vercel já faz parse de JSON; fallback defensivo se vier string)
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== "object") body = {};

  const nome = (body.nome || "").toString().trim();
  const categoria = (body.categoria || "").toString().trim();
  let cidade = (body.cidade || "").toString().trim();
  const cep = (body.cep || "").toString().trim();
  if (!nome || !categoria) {
    return res.status(400).json({ error: "Informe nome e categoria." });
  }

  if (rateLimited(getIp(req))) {
    return res.status(429).json({ error: "Muitos diagnósticos seguidos. Tente novamente em alguns minutos." });
  }

  // CEP (opcional) → descobre o bairro pra refinar as perguntas; se faltar
  // cidade, deriva da resposta do ViaCEP.
  let bairro = null;
  if (cep) {
    const geo = await lookupCep(cep);
    if (geo) {
      bairro = geo.bairro;
      if (!cidade && geo.cidade) cidade = geo.uf ? `${geo.cidade}, ${geo.uf}` : geo.cidade;
    }
  }
  if (!cidade) {
    return res.status(400).json({ error: "Informe a cidade ou um CEP válido." });
  }

  // Produtos/serviços-chave (opcional) → perguntas de nicho mais relevantes.
  let produtos = [];
  if (Array.isArray(body.produtos)) produtos = body.produtos;
  else if (typeof body.produtos === "string") produtos = body.produtos.split(",");
  produtos = produtos.map((p) => (p || "").toString().trim()).filter(Boolean).slice(0, 3);

  const engines = availableEngines();
  if (engines.length === 0) {
    return res.status(503).json({
      error: "Nenhum motor de IA configurado. Defina GEMINI_API_KEY, OPENAI_API_KEY e/ou PERPLEXITY_API_KEY.",
    });
  }

  try {
    const perguntas = buildQuestions(categoria, cidade, bairro, produtos);

    // Roda os motores ativos em paralelo. Cada um roda suas 6 perguntas (com cache).
    const settled = await Promise.allSettled(
      engines.map((motor) => runEngine({ motor, categoria, cidade, perguntas }))
    );

    // Mantém só motores que produziram ao menos 1 resposta (regra de transparência).
    const ran = [];
    const debug = [];
    settled.forEach((s, i) => {
      if (s.status === "fulfilled" && s.value.total > 0) {
        ran.push(s.value);
      } else {
        const why =
          s.status === "rejected"
            ? s.reason?.message || String(s.reason)
            : `0/${perguntas.length} respostas — ${(s.value?.erros || []).slice(0, 2).join(" | ") || "sem detalhe"}`;
        debug.push(`${engines[i]}: ${why}`);
        console.warn(`[radar] motor ${engines[i]} não rodou:`, why);
      }
    });

    if (ran.length === 0) {
      const isQuota = debug.some((d) => /429|quota|resource_exhausted|rate limit|too many/i.test(d));
      return res.status(502).json({
        error: isQuota
          ? "Limite de uso da IA atingido (cota do plano gratuito). Aguarde um minuto e tente de novo — ou ative o faturamento na chave do Gemini pra liberar o limite."
          : "Os motores de IA não responderam agora. Tente novamente em instantes.",
        debug,
      });
    }

    // Avalia cada motor (menções + concorrentes), em paralelo.
    const evals = await Promise.all(
      ran.map(async (er) => {
        const ev = await evaluateEngine({ nome, categoria, cidade, respostas: er.respostas });
        return { motor: er.motor, ...ev };
      })
    );

    // Agrega.
    const mencoes = evals.reduce((s, e) => s + e.mencoes, 0);
    const total = evals.reduce((s, e) => s + e.total, 0);
    const score = computeScore(mencoes, total);
    const concorrentes = consolidateCompetitors(evals.map((e) => e.concorrentes));
    const motoresAtivos = evals.map((e) => e.motor);

    const porMotor = {};
    for (const e of evals) {
      porMotor[e.motor] = {
        mencoes: e.mencoes,
        total: e.total,
        concorrentes: e.concorrentes,
        itens: e.itens || [], // detalhe por pergunta (transparência)
      };
    }

    const diagnostico = buildDiagnostico({ nome, score, mencoes, total, concorrentes, motoresAtivos });

    // Histórico (best-effort).
    await saveDiagnostic({
      nome, categoria, cidade, score, mencoes, total, concorrentes,
      detalhe: { local: { cidade, bairro }, produtos, porMotor },
    });

    return res.json({ score, mencoes, total, concorrentes, diagnostico, porMotor, local: { cidade, bairro } });
  } catch (err) {
    console.error("[radar] erro:", err);
    return res.status(500).json({ error: err.message || "Erro ao gerar o diagnóstico de IA." });
  }
}
