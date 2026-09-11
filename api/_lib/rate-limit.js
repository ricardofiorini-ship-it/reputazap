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

// ── O nosso próprio servidor não é um estranho ───────────────────────────
// O cron do resumo semanal pergunta a nota de CADA cliente ao nosso próprio
// /api/reviews e /api/bizinfo. Com 108 negócios isso é 108 chamadas por
// endpoint, de uma origem só, em 3 minutos — contra um teto de 120/hora
// pensado pra barrar estranho. O freio estava a 12 fichas de trancar o
// carteiro do lado de fora, e o 429 resultante seria lido pelo cron como
// "o Google não tem dados desse negócio": cliente pulado, em silêncio.
//
// FECHA POR PADRÃO: sem CRON_SECRET ninguém entra por aqui — inclusive nós.
// E uma chamada que SE DIZ interna sem ser reconhecida GRITA no log, porque
// é exatamente o sintoma de o cron ter voltado a bater no freio.
const CABECALHO_INTERNO = "x-startouch-internal";
let _avisouInterno = false;

export function chamadaInterna(req) {
  const enviado = req?.headers?.[CABECALHO_INTERNO];
  if (!enviado) return false;
  const segredo = process.env.CRON_SECRET;
  if (segredo && enviado === segredo) return true;
  if (!_avisouInterno) {
    _avisouInterno = true;
    console.warn(
      `[rate-limit] chamada se diz INTERNA e não foi reconhecida ` +
      `(${segredo ? "segredo não confere" : "CRON_SECRET ausente"}). ` +
      `Se for o cron, ele volta a disputar o teto por IP e começa a levar 429 ` +
      `— e cliente pulado no resumo semanal.`
    );
  }
  return false;
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
  // Chamada do nosso próprio cron: passa. O freio existe contra estranho.
  if (chamadaInterna(req)) return false;

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

/**
 * Tetos por endpoint, num lugar só.
 *
 * CALIBRAÇÃO (27/jul): a 1ª versão (30/h no diagnostico) era apertada demais e
 * barrou o próprio Ricardo testando o produto. O motivo: UMA abertura de painel
 * dispara 2–3 chamadas ao `diagnostico` (lentes + grade + sugestão de termos),
 * então 30/h ≈ 10 visitas/hora por IP — nada pra um dono trocando termos, ou
 * pra duas pessoas atrás do mesmo IP (loja, café, casa).
 *
 * O freio continua matando laço maluco (90/h ≈ 1 chamada a cada 40s sustentada)
 * e o teto diário continua limitando ataque com troca de IP. Quem segura o
 * dinheiro de verdade é a cota do Google (1.000/dia) com o cache na frente —
 * este freio aqui é o primeiro filtro, não a última linha.
 */
export const LIMITES = {
  // Marketing/público, cada chamada pode virar 1–5 chamadas ao Places (mas o
  // cache de 6h/7d absorve a maioria das repetições):
  diagnostico: { nome: "diagnostico", porIpHora: 90, globalDia: 1000 },
  // searchbiz ganhou cache de 24h em 09/set, junto com o AUTOCOMPLETE da tela
  // do convidado. Os dois andam juntos e por isso o freio subiu: agora uma
  // pessoa gasta 3–5 chamadas (uma por pausa na digitação) em vez de 1, e o
  // teto antigo — 40/h — dava só ~10 buscas por pessoa. Pior, o teto GLOBAL de
  // 400/dia derrubaria a busca do site inteiro depois de ~100 visitantes: a
  // porta de entrada do funil, fechada, calada, no meio da tarde.
  // Quem segura o dinheiro agora é o cache (chamada repetida não toca o Google).
  searchbiz:   { nome: "searchbiz",   porIpHora: 120, globalDia: 1500 },
  // IA custa por token e é o mais caro por chamada — mantém o 5/h de antes,
  // agora valendo de verdade (era por instância).
  radar:       { nome: "radar",       porIpHora: 5,  globalDia: 100 },
  // Painel de cliente: generoso e SEM teto global — não pode quebrar pra quem paga.
  bizinfo:     { nome: "bizinfo",     porIpHora: 120 },
  reviews:     { nome: "reviews",     porIpHora: 120 }
};
