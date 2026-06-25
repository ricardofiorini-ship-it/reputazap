// ============================================================
// StarTouch — Cron: RESUMO SEMANAL (digest) pra TODOS os clientes
// ============================================================
// Schedule: Vercel Cron — segunda-feira 12:00 UTC (~09:00 BRT) (vercel.json).
//
// Itera todos os businesses com place_id e manda o resumo semanal
// (nota, veredito, Score, marco, últimas avaliações, artigo, indicação).
// Score COMPLETO (igual ao painel): puxa reviews + bizinfo + diagnostico.
//
// Respeita alert_preferences.email_enabled (default ON; opt-out via link de
// 1 clique no rodapé). Dedupe por semana (email_log) — re-rodar não duplica.
//
// Auth: Bearer ${CRON_SECRET} OU header x-vercel-cron. Chamada manual permitida.
// Params de teste: ?dry=1 (não envia, só lista) · ?limit=N (cap) ·
//   ?to=email (manda TUDO pra esse email, ignora destinatário real — debug).
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "../_lib/email-sender.js";
import {
  weeklyDigestEmail, pickWeeklyTip, emailScore, nextMilestone, latestArticle
} from "../_lib/email-templates.js";
import { unsubUrl } from "../_lib/unsubscribe.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CRON_SECRET = process.env.CRON_SECRET;
const ORIGIN = process.env.PUBLIC_BASE_URL || "https://startouch.com.br";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function checkAuth(req) {
  if (req.headers["x-vercel-cron"] === "1") return true;
  if (!CRON_SECRET) return false;
  return (req.headers.authorization || "") === `Bearer ${CRON_SECRET}`;
}

// Segunda-feira (UTC) da semana atual — chave de dedupe por semana.
function weekKey() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Dom..6=Sáb
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function fetchJson(url) {
  try {
    const r = await fetch(url);
    return await r.json();
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Não autorizado. Use Bearer ${CRON_SECRET}." });
  }

  const dry = req.query.dry === "1" || req.query.dry === "true";
  const forceTo = (req.query.to || "").trim() || null;
  const limit = parseInt(req.query.limit, 10);
  const week = weekKey();
  const tip = pickWeeklyTip();
  const article = latestArticle();

  const stats = {
    week, dry, started_at: new Date().toISOString(),
    businesses: 0, sent: 0, skipped_disabled: 0, skipped_dedupe: 0,
    skipped_no_email: 0, errors: [], recipients: [], took_ms: 0
  };
  const t0 = Date.now();

  // Businesses com place_id
  const { data: businesses, error: bizErr } = await supabase
    .from("businesses")
    .select("id, place_id, name, user_id, plan")
    .not("place_id", "is", null);
  if (bizErr) return res.status(500).json({ error: bizErr.message });

  // Emails dos donos + preferências
  const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map((usersList?.users || []).map((u) => [u.id, u.email]));
  const userIds = [...new Set((businesses || []).map((b) => b.user_id))];
  const { data: prefsRows } = await supabase
    .from("alert_preferences")
    .select("user_id, email_enabled, email_to")
    .in("user_id", userIds);
  const prefsById = new Map((prefsRows || []).map((p) => [p.user_id, p]));

  let list = businesses || [];
  if (Number.isFinite(limit) && limit > 0) list = list.slice(0, limit);

  for (const biz of list) {
    stats.businesses++;
    try {
      const prefs = prefsById.get(biz.user_id);
      if (prefs && prefs.email_enabled === false) { stats.skipped_disabled++; continue; }

      const to = forceTo || (prefs?.email_to || "").trim() || emailById.get(biz.user_id);
      if (!to) { stats.skipped_no_email++; continue; }

      // Dados reais (mesmas fontes do painel/test-weekly)
      const pid = encodeURIComponent(biz.place_id);
      const [rv, bi, diag] = await Promise.all([
        fetchJson(`${ORIGIN}/api/reviews?place_id=${pid}`),
        fetchJson(`${ORIGIN}/api/bizinfo?place_id=${pid}`),
        fetchJson(`${ORIGIN}/api/diagnostico?place_id=${pid}`),
      ]);
      if (!rv || (!rv.name && !rv.rating)) {
        stats.errors.push({ business_id: biz.id, error: "sem dados do Google" });
        continue;
      }

      const reviews = Array.isArray(rv.reviews) ? rv.reviews : [];
      const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
      const newThisWeek = reviews.filter((r) => Number(r.id) >= weekAgo).length;
      const totalReviews = rv.total ?? bi.total ?? 0;
      const score = emailScore({
        rating: rv.rating ?? bi.rating, reviews: totalReviews,
        total: diag.total, pos: diag.rank,
        photo: bi.photoUrl, phone: bi.phone, category: bi.category,
      });
      const unsub = unsubUrl(biz.user_id);
      const tmpl = weeklyDigestEmail({
        bizName: rv.name, rating: rv.rating, total: totalReviews,
        newThisWeek, recentReviews: reviews, tip, score,
        milestone: nextMilestone(totalReviews), article, unsubUrl: unsub,
      });

      if (dry) {
        stats.recipients.push({ business: rv.name, to, score: score.score, new_this_week: newThisWeek });
      } else {
        const r = await sendTransactionalEmail({
          userId: biz.user_id,
          emailType: "weekly_digest",
          to,
          subject: tmpl.subject,
          html: tmpl.html,
          metadata: { week, business_id: biz.id },
          dedupeByMetadata: { key: "week", value: week },
          headers: {
            "List-Unsubscribe": `<${unsub}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        if (r?.sent) { stats.sent++; stats.recipients.push({ business: rv.name, to }); }
        else if (r?.skipped) stats.skipped_dedupe++;
        else if (r?.error) stats.errors.push({ business_id: biz.id, error: r.error });
      }

      await sleep(250); // respeita rate limit do Google (3 chamadas por negócio)
    } catch (e) {
      stats.errors.push({ business_id: biz.id, error: e.message || String(e) });
    }
  }

  stats.took_ms = Date.now() - t0;
  console.log("[cron/weekly-digest] concluído:", JSON.stringify({ ...stats, recipients: stats.recipients.length }));
  return res.status(200).json(stats);
}
