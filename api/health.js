// ============================================================
// StarTouch — Health check do sistema
// ============================================================
// Acesse em https://startouch.com.br/api/health pra ver o estado
// de todos os serviços e variáveis de ambiente.
//
// Não requer auth — info segura (nunca expõe valores reais das
// chaves, só se estão presentes).
// ============================================================

const REQUIRED_ENVS = [
  // Core — sem isso nada funciona
  { name: "SUPABASE_URL",         category: "core",     description: "URL do projeto Supabase" },
  { name: "SUPABASE_ANON_KEY",    category: "core",     description: "Chave pública de auth" },
  { name: "SUPABASE_SERVICE_KEY", category: "core",     description: "Chave admin (server-only)" },
  { name: "PLACES_API_KEY",       category: "core",     description: "Google Places (busca + reviews + mapa)" },
  // Email
  { name: "RESEND_API_KEY",       category: "email",    description: "Envio de emails (peneira + alertas)" },
  { name: "RESEND_FROM",          category: "email",    description: "'De' do email (opcional, default onboarding@resend.dev)", optional: true },
  // Login Google
  { name: "GOOGLE_CLIENT_ID",     category: "auth",     description: "Login com Google" },
  // Mercado Pago
  { name: "MP_ACCESS_TOKEN",      category: "billing",  description: "Mercado Pago (assinatura Pro + kit)" },
  { name: "MP_WEBHOOK_SECRET",    category: "billing",  description: "Validação de webhook (opcional, recomendado)", optional: true },
  { name: "MP_PRO_PAYMENT_LINK",  category: "billing",  description: "Link estático MP (opcional)", optional: true },
  // Crons
  { name: "CRON_SECRET",          category: "cron",     description: "Auth do cron de snapshot semanal" }
];

async function ping(url, options = {}) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(timeout);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    clearTimeout(timeout);
    return { ok: false, error: e.message || "timeout" };
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");

  const startedAt = Date.now();

  // ── Env vars: presença ──
  const envs = REQUIRED_ENVS.map((spec) => {
    const value = process.env[spec.name];
    const present = typeof value === "string" && value.trim().length > 0;
    return {
      name: spec.name,
      category: spec.category,
      description: spec.description,
      optional: !!spec.optional,
      present,
      status: present ? "ok" : (spec.optional ? "warn" : "missing")
    };
  });

  // ── Services: pings rápidos ──
  const services = [];

  // Supabase (precisa do apikey header pra acessar endpoint de auth)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    const r = await ping(process.env.SUPABASE_URL + "/auth/v1/health", {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    });
    services.push({ name: "Supabase", ok: r.ok, status: r.status, error: r.error });
  } else {
    services.push({ name: "Supabase", ok: false, error: "SUPABASE_URL ou SUPABASE_ANON_KEY ausente" });
  }

  // Google Places API
  if (process.env.PLACES_API_KEY) {
    // Geocoding de CEP conhecido (rápido, ~200ms)
    const r = await ping(
      `https://maps.googleapis.com/maps/api/geocode/json?address=01310-100&key=${process.env.PLACES_API_KEY}`
    );
    services.push({ name: "Google Places API", ok: r.ok, status: r.status, error: r.error });
  } else {
    services.push({ name: "Google Places API", ok: false, error: "PLACES_API_KEY ausente" });
  }

  // Resend (só checa se chave existe — não vamos enviar email só pra testar)
  services.push({
    name: "Resend (Email)",
    ok: !!process.env.RESEND_API_KEY,
    error: process.env.RESEND_API_KEY ? null : "RESEND_API_KEY ausente"
  });

  // Mercado Pago
  if (process.env.MP_ACCESS_TOKEN) {
    const r = await ping("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    services.push({ name: "Mercado Pago", ok: r.ok, status: r.status, error: r.error });
  } else {
    services.push({ name: "Mercado Pago", ok: false, error: "MP_ACCESS_TOKEN ausente" });
  }

  // ── Resumo ──
  const missingRequired = envs.filter(e => e.status === "missing");
  const failingServices = services.filter(s => !s.ok);
  const allGood = missingRequired.length === 0 && failingServices.length === 0;

  const summary = {
    status: allGood ? "ok" : (missingRequired.length > 0 ? "missing_env" : "service_error"),
    message: allGood
      ? "✅ Tudo OK — sistema pronto pra produção"
      : missingRequired.length > 0
      ? `❌ ${missingRequired.length} variável(is) de ambiente obrigatória(s) ausente(s)`
      : `⚠️ ${failingServices.length} serviço(s) externo(s) com problema`,
    missing_envs: missingRequired.map(e => e.name),
    failing_services: failingServices.map(s => s.name),
    took_ms: Date.now() - startedAt,
    timestamp: new Date().toISOString()
  };

  res.status(allGood ? 200 : 503);
  return res.json({
    summary,
    envs,
    services
  });
}
