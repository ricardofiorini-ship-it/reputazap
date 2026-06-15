// ============================================================
// StarTouch — IA Radar: cache de respostas dos motores
// ============================================================
// Reaproveita respostas de perguntas genéricas (mesma categoria/cidade)
// pra não re-queimar token. Expira em 7 dias.
// Reutiliza as MESMAS envs do StarTouch: SUPABASE_URL + SUPABASE_SERVICE_KEY.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

// Cliente lazy: só cria se as envs existirem, e sem derrubar o módulo se faltarem.
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

// Normaliza pra compor a chave (minúsculo, sem espaços nas bordas).
const norm = (s) => (s || "").toString().trim().toLowerCase();

export function buildCacheKey({ motor, categoria, cidade, pergunta }) {
  const hash = crypto.createHash("sha256").update(norm(pergunta)).digest("hex").slice(0, 16);
  return `${norm(motor)}|${norm(categoria)}|${norm(cidade)}|${hash}`;
}

// Lê resposta do cache se existir e tiver < 7 dias. Retorna string ou null.
export async function getCached(cacheKey) {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("radar_cache")
      .select("resposta, created_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (error || !data) return null;
    const age = Date.now() - new Date(data.created_at).getTime();
    if (age > CACHE_TTL_MS) return null; // expirou: re-executa
    return data.resposta;
  } catch {
    return null; // falha de cache nunca derruba o diagnóstico
  }
}

// Salva (upsert) a resposta no cache. Best-effort.
export async function setCached({ cacheKey, motor, pergunta, resposta }) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase
      .from("radar_cache")
      .upsert(
        { cache_key: cacheKey, motor, pergunta, resposta, created_at: new Date().toISOString() },
        { onConflict: "cache_key" }
      );
  } catch {
    /* ignora erro de escrita de cache */
  }
}

// Salva o diagnóstico no histórico. Best-effort (não derruba a resposta).
export async function saveDiagnostic({ nome, categoria, cidade, score, mencoes, total, concorrentes, detalhe }) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from("radar_diagnostics").insert({
      nome, categoria, cidade, score, mencoes, total,
      concorrentes: concorrentes || [],
      detalhe: detalhe || {},
    });
  } catch {
    /* ignora */
  }
}
