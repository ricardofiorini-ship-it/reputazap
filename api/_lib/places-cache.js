// ============================================================
// StarTouch — Cache curto das respostas do Google Places
// ============================================================
// Guarda no Supabase (tabela `places_cache`) o resultado de uma chamada cara ao
// Places por algumas horas. TTL é checado na LEITURA e escolhido por quem chama
// — mesmo padrão do ranking_grid_cache e do radar_cache.
//
// POR QUÊ: bizinfo, reviews e as lentes do diagnóstico batiam no Google em TODA
// visita, sem guardar nada. Em julho/2026 a cota gratuita do SKU "Places
// Details" acabou no dia 20 e cada chamada passou a custar ~R$0,095 (+R$0,029
// se pedir reviews). Nota/endereço/telefone/posição não mudam de hora em hora.
//
// REGRAS:
// 1. Best-effort — nenhuma falha de cache pode derrubar a resposta ao cliente.
// 2. Não cacheia vazio: se o produtor devolver null/undefined (ex: Google não
//    achou o place_id, timeout tratado), grava NADA. Cachear erro por 6h
//    transformaria uma falha momentânea do Google em falha longa nossa.
// 3. Sempre `await` na escrita antes de responder — em serverless a promise
//    solta morre com a invocação (ver reference_vercel_serverless_promises).
// ============================================================
import { createClient } from "@supabase/supabase-js";

let _sb = null;
function sb() {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _sb = createClient(url, key, { auth: { persistSession: false } });
  return _sb;
}

// O silêncio total já custou caro uma vez: o schema do cache da grade nunca foi
// rodado, todo erro era engolido e o cache passou dias "ligado" sem guardar nada
// — cada visita queimando Places. Avisa uma vez por instância, sem virar ruído.
let _avisou = false;
function avisaFalha(where, msg) {
  if (_avisou) return;
  _avisou = true;
  console.warn(
    `[places-cache] DESLIGADO (${where}): ${msg}. Rode supabase/schema-places-cache.sql — ` +
    `sem a tabela, toda visita queima Google Places.`
  );
}

async function ler(cacheKey, ttlMs) {
  const supabase = sb();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("places_cache")
      .select("payload, created_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (error) { avisaFalha("leitura", error.message); return null; }
    if (!data) return null;
    if (Date.now() - new Date(data.created_at).getTime() > ttlMs) return null; // expirou
    return data;
  } catch (e) {
    avisaFalha("leitura", e.message);
    return null;
  }
}

async function gravar(cacheKey, payload) {
  const supabase = sb();
  if (!supabase) return;
  try {
    const { error } = await supabase.from("places_cache").upsert(
      { cache_key: cacheKey, payload, created_at: new Date().toISOString() },
      { onConflict: "cache_key" }
    );
    if (error) avisaFalha("escrita", error.message);
  } catch (e) {
    avisaFalha("escrita", e.message);
  }
}

/**
 * Executa `produce()` só se não houver resposta fresca no cache.
 *
 * @param {Object}   o
 * @param {string}   o.key      Chave completa, com versão e parâmetros.
 *                              Ex: `bizinfo:v1:${placeId}`. Trocar a versão
 *                              (v1→v2) invalida tudo de uma vez quando o
 *                              formato do payload mudar.
 * @param {number}   o.ttlMs    Validade. Curto (1–6h) pra dado de Places.
 * @param {Function} o.produce  async () => payload — a chamada CARA. Se devolver
 *                              null/undefined, nada é gravado.
 * @param {boolean}  [o.fresh]  Ignora a leitura e mede na hora (ainda grava).
 *                              QUEIMA Places: nunca exponha isso num caminho
 *                              público sem segredo.
 * @returns {Promise<{data:any, cached:boolean, measuredAt:string}>}
 */
export async function comCachePlaces({ key, ttlMs, produce, fresh = false }) {
  if (!key) throw new Error("places-cache: key obrigatória");
  if (typeof produce !== "function") throw new Error("places-cache: produce obrigatório");

  if (!fresh) {
    const hit = await ler(key, ttlMs);
    if (hit) return { data: hit.payload, cached: true, measuredAt: hit.created_at };
  }

  const data = await produce();
  const measuredAt = new Date().toISOString();
  if (data !== null && data !== undefined) await gravar(key, data);
  return { data, cached: false, measuredAt };
}

/** Normaliza pedaço de chave (minúsculo, sem acento, sem espaço duplo). */
export function chaveDe(v) {
  return (v == null ? "" : String(v))
    .trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Libera o bypass do cache só com segredo (reusa GRID_FRESH_SECRET, já usado
 * pelo ?fresh=1 da grade). Sem a env, `fresh` nunca liga — endpoint público não
 * pode ter botão de "queima dinheiro".
 */
export function freshAutorizado(req) {
  const segredo = process.env.GRID_FRESH_SECRET;
  return !!req?.query?.fresh && !!segredo && req.query.secret === segredo;
}

/** TTLs padrão (ms) — um lugar só pra ajustar a política de frescor. */
export const TTL = {
  BIZINFO: 6 * 60 * 60 * 1000,   // nota, endereço, telefone, foto: mudam devagar
  REVIEWS: 3 * 60 * 60 * 1000,   // avaliações recentes: janela mais curta
  LENSES:  6 * 60 * 60 * 1000,   // posição/concorrentes: não muda de hora em hora
  // Cliente logado no plano grátis: UMA medição por semana (30/jul). Não é
  // política de custo, é limite de produto — o que se vende no Pro é medir
  // quando quiser. Casa com o TTL de 7 dias da grade, pra as duas metades do
  // painel envelhecerem juntas em vez de uma contradizer a outra.
  LENSES_FREE: 7 * 24 * 60 * 60 * 1000
};
