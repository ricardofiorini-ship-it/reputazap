// ============================================================
// StarTouch — Cron: DICA DA SEMANA (email educativo dedicado)
// ============================================================
// Schedule: Vercel Cron — quinta-feira 12:00 UTC (~09:00 BRT) (vercel.json).
// Separado do resumo semanal (segunda) de propósito: dia diferente, tema
// diferente. NÃO busca dados do Google — só escolhe a dica da semana e manda.
//
// Um email por USUÁRIO (não por negócio) — quem tem 2 lojas não recebe 2x.
// Respeita DOIS interruptores: email_enabled (global, off = nada) e
// tips_enabled (só a dica). Descadastrar da dica não derruba o resumo.
// Dedupe por semana (email_log) — re-rodar não duplica.
//
// Auth: Bearer ${CRON_SECRET} OU header x-vercel-cron. Chamada manual permitida.
// Params de teste: ?dry=1 (não envia, só lista) · ?limit=N (cap) ·
//   ?to=email (manda pra esse email, ignora destinatário real — debug).
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "../_lib/email-sender.js";
import { weeklyTipEmail, pickEduTip } from "../_lib/email-templates.js";
import { unsubUrl } from "../_lib/unsubscribe.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CRON_SECRET = process.env.CRON_SECRET;

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

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Não autorizado. Use Bearer ${CRON_SECRET}." });
  }

  const dry = req.query.dry === "1" || req.query.dry === "true";
  const forceTo = (req.query.to || "").trim() || null;
  const limit = parseInt(req.query.limit, 10);
  const week = weekKey();
  const tip = pickEduTip();

  const stats = {
    week, dry, tip: tip.t, started_at: new Date().toISOString(),
    users: 0, sent: 0, skipped_disabled: 0, skipped_tips_off: 0,
    skipped_dedupe: 0, skipped_no_email: 0, errors: [], recipients: [], took_ms: 0
  };
  const t0 = Date.now();

  // Usuários donos de ao menos um negócio (dica não é por negócio → por user).
  const { data: businesses, error: bizErr } = await supabase
    .from("businesses")
    .select("user_id");
  if (bizErr) return res.status(500).json({ error: bizErr.message });

  const userIds = [...new Set((businesses || []).map((b) => b.user_id).filter(Boolean))];

  // Emails dos donos + preferências
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
    stats.users++;
    try {
      const prefs = prefsById.get(userId);
      // Global off = não manda nada. Dica off = pula só a dica.
      if (prefs && prefs.email_enabled === false) { stats.skipped_disabled++; continue; }
      if (prefs && prefs.tips_enabled === false) { stats.skipped_tips_off++; continue; }

      const to = forceTo || (prefs?.email_to || "").trim() || emailById.get(userId);
      if (!to) { stats.skipped_no_email++; continue; }

      const unsub = unsubUrl(userId, "tips");
      const tmpl = weeklyTipEmail({ tip, unsubUrl: unsub });

      if (dry) {
        stats.recipients.push({ to, tip: tip.t });
      } else {
        const r = await sendTransactionalEmail({
          userId,
          emailType: "weekly_tip",
          to,
          subject: tmpl.subject,
          html: tmpl.html,
          metadata: { week, tip: tip.t },
          dedupeByMetadata: { key: "week", value: week },
          headers: {
            "List-Unsubscribe": `<${unsub}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        if (r?.sent) { stats.sent++; stats.recipients.push({ to }); }
        else if (r?.skipped) stats.skipped_dedupe++;
        else if (r?.error) stats.errors.push({ user_id: userId, error: r.error });
      }
    } catch (e) {
      stats.errors.push({ user_id: userId, error: e.message || String(e) });
    }
  }

  stats.took_ms = Date.now() - t0;
  console.log("[cron/weekly-tips] concluído:", JSON.stringify({ ...stats, recipients: stats.recipients.length }));
  return res.status(200).json(stats);
}
