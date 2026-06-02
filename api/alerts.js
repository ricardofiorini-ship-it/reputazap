// ============================================================
// StarTouch — API de alertas (dispatcher por ?action=)
// ============================================================
// Actions:
//   - GET  ?action=preferences      → busca preferências do user
//   - POST ?action=preferences      → upsert preferências
//   - POST ?action=test             → envia 1 alerta de TESTE pelos canais
//                                     configurados (email/WhatsApp)
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

// ── POST test (envia 1 alerta de exemplo pelos canais ativos) ─
const EMAIL_FROM = process.env.RESEND_FROM || "StarTouch <alertas@resend.dev>";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function renderTestAlertHtml({ bizName, userName }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#202124;background:#F8F9FA;">
      <div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1A73E8;margin-bottom:6px;">🧪 ALERTA DE TESTE</div>
      <h2 style="margin:0 0 4px;color:#202124;">Olá, ${escapeHtml(userName || "tudo bem?")} 👋</h2>
      <p style="color:#5F6368;font-size:13.5px;line-height:1.55;margin-top:0;margin-bottom:18px;">
        Esse é um <strong>alerta de teste</strong> do StarTouch — você acabou de clicar em "Enviar teste" lá no painel. Os alertas reais vão chegar nesse mesmo formato quando alguma coisa importante mudar no ranking de ${escapeHtml(bizName || "seu negócio")}.
      </p>

      <!-- Exemplo de alerta real -->
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;color:#137333;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:6px;">↑ CONQUISTA</div>
        <div style="font-size:16px;font-weight:700;color:#202124;line-height:1.35;margin-bottom:4px;">
          Você entrou no Top 3!
        </div>
        <div style="font-size:13px;color:#5F6368;line-height:1.5;">
          Subiu da 4ª pra 3ª posição na sua categoria. Continue assim.
        </div>
      </div>

      <p style="font-size:12px;color:#80868B;line-height:1.6;text-align:center;margin-top:24px;">
        💡 Você está recebendo isso porque ativou alertas por email no painel. Pra mudar a frequência ou desligar, acesse <a href="https://startouch.com.br/app?tab=alertas" style="color:#1A73E8;font-weight:600;text-decoration:none;">o painel de alertas</a>.
      </p>

      <p style="font-size:11px;color:#A8B0BB;text-align:center;margin-top:30px;">
        StarTouch · Reputação no piloto automático
      </p>
    </div>
  `;
}

async function handleSendTest(req, res, user) {
  // Carrega prefs do user (ou usa defaults)
  const { data: prefs } = await supabase
    .from("alert_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const emailEnabled = prefs?.email_enabled ?? true;
  const emailTo = (prefs?.email_to || "").trim() || user.email;
  const whatsappEnabled = prefs?.whatsapp_enabled ?? false;
  const whatsappPhone = (prefs?.whatsapp_phone || "").trim();

  // Busca nome do negócio (pra personalizar)
  const { data: biz } = await supabase
    .from("businesses")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();
  const bizName = biz?.name || "seu negócio";
  const userName = user.user_metadata?.name || (user.email || "").split("@")[0] || "";

  const results = { email: null, whatsapp: null };

  // ── Email ──
  if (emailEnabled && emailTo) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[alerts.test] RESEND_API_KEY ausente — pulando envio de email.");
      results.email = { skipped: true, reason: "RESEND_API_KEY ausente no ambiente" };
    } else {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: [emailTo],
            subject: `🧪 Teste de alerta · ${bizName}`,
            html: renderTestAlertHtml({ bizName, userName })
          })
        });
        const data = await r.json();
        if (!r.ok) {
          console.error("[alerts.test] Resend erro:", data);
          results.email = { error: data?.message || "Erro ao enviar email" };
        } else {
          results.email = { sent: true, to: emailTo, id: data.id };
        }
      } catch (e) {
        console.error("[alerts.test] erro inesperado:", e);
        results.email = { error: e.message };
      }
    }
  } else {
    results.email = { skipped: true, reason: "Email desligado nas preferências ou sem destinatário" };
  }

  // ── WhatsApp (placeholder — sem integração ainda) ──
  if (whatsappEnabled && whatsappPhone) {
    results.whatsapp = { skipped: true, reason: "Integração WhatsApp será habilitada em breve" };
  } else {
    results.whatsapp = { skipped: true, reason: "WhatsApp desligado ou sem telefone" };
  }

  return res.json({ ok: true, results });
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
    if (action === "test" && req.method === "POST")        return await handleSendTest(req, res, user);

    return res.status(400).json({
      error: "Action não reconhecida. Use ?action=preferences (GET ou POST) ou ?action=test (POST)."
    });
  } catch (err) {
    console.error("[alerts] erro não tratado:", err);
    if (!res.headersSent) return res.status(500).json({ error: err?.message || "Erro interno" });
  }
}
