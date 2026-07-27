// ============================================================
// StarTouch — Limite de uso dos endpoints públicos
// ============================================================
// Contador atômico no Postgres (função `rl_hit`, ver supabase/schema-rate-limit.sql),
// compartilhado por TODAS as instâncias da Vercel. Dois freios por endpoint:
//
//   1. POR IP / HORA  — barra o F5 nervoso e o laço de um cliente só.
//   2. GLOBAL / DIA   — barra o ataque que troca de IP. Só nos endpoints de
//      marketing (diagnóstico, busca). O painel de quem já é cliente
//      (bizinfo/reviews) NÃO tem teto global: sob ataque, o que precisa
//      continuar de pé é o produto de quem paga.
//
// FALHA ABERTA de propósito: se o banco não responder, a requisição PASSA
// (com aviso no log). Um erro de Supabase não pode derrubar o site inteiro —
// e a cota do Google Cloud (1.000/dia) segue como rede de baixo.
//
// Custo: 1 ida ao Supabase por requisição pública. É de graça no plano atual e
// ~100ms; a alternativa (chamada ao Google) custa dinheiro de verdade.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

let _sb = null;
function sb() {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _sb = createClient(url, key, { auth: { persistSession: false } });
  return _sb;
}

// Mesma lição do places-cache: silêncio total esconde "a função/tabela não
// existe" e o freio fica desligado sem ninguém saber. Avisa uma vez por instância.
let _avisou = false;
function avisaFalha(msg) {
  if (_avisou) return;
  _avisou = true;
  console.warn(
    `[rate-limit] DESLIGADO: ${msg}. Rode supabase/schema-rate-limit.sql — ` +
    `sem a tabela/função, os endpoints públicos ficam sem freio.`
  );
}

export function getIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

/** Incrementa a janela e devolve o total de hits, ou null se o freio estiver indisponível. */
async function bump(key, windowMs) {
  const supabase = sb();
  if (!supabase) { avisaFalha("SUPABASE_SERVICE_KEY/URL ausente"); return null; }
  try {
    const { data, error } = await supabase.rpc("rl_hit", { p_key: key, p_window_ms: windowMs });
    if (error) { avisaFalha(error.message); return null; }
    return typeof data === "number" ? data : null;
  } catch (e) {
    avisaFalha(e?.message || String(e));
    return null;
  }
}

/**
 * Aplica os freios e, se estourou, JÁ RESPONDE 429.
 *
 * @returns {Promise<boolean>} true = já respondeu, o handler deve dar `return`.
 *
 * @example
 *   if (await limitou(req, res, { nome: "diagnostico", porIpHora: 30, globalDia: 200 })) return;
 */
export async function limitou(req, res, { nome, porIpHora, globalDia }) {
  const ip = getIp(req);

  // 1. Por IP / hora
  if (porIpHora) {
    const hits = await bump(`ip:${nome}:${ip}`, HORA_MS);
    if (hits !== null && hits > porIpHora) {
      res.setHeader("Retry-After", "3600");
      res.setHeader("Cache-Control", "no-store");
      res.status(429).json({
        error: "Muitas consultas em pouco tempo. Tente de novo em alguns minutos.",
        limite: `${porIpHora}/hora`
      });
      console.warn(`[rate-limit] ${nome}: IP ${ip} bloqueado (${hits} > ${porIpHora}/h)`);
      return true;
    }
  }

  // 2. Global / dia — só onde faz sentido (marketing). Protege a cota do Google
  //    pra quem já é cliente, mesmo num ataque que troca de IP.
  if (globalDia) {
    const hits = await bump(`global:${nome}`, DIA_MS);
    if (hits !== null && hits > globalDia) {
      res.setHeader("Retry-After", "3600");
      res.setHeader("Cache-Control", "no-store");
      res.status(429).json({
        error: "O limite diário desta consulta gratuita foi atingido. Tente novamente amanhã.",
        limite: `${globalDia}/dia`
      });
      console.warn(`[rate-limit] ${nome}: TETO DIÁRIO GLOBAL atingido (${hits} > ${globalDia}/dia) — IP ${ip}`);
      return true;
    }
  }

  return false;
}

/** Tetos por endpoint, num lugar só. Dimensionados com ~5x de folga sobre o uso real de 26/jul. */
export const LIMITES = {
  // Marketing/público, cada chamada pode virar 1–5 chamadas ao Places:
  diagnostico: { nome: "diagnostico", porIpHora: 30, globalDia: 200 },
  searchbiz:   { nome: "searchbiz",   porIpHora: 40, globalDia: 200 },
  // IA custa por token e é o mais caro por chamada — mantém o 5/h de antes,
  // agora valendo de verdade (era por instância).
  radar:       { nome: "radar",       porIpHora: 5,  globalDia: 100 },
  // Painel de cliente: generoso e SEM teto global — não pode quebrar pra quem paga.
  bizinfo:     { nome: "bizinfo",     porIpHora: 120 },
  reviews:     { nome: "reviews",     porIpHora: 120 }
};
