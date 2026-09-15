// ============================================================
// StarTouch — Cache do ranking por grade (Passo 1)
// ============================================================
// Cacheia o resultado da grade por (place_id, termo) com TTL de 7 dias, pra
// segurar o custo do Places: 5 pontos × termo só são queimados 1x/semana por
// negócio. Revisitas do painel (o caso mais comum) saem do cache = ~0 custo.
// Best-effort: falha de cache nunca derruba o cálculo.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { fetchGridRanking, GRID_SPACING_M } from "./competitors.js";
import { metricasDoCliente, confrontoDireto, principaisConcorrentes } from "./visibilidade.js";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Versão do FORMATO/CÁLCULO do resultado guardado.
// v2 (27/jul): pontos passam a cortar concorrentes fora do raio (haversine).
// v3 (15/set): entra `observations` — a lista ordenada de cada ponto, com
//   distância. Nenhum número mudou.
const RESULT_V = 3;

// DUAS PERGUNTAS DIFERENTES, e misturá-las custa caro nos dois sentidos.
//
// "Este resultado ainda é VERDADE?" → V_COMPATIVEIS. Subir a versão invalidava
// tudo, o que é certo quando a medição foi CORRIGIDA: número velho não pode
// sobreviver ao conserto (foi o caso da v1, sem corte de distância, que fica
// fora desta lista de propósito e para sempre).
//
// "Este resultado tem os CAMPOS novos?" → quem consome checa `observations`.
// A v3 só acrescentou campo; avg, score, coverage e ranking saem idênticos.
// Tratar v2 como miss recomputaria a grade da base inteira de uma vez — ~570
// chamadas ao Places — pra ganhar um campo que ainda não está em nenhuma tela.
// Servindo v2 até os 7 dias vencerem, a migração sai de graça e espalhada.
//
// REGRA: só entra aqui versão que MUDOU O FORMATO sem mudar número. Versão que
// consertou uma conta nunca entra.
const V_COMPATIVEIS = new Set([2, 3]);

let _sb = null;
function sb() {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _sb = createClient(url, key, { auth: { persistSession: false } });
  return _sb;
}

const norm = (s) => (s || "").toString().trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// O cache é best-effort: nenhuma falha dele pode derrubar o cálculo. Mas silêncio
// total esconde o pior caso — a TABELA NÃO EXISTIR. Foi o que aconteceu: o
// schema-ranking-grid.sql nunca rodou, todo `getCached` deu erro engolido, e o
// cache passou dias "ligado" sem nunca guardar nada (5 chamadas Places por termo,
// em toda visita). Avisa uma vez por instância, sem virar ruído no log.
let _avisouCache = false;
function avisaFalhaCache(where, msg) {
  if (_avisouCache) return;
  _avisouCache = true;
  console.warn(`[grid-cache] DESLIGADO (${where}): ${msg}. Rode supabase/schema-ranking-grid.sql. Cada visita vai queimar Places.`);
}

async function getCached(placeId, term) {
  const supabase = sb();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("ranking_grid_cache")
      .select("result, created_at")
      .eq("place_id", placeId)
      .eq("term_norm", norm(term))
      .maybeSingle();
    if (error) { avisaFalhaCache("leitura", error.message); return null; }
    if (!data) return null;
    if (Date.now() - new Date(data.created_at).getTime() > TTL_MS) return null; // expirou
    // Guard de formato: entradas antigas (antes da agregação) não têm `ranking`.
    // Trata como miss → recomputa no formato novo (auto-conserta o cache velho).
    if (!data.result || data.result.ranking === undefined) return null;
    // Guard de VERSÃO: entrada medida por uma regra anterior (ex: sem corte de
    // distância) é miss — número velho não pode sobreviver ao conserto. Versão
    // que só ganhou campo novo continua válida (ver V_COMPATIVEIS acima); quem
    // precisa do campo testa `observations`, não a versão.
    if (!V_COMPATIVEIS.has(data.result.v || 1)) return null;
    // Carimba QUANDO foi medido. Sem isso o painel mostra a posição de até 7 dias
    // atrás como se fosse a de hoje — e não há como distinguir, olhando a tela,
    // um bug de ranking de um cache velho.
    return { ...data.result, measuredAt: data.created_at };
  } catch {
    return null;
  }
}

async function setCached(placeId, term, result) {
  const supabase = sb();
  if (!supabase) return;
  try {
    const { error } = await supabase.from("ranking_grid_cache").upsert(
      { place_id: placeId, term_norm: norm(term), term, result, created_at: new Date().toISOString() },
      { onConflict: "place_id,term_norm" }
    );
    if (error) avisaFalhaCache("escrita", error.message);
  } catch (e) {
    avisaFalhaCache("escrita", e.message);   // nunca derruba o cálculo
  }
}

// ============================================================
// HISTORICO — uma linha por medicao NOVA (passo 8, 15/09/2026)
// ============================================================
// O cache responde "como voce esta agora" e sobrescreve o passado. A pergunta
// que vende e outra: "melhorou ou piorou desde a semana passada". Tabela
// propria (supabase/schema-visibilidade-historico.sql), so insere.
//
// SO GRAVA MEDICAO NOVA. Leitura de cache nao e um scan — gravaria a mesma
// medicao varias vezes e o grafico mostraria "estabilidade" que e so gente
// abrindo o painel.
let _avisouHist = false;
async function gravaHistorico({ placeId, termo, spacingM, radius }) {
  const supabase = sb();
  if (!supabase) return;
  try {
    const obs = termo?.observations;
    if (!Array.isArray(obs) || !obs.some((o) => o && o.ok)) return;
    const metrics = metricasDoCliente(obs);
    if (!metrics.measured_points) return;   // nada medido: nao ha o que registrar

    // Catalogo de nomes vem do `ranking`, que ja foi montado nesta medicao.
    const cat = {};
    for (const r of termo.ranking || []) if (r && r.name) cat[r.place_id || r.name] = { name: r.name };
    const principais = principaisConcorrentes(confrontoDireto(obs, placeId, cat), 5);

    const { error } = await supabase.from("visibility_scans").insert({
      place_id: placeId,
      term: termo.term,
      grid_version: RESULT_V,
      spacing_m: spacingM ?? GRID_SPACING_M,
      radius_m: radius ?? null,
      metrics,
      competitors: principais,
    });
    // O supabase-js NAO lanca em erro de escrita: devolve {error} e segue. Sem
    // conferir, a falha e muda e a serie historica fica com buracos que so
    // aparecem meses depois, quando alguem for montar o grafico. E o defeito
    // que existe ate hoje em _lib/email-sender.js:118, e que nao se repete aqui.
    if (error) throw new Error(error.message);
  } catch (e) {
    // Grita UMA VEZ por instancia. O caso mais provavel e a tabela nao existir
    // porque o SQL nao foi rodado — foi exatamente o que aconteceu com o
    // proprio ranking_grid_cache, que passou dias "ligado" sem guardar nada.
    if (_avisouHist) return;
    _avisouHist = true;
    console.error("[visibilidade] HISTORICO NAO ESTA SENDO GRAVADO: " + e.message +
      " — rodou supabase/schema-visibilidade-historico.sql?");
  }
}

/**
 * Ranking por grade COM cache por termo. Só computa (queima Places) os termos
 * que não estão no cache/expiraram; o resto vem do banco. Se TODOS os termos
 * estiverem no cache, não faz nenhuma chamada ao Places.
 * @param {boolean} [fresh=false] IGNORA a leitura do cache e mede na hora (ainda
 *   grava o resultado). Ferramenta de diagnóstico: sem ela não dá pra distinguir
 *   "o ranking está errado" de "o cache está velho" olhando a tela. QUEIMA Places
 *   em toda chamada — nunca expor num caminho público sem gate.
 * @returns {Promise<Object>} { placeId, name, center, terms:[{...,cached:bool,measuredAt}] }
 */
export async function fetchGridRankingCached({ placeId, terms, spacingM, radius, fresh = false }) {
  const termList = (Array.isArray(terms) ? terms : [terms])
    .map((t) => (t || "").toString().trim()).filter(Boolean).slice(0, 3);
  if (!placeId || !termList.length) throw new Error("place_id e ao menos 1 termo obrigatórios");

  // 1. Lê o cache de cada termo em paralelo (fresh=1 pula a leitura: tudo é frio).
  const cachedByTerm = {};
  const cold = [];
  await Promise.all(termList.map(async (term) => {
    const c = fresh ? null : await getCached(placeId, term);
    if (c) cachedByTerm[norm(term)] = c;
    else cold.push(term);
  }));

  // 2. Só os termos frios vão pro Places (uma chamada, compartilha o Details).
  let computed = null;
  const measuredNow = new Date().toISOString();
  if (cold.length) {
    computed = await fetchGridRanking({ placeId, terms: cold, spacingM, radius });
    // AWAIT de verdade nos dois: em serverless a funcao congela assim que a
    // resposta sai, e promessa solta morre pela metade. Regra do projeto.
    await Promise.all((computed.terms || []).map((t) =>
      setCached(placeId, t.term, { ...t, v: RESULT_V, name: computed.name, center: computed.center })
    ));
    await Promise.allSettled((computed.terms || []).map((t) =>
      gravaHistorico({ placeId, termo: t, spacingM, radius })
    ));
  }

  // 3. Remonta na ordem pedida (cache + fresco).
  // `spacingM` vai junto em CADA termo (não só no topo) porque quem consome no
  // front é o termo — a tabela, o Score e a tarja recebem `terms[0]` e todos
  // precisam dizer de que distância estão falando. Sem isso o texto teria que
  // hardcodar "1 km" e mentiria no dia em que a grade mudasse.
  const spacing = spacingM ?? GRID_SPACING_M;
  const outTerms = termList.map((term) => {
    const c = cachedByTerm[norm(term)];
    if (c) return { ...c, cached: true };
    const f = (computed?.terms || []).find((t) => norm(t.term) === norm(term));
    return f ? { ...f, name: computed.name, center: computed.center, cached: false, measuredAt: measuredNow } : null;
  }).filter(Boolean).map((t) => ({ ...t, spacingM: spacing }));

  const name = computed?.name || outTerms[0]?.name || null;
  const center = computed?.center || outTerms[0]?.center || null;
  return { placeId, name, center, spacingM: spacing, terms: outTerms };
}
