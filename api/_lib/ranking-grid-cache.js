// ============================================================
// StarTouch — Cache do ranking por grade (Passo 1)
// ============================================================
// Cacheia o resultado da grade por (place_id, termo) com TTL de 7 dias, pra
// segurar o custo do Places: 5 pontos × termo só são queimados 1x/semana por
// negócio. Revisitas do painel (o caso mais comum) saem do cache = ~0 custo.
// Best-effort: falha de cache nunca derruba o cálculo.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { fetchGridRanking } from "./competitors.js";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
    if (error || !data) return null;
    if (Date.now() - new Date(data.created_at).getTime() > TTL_MS) return null; // expirou
    // Guard de formato: entradas antigas (antes da agregação) não têm `ranking`.
    // Trata como miss → recomputa no formato novo (auto-conserta o cache velho).
    if (!data.result || data.result.ranking === undefined) return null;
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
    await supabase.from("ranking_grid_cache").upsert(
      { place_id: placeId, term_norm: norm(term), term, result, created_at: new Date().toISOString() },
      { onConflict: "place_id,term_norm" }
    );
  } catch {
    /* ignora erro de escrita de cache */
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
    await Promise.all((computed.terms || []).map((t) =>
      setCached(placeId, t.term, { ...t, name: computed.name, center: computed.center })
    ));
  }

  // 3. Remonta na ordem pedida (cache + fresco).
  const outTerms = termList.map((term) => {
    const c = cachedByTerm[norm(term)];
    if (c) return { ...c, cached: true };
    const f = (computed?.terms || []).find((t) => norm(t.term) === norm(term));
    return f ? { ...f, name: computed.name, center: computed.center, cached: false, measuredAt: measuredNow } : null;
  }).filter(Boolean);

  const name = computed?.name || outTerms[0]?.name || null;
  const center = computed?.center || outTerms[0]?.center || null;
  return { placeId, name, center, terms: outTerms };
}
