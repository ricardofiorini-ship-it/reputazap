// ============================================================
// StarTouch — Disparo de aviso pontual pra base (broadcast)
// ============================================================
// Um email de novidade pra todos os clientes. NÃO é agendado: não entra
// em `vercel.json`. Só roda quando alguém chama de propósito, com segredo.
//
// Auth: Bearer ${CRON_SECRET} (aceita x-vercel-cron por consistência com os
// outros, embora não haja agendamento).
//
// Uso, na ordem de segurança:
//   ?campaign=<slug>&dry=1            → conta destinatários, não envia nada
//   ?campaign=<slug>&to=voce@email    → manda só pra esse endereço (teste)
//   ?campaign=<slug>&confirm=1        → DISPARA DE VERDADE pra base inteira
//
// `confirm=1` é obrigatório no envio real: um GET distraído (ou um retry de
// algum monitor) não pode virar email na caixa de 300 clientes. Sem ele,
// responde o ensaio a seco.
//
// Idempotência: `dedupeByMetadata { campaign }` no email_log — chamar duas
// vezes a mesma campanha não manda em dobro. É a proteção que importa aqui,
// porque email enviado não volta.
//
// Um email por USUÁRIO (não por negócio: quem tem duas lojas recebe um só).
// Respeita `alert_preferences.email_enabled = false` e leva descadastro
// de 1 clique no rodapé e nos cabeçalhos (List-Unsubscribe).
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "../_lib/email-sender.js";
import { tapsHistoryNewsEmail } from "../_lib/email-templates.js";
import { unsubUrl } from "../_lib/unsubscribe.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CRON_SECRET = process.env.CRON_SECRET;

// Catálogo de campanhas. Manter aqui (e não em querystring livre) evita que
// um slug digitado errado fure o dedupe e reenvie pra base inteira.
const CAMPAIGNS = {
  "toques-por-data": {
    label: "Novidade: histórico de toques por data",
    build: ({ userName, unsub }) => tapsHistoryNewsEmail({ userName, unsubUrl: unsub }),
  },
};

function checkAuth(req) {
  if (req.headers["x-vercel-cron"] === "1") return true;
  if (!CRON_SECRET) return false;
  return (req.headers.authorization || "") === `Bearer ${CRON_SECRET}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function firstName(user) {
  const m = user?.user_metadata || {};
  return m.name || m.full_name || (user?.email ? user.email.split("@")[0] : "");
}

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Não autorizado. Use Bearer ${CRON_SECRET}." });
  }

  const slug = String(req.query.campaign || "").trim();
  const campaign = CAMPAIGNS[slug];
  if (!campaign) {
    return res.status(400).json({ error: "campaign inválida", disponiveis: Object.keys(CAMPAIGNS) });
  }

  const forceTo = (req.query.to || "").trim() || null;
  const confirm = req.query.confirm === "1";
  const limit = parseInt(req.query.limit, 10);
  // Só envia de verdade com confirm=1. Teste pra um endereço só dispensa,
  // porque não atinge cliente nenhum.
  const dry = !forceTo && !confirm;

  const t0 = Date.now();
  const s = {
    campaign: slug, label: campaign.label,
    mode: forceTo ? "teste (?to=)" : dry ? "ensaio a seco (falta confirm=1)" : "DISPARO REAL",
    users: 0, sent: 0, skipped_disabled: 0, skipped_dedupe: 0, skipped_no_email: 0,
    recipients: [], errors: [],
  };

  const { data: businesses, error: bizErr } = await supabase.from("businesses").select("user_id");
  if (bizErr) return res.status(500).json({ ...s, error: bizErr.message });
  const userIds = [...new Set((businesses || []).map((b) => b.user_id).filter(Boolean))];

  // perPage 1000: hoje a base cabe folgado. Se um dia passar disso, aqui
  // precisa paginar — e o número de `users` abaixo denuncia o teto.
  const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const userById = new Map((usersList?.users || []).map((u) => [u.id, u]));
  const { data: prefsRows } = await supabase
    .from("alert_preferences")
    .select("user_id, email_enabled, email_to")
    .in("user_id", userIds);
  const prefsById = new Map((prefsRows || []).map((p) => [p.user_id, p]));

  let list = userIds;
  if (Number.isFinite(limit) && limit > 0) list = list.slice(0, limit);

  for (const userId of list) {
    s.users++;
    try {
      const prefs = prefsById.get(userId);
      if (prefs && prefs.email_enabled === false) { s.skipped_disabled++; continue; }
      const user = userById.get(userId);
      const to = forceTo || (prefs?.email_to || "").trim() || user?.email;
      if (!to) { s.skipped_no_email++; continue; }

      const unsub = unsubUrl(userId);
      const tmpl = campaign.build({ userName: firstName(user), unsub });

      if (dry) { s.recipients.push({ to }); continue; }

      const r = await sendTransactionalEmail({
        userId, emailType: "broadcast", to,
        subject: tmpl.subject, html: tmpl.html,
        metadata: { campaign: slug },
        // Teste pra um endereço não pode gravar dedupe da campanha: senão o
        // disparo real depois pularia esse usuário achando que já mandou.
        dedupeByMetadata: forceTo ? undefined : { key: "campaign", value: slug },
        headers: {
          "List-Unsubscribe": `<${unsub}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      if (r?.sent) { s.sent++; s.recipients.push({ to }); }
      else if (r?.skipped) s.skipped_dedupe++;
      else if (r?.error) s.errors.push({ user_id: userId, error: r.error });

      // Resend tem limite por segundo; o digest usa a mesma folga.
      if (!forceTo) await sleep(250);
    } catch (e) {
      s.errors.push({ user_id: userId, error: e.message || String(e) });
    }
    if (forceTo) break;   // teste manda uma vez só
  }

  s.took_ms = Date.now() - t0;
  console.log("[cron/broadcast] concluído:", JSON.stringify({ ...s, recipients: s.recipients.length }));
  return res.status(200).json(s);
}
