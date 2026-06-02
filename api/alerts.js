// ============================================================
// StarTouch — API de alertas (dispatcher por ?action=)
// ============================================================
// Actions:
//   - GET  ?action=preferences      → busca preferências do user
//   - POST ?action=preferences      → upsert preferências
//
// (Futuro Fase 2b)
//   - GET  ?action=list             → lista alertas do user
//   - POST ?action=mark-read        → marca lido
// ============================================================

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function authUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return { error: "Token obrigatório", status: 401 };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { error: "Token inválido", status: 401 };
  return { user: data.user };
}

// ── GET preferences ────────────────────────────────────────────
async function handleGetPreferences(req, res, user) {
  const { data, error } = await supabase
    .from("alert_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[alerts.preferences GET] erro:", error);
    return res.status(500).json({ error: error.message });
  }

  // Se ainda não existe, devolve defaults baseados no user
  if (!data) {
    return res.json({
      preferences: {
        user_id: user.id,
        dashboard_enabled: true,
        email_enabled: true,
        email_frequency: "realtime",
        email_to: user.email || null,
        whatsapp_enabled: false,
        whatsapp_phone: null,
        whatsapp_critical_only: true,
        enabled_types: {},
        updated_at: null,
        is_default: true
      }
    });
  }

  return res.json({ preferences: data });
}

// ── POST preferences (upsert) ─────────────────────────────────
async function handleSavePreferences(req, res, user) {
  const body = req.body || {};
  const VALID_FREQ = ["realtime", "daily_digest", "weekly_digest"];

  const payload = {
    user_id: user.id,
    dashboard_enabled: body.dashboard_enabled !== false,
    email_enabled: body.email_enabled === true,
    email_frequency: VALID_FREQ.includes(body.email_frequency) ? body.email_frequency : "realtime",
    email_to: (body.email_to && String(body.email_to).trim()) || user.email || null,
    whatsapp_enabled: body.whatsapp_enabled === true,
    whatsapp_phone: body.whatsapp_phone ? String(body.whatsapp_phone).trim() || null : null,
    whatsapp_critical_only: body.whatsapp_critical_only !== false,
    enabled_types: body.enabled_types && typeof body.enabled_types === "object" ? body.enabled_types : {},
    updated_at: new Date().toISOString()
  };

  // Validação básica de email
  if (payload.email_enabled && payload.email_to && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email_to)) {
    return res.status(400).json({ error: "Email pra envio inválido." });
  }
  // Validação básica de telefone (mínimo 10 dígitos)
  if (payload.whatsapp_enabled) {
    const digits = (payload.whatsapp_phone || "").replace(/\D/g, "");
    if (digits.length < 10) {
      return res.status(400).json({ error: "WhatsApp inválido. Use DDD + número (ex: 11 99999-9999)." });
    }
  }

  const { data, error } = await supabase
    .from("alert_preferences")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("[alerts.preferences POST] erro:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ ok: true, preferences: data });
}

// ── Dispatcher ────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action || req.query.a;

  try {
    const auth = await authUser(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    const user = auth.user;

    if (action === "preferences" && req.method === "GET")  return await handleGetPreferences(req, res, user);
    if (action === "preferences" && req.method === "POST") return await handleSavePreferences(req, res, user);

    return res.status(400).json({
      error: "Action não reconhecida. Use ?action=preferences (GET ou POST)."
    });
  } catch (err) {
    console.error("[alerts] erro não tratado:", err);
    if (!res.headersSent) return res.status(500).json({ error: err?.message || "Erro interno" });
  }
}
