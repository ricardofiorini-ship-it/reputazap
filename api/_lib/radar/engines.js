// ============================================================
// StarTouch — IA Radar: motores de IA com busca real (grounding)
// ============================================================
// 3 motores baratos, cada um pesquisando na web:
//   - Gemini  (gemini-2.0-flash + Google Search)
//   - OpenAI  (gpt-4o-mini + web_search via Responses API; fallback chat)
//   - Perplexity (sonar — grounding nativo, fetch direto)
//
// Regra de transparência (spec): só roda o motor cuja chave existe.
// Falha de um motor NÃO derruba os outros (tratada no handler).
// ============================================================
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { fetchWithTimeout } from "../fetch-timeout.js";
import { buildCacheKey, getCached, setCached } from "./cache.js";

const TIMEOUT_MS = 20000; // motores com busca web são mais lentos

// ---------- disponibilidade por chave ----------
export const hasGemini = () => !!process.env.GEMINI_API_KEY;
export const hasOpenAI = () => !!process.env.OPENAI_API_KEY;
export const hasPerplexity = () => !!process.env.PERPLEXITY_API_KEY;

export function availableEngines() {
  const list = [];
  if (hasGemini()) list.push("gemini");
  if (hasOpenAI()) list.push("openai");
  if (hasPerplexity()) list.push("perplexity");
  return list;
}

// ---------- clientes lazy ----------
let _genai = null;
function genai() {
  if (!_genai) _genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return _genai;
}
let _openai = null;
function openai() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// ---------- Gemini ----------
async function askGemini(pergunta) {
  const model = genai().getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{ googleSearch: {} }], // grounding nativo
  });
  const r = await model.generateContent(pergunta);
  return r.response.text();
}

// Geração simples (sem grounding) — usada na etapa de avaliação. Mais barata.
export async function geminiEval(prompt) {
  const model = genai().getGenerativeModel({ model: "gemini-2.0-flash" });
  const r = await model.generateContent(prompt);
  return r.response.text();
}

// ---------- OpenAI ----------
async function askOpenAI(pergunta) {
  try {
    // Caminho preferido: Responses API com web search.
    const r = await openai().responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search" }],
      input: pergunta,
    });
    return r.output_text || "";
  } catch (err) {
    // Fallback documentado: se a conta/SDK não tiver web_search, usa chat.completions
    // (sem grounding). O handler ainda reporta o motor, mas sem busca web.
    console.warn("[radar] openai web_search indisponível, fallback chat.completions:", err.message);
    const c = await openai().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: pergunta }],
    });
    return c.choices?.[0]?.message?.content || "";
  }
}

// ---------- Perplexity ----------
async function askPerplexity(pergunta) {
  const res = await fetchWithTimeout(
    "https://api.perplexity.ai/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: pergunta }] }),
    },
    TIMEOUT_MS
  );
  if (!res.ok) throw new Error(`Perplexity HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

const ENGINE_FN = { gemini: askGemini, openai: askOpenAI, perplexity: askPerplexity };

// Roda 1 pergunta num motor, com cache (lê antes, salva depois).
async function askWithCache({ motor, categoria, cidade, pergunta }) {
  const cacheKey = buildCacheKey({ motor, categoria, cidade, pergunta });
  const cached = await getCached(cacheKey);
  if (cached != null) return { pergunta, resposta: cached, cached: true };

  const resposta = await ENGINE_FN[motor](pergunta);
  await setCached({ cacheKey, motor, pergunta, resposta });
  return { pergunta, resposta, cached: false };
}

// Roda TODAS as perguntas de UM motor (em paralelo). Perguntas que falham são
// descartadas; o total reflete só as que responderam.
// Retorna { motor, respostas: [{pergunta,resposta}], total, falhas }.
export async function runEngine({ motor, categoria, cidade, perguntas }) {
  const settled = await Promise.allSettled(
    perguntas.map((pergunta) => askWithCache({ motor, categoria, cidade, pergunta }))
  );
  const respostas = [];
  let falhas = 0;
  for (const s of settled) {
    if (s.status === "fulfilled" && s.value?.resposta) respostas.push(s.value);
    else falhas++;
  }
  return { motor, respostas, total: respostas.length, falhas };
}
