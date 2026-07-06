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
    return data.result;
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
 * @returns {Promise<Object>} { placeId, name, center, terms:[{...,cached:bool}] }
 */
export async function fetchGridRankingCached({ placeId, terms, spacingM, radius }) {
  const termList = (Array.isArray(terms) ? terms : [terms])
    .map((t) => (t || "").toString().trim()).filter(Boolean).slice(0, 3);
  if (!placeId || !termList.length) throw new Error("place_id e ao menos 1 termo obrigatórios");

  // 1. Lê o cache de cada termo em paralelo.
  const cachedByTerm = {};
  const cold = [];
  await Promise.all(termList.map(async (term) => {
    const c = await getCached(placeId, term);
    if (c) cachedByTerm[norm(term)] = c;
    else cold.push(term);
  }));

  // 2. Só os termos frios vão pro Places (uma chamada, compartilha o Details).
  let fresh = null;
  if (cold.length) {
    fresh = await fetchGridRanking({ placeId, terms: cold, spacingM, radius });
    await Promise.all((fresh.terms || []).map((t) =>
      setCached(placeId, t.term, { ...t, name: fresh.name, center: fresh.center })
    ));
  }

  // 3. Remonta na ordem pedida (cache + fresco).
  const outTerms = termList.map((term) => {
    const c = cachedByTerm[norm(term)];
    if (c) return { ...c, cached: true };
    const f = (fresh?.terms || []).find((t) => norm(t.term) === norm(term));
    return f ? { ...f, name: fresh.name, center: fresh.center, cached: false } : null;
  }).filter(Boolean);

  const name = fresh?.name || outTerms[0]?.name || null;
  const center = fresh?.center || outTerms[0]?.center || null;
  return { placeId, name, center, terms: outTerms };
}
