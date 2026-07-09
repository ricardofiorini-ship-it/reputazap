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
import { saveDiagnostic, getDiagnostic, getLatestDiagnosticByPlace } from "./_lib/radar/cache.js";
import { lookupCep } from "./_lib/radar/cep.js";
import { fetchWithTimeout } from "./_lib/fetch-timeout.js";
import { resolveRadarCategory } from "./_lib/competitors.js";
import { maybeSendPlanoEmail } from "./_lib/radar/plano-email.js";

// Com o place_id do fluxo "ache seu negócio no Google", puxa do Places o que o
// motor de IA precisa (nome, categoria em pt-BR, cidade) + o site (pra auditoria).
// Assim o formulário do /radar vira 1 passo só e o dado é o REAL do Google.
async function resolveBusinessFromPlace(placeId) {
  const API_KEY = process.env.PLACES_API_KEY;
  if (!API_KEY || !placeId) return null;
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}` +
      `&fields=name,types,website,address_components&language=pt-BR&key=${API_KEY}`;
    const data = await (await fetchWithTimeout(url, {}, 6000)).json();
    const r = data.result;
    if (!r) return null;

    const nome = r.name || "";
    // Categoria = a ARENA do exame. Vem do TIPO do Google (amplo e consistente),
    // não do nome. Ver resolveRadarCategory: "Le Moulin Padaria Artesanal" era
    // examinado contra artesanais e "Panatè Artesanal" contra padarias comuns,
    // só porque um escreveu "padaria" na placa e o outro não.
    // O `nicho` do nome não se perde: vira pergunta extra (ver handler POST).
    const { categoria, nicho } = resolveRadarCategory(nome, r.types);

    // Cidade + UF a partir dos address_components (mais confiável que o texto).
    const comps = r.address_components || [];
    const get = (type) => comps.find((c) => (c.types || []).includes(type));
    const city = get("administrative_area_level_2") || get("locality") || get("administrative_area_level_1");
    const uf = get("administrative_area_level_1");
    const cidade = [city?.long_name, uf?.short_name].filter(Boolean).join(", ");

    return { nome, categoria, nicho, cidade, site: (r.website || "").trim() || null };
  } catch (e) {
    console.warn("[radar] resolveBusinessFromPlace falhou:", e.message);
    return null;
  }
}

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

  // GET — leitura de diagnóstico salvo (sem custo de IA):
  //   ?code={id}       → a /radar/plano lê o diagnóstico pelo code
  //   ?place_id={pid}  → o widget do painel pega o ÚLTIMO diagnóstico do negócio
  if (req.method === "GET") {
    const code = (req.query.code || "").toString().trim();
    const placeId = (req.query.place_id || "").toString().trim();
    if (!code && !placeId) return res.status(400).json({ error: "code ou place_id obrigatório" });
    const d = code ? await getDiagnostic(code) : await getLatestDiagnosticByPlace(placeId);
    if (!d) return res.status(404).json({ error: "Diagnóstico não encontrado" });
    const detalhe = d.detalhe || {};
    return res.json({
      code: d.id,
      nome: d.nome,
      categoria: d.categoria,
      cidade: d.cidade,
      score: d.score,
      mencoes: d.mencoes,
      total: d.total,
      concorrentes: d.concorrentes || [],
      porMotor: detalhe.porMotor || {},
      local: detalhe.local || { cidade: d.cidade },
      // Termos de NICHO usados nas perguntas extras ("padaria artesanal"). Já
      // eram gravados em `detalhe`, mas nunca saíam daqui — sem eles a tela não
      // consegue separar "aparece no nicho" de "aparece na busca ampla", que é
      // o diagnóstico mais útil que o laudo tem a dar.
      produtos: detalhe.produtos || [],
      place_id: d.place_id || null,
      site: d.site || null,
      created_at: d.created_at,
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  // body (Vercel já faz parse de JSON; fallback defensivo se vier string)
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== "object") body = {};

  let nome = (body.nome || "").toString().trim();
  let categoria = (body.categoria || "").toString().trim();
  let cidade = (body.cidade || "").toString().trim();
  const cep = (body.cep || "").toString().trim();
  const placeId = (body.place_id || "").toString().trim();

  // Fluxo "ache seu negócio no Google": veio place_id → puxa nome/categoria/
  // cidade/site do Places (dado real) e preenche o que faltar.
  let site = null;
  let nicho = "";           // nicho do nome ("padaria artesanal") → pergunta extra
  if (placeId) {
    const biz = await resolveBusinessFromPlace(placeId);
    if (biz) {
      nome = nome || biz.nome;
      categoria = categoria || biz.categoria;
      nicho = biz.nicho || "";
      if (!cidade) cidade = biz.cidade;
      site = biz.site;
    }
  }

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
  produtos = produtos.map((p) => (p || "").toString().trim()).filter(Boolean);

  // O nicho que o NOME revela ("Le Moulin Padaria Artesanal") vira uma pergunta
  // extra, não a arena principal. Assim o Le Moulin continua sendo medido em
  // "padaria artesanal" — mas também em "padaria", como o Panatè e a Deôla.
  // Vai no fim: o que o dono digitou tem prioridade se estourar o teto de 3.
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (nicho && !produtos.some((p) => norm(p) === norm(nicho))) produtos.push(nicho);
  produtos = produtos.slice(0, 3);

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

    // Histórico + gera o code do link do plano (best-effort). place_id/site
    // deixam a /radar/plano rodar a auditoria ao vivo pelo code.
    const code = await saveDiagnostic({
      nome, categoria, cidade, score, mencoes, total, concorrentes,
      detalhe: { local: { cidade, bairro }, produtos, porMotor },
      place_id: placeId || null, site,
    });

    // Gatilho 3 (funil-impacto): se o place_id for de um negócio CADASTRADO,
    // manda o email do plano pro dono (cópia pro admin). Best-effort e awaited
    // antes do res.json (fire-and-forget não é confiável no serverless).
    // Não-cadastrado sai rápido (só a leitura em businesses) — sem custo extra.
    if (code && placeId) {
      await maybeSendPlanoEmail({ placeId, code, site }).catch((e) => console.warn("[radar] email do plano falhou:", e.message));
    }

    // `code` pode vir null (banco off ou colunas place_id/site ainda não
    // criadas) — nesse caso o /radar cai no relatório inline (fallback).
    // `produtos` e `categoria` também no POST: o laudo de fallback (sem `code`)
    // precisa separar nicho de busca ampla igual à tela real.
    return res.json({ code, score, mencoes, total, concorrentes, diagnostico, porMotor, categoria, produtos, local: { cidade, bairro }, place_id: placeId || null, site });
  } catch (err) {
    console.error("[radar] erro:", err);
    return res.status(500).json({ error: err.message || "Erro ao gerar o diagnóstico de IA." });
  }
}
