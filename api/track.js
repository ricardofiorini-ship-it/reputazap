// ============================================================
// StarTouch — Tracking do funil (POST /api/track)
// ============================================================
// Registra um passo do funil do convidado numa tabela própria (funnel_events),
// pra alimentar o painel /admin/funil. Público e best-effort: nunca derruba a
// navegação; step fora da allowlist é ignorado em silêncio (anti-lixo).
// Complementa o GA4 (o front dispara os dois) — aqui o dado é NOSSO.
// ============================================================
import { createClient } from "@supabase/supabase-js";

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

// Só estes passos são aceitos (evita poluição por chamadas forjadas).
const STEPS = new Set([
  "guest_search_view",
  "guest_search_submit",
  "guest_panel_view",
  "guest_signup_click",
  "signup_complete",
]);

// Reutilizável pelo próprio backend (ex: /api/register loga signup_complete).
export async function logFunnel({ step, anon_id, meta }) {
  if (!STEPS.has(step)) return;
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from("funnel_events").insert({
      step,
      anon_id: anon_id ? String(anon_id).slice(0, 64) : null,
      meta: meta && typeof meta === "object" ? meta : {},
    });
  } catch {
    /* best-effort: medição nunca quebra o fluxo */
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  const step = (body.step || "").toString().trim();
  // step inválido → 204 silencioso (não é erro do cliente que precise de retry).
  if (!STEPS.has(step)) return res.status(204).end();

  await logFunnel({ step, anon_id: body.anon_id, meta: body.meta });
  return res.status(204).end();
}
