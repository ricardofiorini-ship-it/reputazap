// ============================================================
// StarTouch — Cron: alerta de avaliação negativa nova (GRÁTIS p/ todos)
// ============================================================
// Schedule: a cada 6h (vercel.json). Verifica as avaliações mais
// recentes de cada negócio e, se houver uma NOVA com nota baixa
// (<=2★) nas últimas 48h, dispara email pro dono na hora.
//
// Sem alteração de schema: idempotência via email_log (dedupe por
// review_id) — nunca manda 2x pro mesmo review. A janela de 48h evita
// alertar reviews antigos na primeira rodada.
//
// Limitação honesta: a API pública do Google devolve só as ~5 reviews
// mais recentes. Pega a maioria pra negócio local (volume baixo);
// cobertura total só com a API do Google Meu Negócio (futuro).
//
// Auth: Bearer ${CRON_SECRET} ou header x-vercel-cron.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "../_lib/fetch-timeout.js";
import { sendTransactionalEmail } from "../_lib/email-sender.js";
import { negativeReviewEmail } from "../_lib/email-templates.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CRON_SECRET = process.env.CRON_SECRET;
const API_KEY = process.env.PLACES_API_KEY;

const WINDOW_MS = 48 * 60 * 60 * 1000; // só alerta reviews das últimas 48h
const NEG_MAX = 2;                     // nota <= 2 = negativa
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function checkAuth(req) {
  if (req.headers["x-vercel-cron"] === "1") return true;
  if (!CRON_SECRET) {
    console.warn("[cron/review-alerts] CRON_SECRET ausente — rejeitando");
    return false;
  }
  return (req.headers.authorization || "") === `Bearer ${CRON_SECRET}`;
}

export default async function handler(req, res) {
  const stats = { started_at: new Date().toISOString(), processed: 0, alerts_sent: 0, skipped: 0, errors: [], took_ms: 0 };
  const t0 = Date.now();

  // Auth: header do cron OU ?secret=CRON_SECRET (permite teste pelo navegador)
  const secretOk = CRON_SECRET && req.query.secret === CRON_SECRET;
  if (!secretOk && !checkAuth(req)) return res.status(401).json({ error: "Não autorizado" });

  // ── GATILHO DE TESTE: ?test=1&secret=...&to=email ──────────────
  // Manda 1 email de EXEMPLO de avaliação negativa pro endereço informado.
  // Isolado: 1 destinatário, não toca em nenhum negócio. Pra validar template+entrega.
  if (req.query.test === "1") {
    const to = (req.query.to || process.env.ADMIN_NOTIFICATIONS_EMAIL || "").trim();
    if (!to) return res.status(400).json({ error: "Informe ?to=seuemail@dominio.com" });
    const tmpl = negativeReviewEmail({
      bizName: req.query.biz || "Seu Negócio (exemplo)",
      author: "Cliente Teste",
      rating: 1,
      text: "Demorei muito pra ser atendido e o pedido veio errado. (avaliação de exemplo — teste do StarTouch)",
      placeId: null
    });
    const result = await sendTransactionalEmail({
      userId: "00000000-0000-0000-0000-000000000000",
      emailType: "negative_review_test",
      to,
      subject: "[TESTE] " + tmpl.subject,
      html: tmpl.html,
      metadata: { test: true }
    });
    return res.json({ ok: true, test: true, to, result });
  }

  if (!API_KEY) return res.status(500).json({ error: "PLACES_API_KEY ausente" });

  // 1. Todos os negócios com place_id — alerta de avaliação negativa é GRÁTIS
  //    (motor de valor/retenção; os alertas de ranking é que são Pro).
  const { data: bizs, error: bizErr } = await supabase
    .from("businesses")
    .select("id, place_id, name, user_id")
    .not("place_id", "is", null);
  if (bizErr) return res.status(500).json({ error: bizErr.message });
  if (!bizs?.length) { stats.took_ms = Date.now() - t0; return res.json({ ...stats, note: "nenhum negócio" }); }

  // 2. Email dos donos (auth.users) — 1 chamada, vira mapa
  const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map((usersList?.users || []).map(u => [u.id, u.email]));

  // 3. Preferências de alerta (respeita quem desligou email)
  const userIds = [...new Set(bizs.map(b => b.user_id))];
  const { data: prefsRows } = await supabase
    .from("alert_preferences")
    .select("user_id, email_enabled, email_to")
    .in("user_id", userIds);
  const prefsById = new Map((prefsRows || []).map(p => [p.user_id, p]));

  const cutoff = Date.now() - WINDOW_MS;

  for (const biz of bizs) {
    stats.processed++;
    try {
      const prefs = prefsById.get(biz.user_id);
      if (prefs && prefs.email_enabled === false) { stats.skipped++; continue; }
      const to = (prefs?.email_to || "").trim() || emailById.get(biz.user_id);
      if (!to) { stats.skipped++; continue; }

      // Reviews mais recentes (até ~5)
      const r = await fetchWithTimeout(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${biz.place_id}&fields=name,reviews&reviews_sort=newest&language=pt-BR&key=${API_KEY}`,
        {}, 6000
      );
      const d = await r.json();
      const reviews = d.result?.reviews || [];

      for (const rv of reviews) {
        const ratingN = rv.rating || 0;
        const tsMs = (rv.time || 0) * 1000;
        if (ratingN > NEG_MAX) continue;       // só negativas
        if (tsMs < cutoff) continue;           // só recentes (últimas 48h)

        const tmpl = negativeReviewEmail({
          bizName: biz.name,
          author: rv.author_name,
          rating: ratingN,
          text: rv.text,
          placeId: biz.place_id
        });
        const result = await sendTransactionalEmail({
          userId: biz.user_id,
          emailType: "negative_review",
          to,
          subject: tmpl.subject,
          html: tmpl.html,
          metadata: { review_id: String(rv.time), place_id: biz.place_id, rating: ratingN },
          dedupeByMetadata: { key: "review_id", value: String(rv.time) }
        });
        if (result?.sent) stats.alerts_sent++;
      }

      await sleep(200); // rate limit local
    } catch (e) {
      stats.errors.push({ business_id: biz.id, name: biz.name, error: e.message || String(e) });
      console.error("[cron/review-alerts] erro:", biz.id, e);
    }
  }

  stats.took_ms = Date.now() - t0;
  console.log("[cron/review-alerts] concluído:", JSON.stringify(stats));
  return res.json(stats);
}
