// ============================================================
// StarTouch — Cron: DICA com PORTÃO DE APROVAÇÃO + gatilho de artigo
// ============================================================
// Roda DIÁRIO (vercel.json). Duas fases por execução:
//
//  FASE A — PRÉVIA (1 dia antes do envio): manda a dica SÓ pro admin
//   (ADMIN_NOTIFICATIONS_EMAIL) com botão "Aprovar e disparar". Grava
//   tip_approvals.previewed_at (não reenvia).
//
//  FASE B — DISPARO (na data de envio): manda pra TODOS os clientes
//   SOMENTE se tip_approvals.approved_at estiver setado (Ricardo clicou)
//   e ainda não disparado. Ao disparar, marca dispatched_at e chama o
//   Deploy Hook → o site rebuilda e o artigo daquela dica nasce.
//   Sem aprovação = segura (nada vai pros clientes).
//
// Conteúdo vem da FONTE ÚNICA (api/_lib/tips-content.js).
// Um email por USUÁRIO. Respeita email_enabled + tips_enabled.
//
// Auth: Bearer ${CRON_SECRET} OU x-vercel-cron.
// Teste: ?dry=1 (não envia/grava) · ?to=email&limit=N (manda a dica atual
//   pra esse email, ignora o portão — debug do e-mail do cliente).
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { sendTransactionalEmail, sendRawEmail } from "../_lib/email-sender.js";
import { weeklyTipEmail, tipPreviewEmail } from "../_lib/email-templates.js";
import { unsubUrl, approveUrl } from "../_lib/unsubscribe.js";
import {
  TIPS, periodNumber, periodLabel, sendDateOf, previewDateOf,
  previewPeriodDueToday, todayStr, articleUrl,
} from "../_lib/tips-content.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CRON_SECRET = process.env.CRON_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATIONS_EMAIL;

function checkAuth(req) {
  if (req.headers["x-vercel-cron"] === "1") return true;
  if (!CRON_SECRET) return false;
  return (req.headers.authorization || "") === `Bearer ${CRON_SECRET}`;
}

// Manda a dica `tip` do período `period` pra todos os clientes elegíveis.
// forceTo (teste) manda tudo pra um endereço. Não seta dispatched (o caller faz).
async function dispatchToAll({ tip, period, artUrl, dry, forceTo, limit }) {
  const s = {
    users: 0, sent: 0, skipped_disabled: 0, skipped_tips_off: 0,
    skipped_dedupe: 0, skipped_no_email: 0, recipients: [], errors: []
  };

  const { data: businesses, error: bizErr } = await supabase.from("businesses").select("user_id");
  if (bizErr) { s.errors.push({ error: bizErr.message }); return s; }
  const userIds = [...new Set((businesses || []).map((b) => b.user_id).filter(Boolean))];

  const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map((usersList?.users || []).map((u) => [u.id, u.email]));
  const { data: prefsRows } = await supabase
    .from("alert_preferences")
    .select("user_id, email_enabled, tips_enabled, email_to")
    .in("user_id", userIds);
  const prefsById = new Map((prefsRows || []).map((p) => [p.user_id, p]));

  let list = userIds;
  if (Number.isFinite(limit) && limit > 0) list = list.slice(0, limit);

  for (const userId of list) {
    s.users++;
    try {
      const prefs = prefsById.get(userId);
      if (prefs && prefs.email_enabled === false) { s.skipped_disabled++; continue; }
      if (prefs && prefs.tips_enabled === false) { s.skipped_tips_off++; continue; }
      const to = forceTo || (prefs?.email_to || "").trim() || emailById.get(userId);
      if (!to) { s.skipped_no_email++; continue; }

      const unsub = unsubUrl(userId, "tips");
      const tmpl = weeklyTipEmail({ tip, unsubUrl: unsub, articleUrl: artUrl });
      if (dry) { s.recipients.push({ to }); continue; }

      const r = await sendTransactionalEmail({
        userId, emailType: "weekly_tip", to,
        subject: tmpl.subject, html: tmpl.html,
        metadata: { period, tip: tip.headline },
        dedupeByMetadata: { key: "period", value: period },
        headers: {
          "List-Unsubscribe": `<${unsub}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      if (r?.sent) { s.sent++; s.recipients.push({ to }); }
      else if (r?.skipped) s.skipped_dedupe++;
      else if (r?.error) s.errors.push({ user_id: userId, error: r.error });
    } catch (e) {
      s.errors.push({ user_id: userId, error: e.message || String(e) });
    }
  }
  return s;
}

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Não autorizado. Use Bearer ${CRON_SECRET}." });
  }

  const dry = req.query.dry === "1" || req.query.dry === "true";
  const forceTo = (req.query.to || "").trim() || null;
  const limit = parseInt(req.query.limit, 10);
  const now = Date.now();
  const today = todayStr(now);
  const N = TIPS.length;
  const curP = periodNumber(now);
  const curKey = periodLabel(curP);
  const curTip = TIPS[curP % N];

  const stats = { today, current_period: curKey, current_tip: curTip.headline, dry, took_ms: 0 };
  const t0 = Date.now();

  // ── MODO TESTE (?to=): manda a dica atual pro endereço, ignora o portão ──
  if (forceTo) {
    stats.mode = "teste ?to=";
    stats.dispatch = await dispatchToAll({ tip: curTip, period: curKey, artUrl: articleUrl(curTip), dry, forceTo, limit });
    stats.took_ms = Date.now() - t0;
    return res.status(200).json(stats);
  }

  // ── FASE A — PRÉVIA (1 dia antes) ──
  const previewP = previewPeriodDueToday(now);
  if (previewP == null) {
    stats.preview = "nenhuma prévia vence hoje";
  } else if (!ADMIN_EMAIL) {
    stats.preview = "sem ADMIN_NOTIFICATIONS_EMAIL";
  } else {
    const pKey = periodLabel(previewP);
    const pTip = TIPS[previewP % N];
    const { data: row } = await supabase.from("tip_approvals").select("previewed_at").eq("period", pKey).maybeSingle();
    if (row?.previewed_at) {
      stats.preview = { period: pKey, status: "prévia já enviada" };
    } else {
      const tmpl = tipPreviewEmail({
        tip: pTip, approveUrl: approveUrl(pKey),
        articleUrl: articleUrl(pTip), sendDate: sendDateOf(previewP),
      });
      const r = dry ? { dry: true } : await sendRawEmail({ to: ADMIN_EMAIL, subject: tmpl.subject, html: tmpl.html });
      if (!dry && r.sent) {
        await supabase.from("tip_approvals").upsert(
          { period: pKey, headline: pTip.headline, previewed_at: new Date().toISOString() },
          { onConflict: "period" }
        );
      }
      stats.preview = { period: pKey, to: ADMIN_EMAIL, tip: pTip.headline, ...r };
    }
  }

  // ── FASE B — DISPARO (só se aprovado) ──
  if (today < sendDateOf(curP)) {
    stats.dispatch = { period: curKey, status: "antes da data de envio" };
  } else {
    const { data: appr } = await supabase.from("tip_approvals")
      .select("approved_at, dispatched_at").eq("period", curKey).maybeSingle();
    if (appr?.dispatched_at) {
      stats.dispatch = { period: curKey, status: "já disparada" };
    } else if (!appr?.approved_at) {
      stats.dispatch = { period: curKey, status: "aguardando aprovação" };
    } else {
      const dr = await dispatchToAll({ tip: curTip, period: curKey, artUrl: articleUrl(curTip), dry, limit });
      stats.dispatch = { period: curKey, status: dry ? "dry" : "disparada", ...dr, deploy_hook: "skipped" };
      if (!dry && dr.sent > 0) {
        await supabase.from("tip_approvals").update({ dispatched_at: new Date().toISOString() }).eq("period", curKey);
        const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
        if (hook) {
          try {
            const hr = await fetch(hook, { method: "POST" });
            stats.dispatch.deploy_hook = hr.ok ? "triggered" : `falhou (${hr.status})`;
          } catch (e) { stats.dispatch.deploy_hook = "erro: " + (e.message || String(e)); }
        } else {
          stats.dispatch.deploy_hook = "sem VERCEL_DEPLOY_HOOK_URL";
        }
      }
    }
  }

  stats.took_ms = Date.now() - t0;
  console.log("[cron/weekly-tips] concluído:", JSON.stringify(stats));
  return res.status(200).json(stats);
}
