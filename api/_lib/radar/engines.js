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
  // Caminho preferido: com grounding (Google Search). Se a versão do SDK
  // @google/generative-ai não aceitar a tool nesse modelo, cai pra geração
  // sem grounding (ainda responde — melhor que derrubar o motor inteiro).
  // EXCEÇÃO: em erro de cota (429), NÃO faz fallback — retentar só queima
  // mais cota do plano gratuito. Propaga o erro pra falhar rápido.
  try {
    const model = genai().getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }], // grounding nativo
    });
    const r = await model.generateContent(pergunta);
    return r.response.text();
  } catch (err) {
    if (isQuotaError(err)) throw err;
    console.warn("[radar] gemini grounding indisponível, fallback sem grounding:", err.message);
    const model = genai().getGenerativeModel({ model: "gemini-2.0-flash" });
    const r = await model.generateContent(pergunta);
    return r.response.text();
  }
}

// Detecta erro de cota/limite (429 / RESOURCE_EXHAUSTED) pra não retentar à toa.
function isQuotaError(err) {
  const msg = (err?.message || "").toLowerCase();
  return err?.status === 429 || /\b429\b|quota|resource_exhausted|rate limit|too many requests/.test(msg);
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Roda as perguntas de UM motor de forma SEQUENCIAL, com pausa entre elas,
// pra não estourar o limite por minuto (free tier do Gemini é apertado).
// Respostas em cache não contam pausa (são instantâneas). Em erro de cota,
// aborta as perguntas seguintes do motor (não adianta insistir no mesmo minuto).
// Retorna { motor, respostas, total, falhas, erros }.
export async function runEngine({ motor, categoria, cidade, perguntas }) {
  const respostas = [];
  const erros = [];
  for (let i = 0; i < perguntas.length; i++) {
    try {
      const v = await askWithCache({ motor, categoria, cidade, pergunta: perguntas[i] });
      if (v?.resposta) respostas.push(v);
      else erros.push("resposta vazia");
      if (!v?.cached && i < perguntas.length - 1) await sleep(400); // gentil com o RPM
    } catch (err) {
      erros.push(err?.message || String(err));
      if (isQuotaError(err)) break; // cota estourada: para de insistir neste motor
    }
  }
  return { motor, respostas, total: respostas.length, falhas: erros.length, erros };
}
