// ============================================================
// StarTouch — Cron: RESUMO SEMANAL (digest) pra TODOS os clientes
// ============================================================
// Schedule: Vercel Cron — segunda-feira 12:00 UTC (~09:00 BRT) (vercel.json).
//
// Itera todos os businesses com place_id e manda o resumo semanal
// (nota, veredito, Score, marco, últimas avaliações, artigo, indicação).
// Score COMPLETO e IGUAL ao painel de verdade: a conta vem de score-core.js
// (compartilhada com src/AppV2.jsx) e a posição sai do cache da grade — nunca
// de medição nova, pra o envio semanal não virar uma conta de Places.
// Manda TAMBÉM o alerta de avaliação negativa, com as avaliações que já busca
// aqui (o cron diário que fazia isso saiu do ar em 02/ago).
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
  weeklyDigestEmail, pickWeeklyTip, emailScore, nextMilestone, latestArticle,
  // O alerta de nota baixa agora sai daqui (ver nota no loop) — o cron diário morreu.
  negativeReviewEmail
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

// Nota <= isto conta como avaliação negativa (mesmo corte do robô diário antigo).
const NEG_MAX = 2;
// Quantas avaliações o Google devolve por negócio. É o teto que cria o risco de
// medir semanalmente: chegando mais que isso na semana, as mais antigas somem da
// lista antes de a gente olhar.
const LISTA_CHEIA = 5;

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
    businesses: 0, sent: 0, alerts_sent: 0, lista_cheia: 0, skipped_disabled: 0, skipped_dedupe: 0,
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

      // Dados reais (mesmas fontes do painel).
      //
      // A POSIÇÃO saiu do `/api/diagnostico` (02/ago). Aquela é a arena antiga —
      // um raio só, ordem crua do Google — que o painel parou de usar por se
      // contradizer com a tela. Era a causa de o email dizer Score 59 enquanto o
      // painel mostrava 74 pro mesmo negócio.
      //
      // Agora lê a GRADE, mas SÓ DO CACHE, nunca disparando medição nova: um
      // `?grid=1` aqui custaria 5 consultas por negócio por semana (55 negócios
      // = ~R$48 por envio) e jogaria fora justamente a economia que esta
      // mudança busca. Sem cache fresco → o email simplesmente não fala de
      // posição, em vez de inventar um número.
      const pid = encodeURIComponent(biz.place_id);
      const [rv, bi, gridRow] = await Promise.all([
        fetchJson(`${ORIGIN}/api/reviews?place_id=${pid}`),
        fetchJson(`${ORIGIN}/api/bizinfo?place_id=${pid}`),
        supabase.from("ranking_grid_cache")
          .select("result, created_at")
          .eq("place_id", biz.place_id)
          .order("created_at", { ascending: false })
          .limit(1).maybeSingle()
          .then((r) => {
            if (r.error) { console.warn(`[weekly-digest] cache da grade indisponível: ${r.error.message}`); return null; }
            if (!r.data) return null;
            // Mais velho que 7 dias é medição vencida — trata como "não sei".
            if (Date.now() - new Date(r.data.created_at).getTime() > 7 * 24 * 3600 * 1000) return null;
            return r.data.result || null;
          })
          .catch(() => null),
      ]);
      const gridAvg = (gridRow && gridRow.coverage > 0 && gridRow.avg != null) ? gridRow.avg : null;
      const gridSemCobertura = !!(gridRow && gridRow.measured > 0 && gridRow.coverage === 0);
      if (!rv || (!rv.name && !rv.rating)) {
        stats.errors.push({ business_id: biz.id, error: "sem dados do Google" });
        continue;
      }

      const reviews = Array.isArray(rv.reviews) ? rv.reviews : [];
      const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
      const newThisWeek = reviews.filter((r) => Number(r.id) >= weekAgo).length;
      const totalReviews = rv.total ?? bi.total ?? 0;

      // ── ALERTA DE AVALIAÇÃO NEGATIVA (02/ago) ────────────────────────
      // Antes um cron separado rodava TODO DIA e pedia ao Google as avaliações
      // de cada negócio — exatamente as mesmas que este resumo já busca aqui em
      // cima. Duas consultas pagas pelo mesmo dado. Agora o alerta pega carona:
      // custo marginal ZERO, e o robô diário sai do ar (R$206 → ~R$30/mês).
      //
      // Preço da mudança: o aviso passa a chegar em até 7 dias em vez de 24h.
      // Foi decisão do dono (02/ago) — o serviço é grátis e nunca prometemos
      // aviso imediato. O aviso no mesmo dia fica como diferencial do Pro.
      //
      // Destinatário é o MESMO `to` do resumo: as duas coisas já eram gateadas
      // pela mesma preferência (`alert_preferences.email_enabled`), então juntar
      // não muda quem recebe o quê.
      //
      // A idempotência é por `review_id` no email_log e o emailType continua
      // "negative_review" — de propósito: assim as avaliações que o robô antigo
      // já avisou NÃO são avisadas de novo na primeira rodada deste.
      const negativas = reviews.filter((r) => (r.rating || 0) <= NEG_MAX && Number(r.id) >= weekAgo);
      if (negativas.length >= LISTA_CHEIA && newThisWeek >= LISTA_CHEIA) {
        // O Google só devolve ~5 avaliações. Se TODAS as 5 são da semana, a
        // lista encheu e pode ter sobrado avaliação de fora dela — inclusive
        // negativa. Não dá pra saber, então avisa alto em vez de fingir que viu
        // tudo. É o risco real de medir semanalmente em vez de diariamente.
        console.warn(
          `[weekly-digest] LISTA CHEIA em "${rv.name}" (${biz.place_id}): ` +
          `${newThisWeek} avaliações novas e o Google só mostra ${LISTA_CHEIA}. ` +
          `Pode ter negativa que não vimos — este negócio precisa de medição mais frequente.`
        );
        stats.lista_cheia = (stats.lista_cheia || 0) + 1;
      }
      for (const neg of negativas) {
        const t = negativeReviewEmail({
          bizName: rv.name, author: neg.author, rating: neg.rating,
          text: neg.text, placeId: biz.place_id,
        });
        if (dry) { stats.alerts_sent++; continue; }
        const ra = await sendTransactionalEmail({
          userId: biz.user_id,
          emailType: "negative_review",
          to,
          subject: t.subject,
          html: t.html,
          metadata: { review_id: String(neg.id), place_id: biz.place_id, rating: neg.rating },
          dedupeByMetadata: { key: "review_id", value: String(neg.id) },
        });
        if (ra?.sent) stats.alerts_sent++;
      }
      const score = emailScore({
        rating: rv.rating ?? bi.rating, reviews: totalReviews,
        gridAvg, gridSemCobertura,
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
