// ============================================================
// StarTouch — Gatilho 3 (funil-impacto): email do plano de trabalho
// ============================================================
// Quando um diagnóstico é gerado (POST /api/radar) pra um place_id que é de um
// negócio CADASTRADO, manda o email "seu plano de trabalho está pronto" pro dono
// — com cópia oculta (BCC) pro admin revisar a copy. Best-effort e idempotente
// por place_id (1 email por negócio). place_id de convidado/não-cadastrado é
// ignorado (não manda, e nem paga o custo da auditoria).
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { runAudit } from "../audit/index.js";
import { planoTrabalhoEmail } from "../email-templates.js";
import { sendTransactionalEmail } from "../email-sender.js";

let _sb = null;
function sb() {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _sb = createClient(url, key, { auth: { persistSession: false } });
  return _sb;
}

// Primeira pendência (✗) real do checklist, pro preview do email.
function firstFail(audit) {
  for (const g of (audit.groups || [])) {
    for (const it of (g.items || [])) {
      if (it.status === "fail") return { label: it.label, detail: it.detail };
    }
  }
  return null;
}

export async function maybeSendPlanoEmail({ placeId, code, site }) {
  if (!placeId || !code) return;
  const supabase = sb();
  if (!supabase) return;

  // 1. É de um negócio cadastrado? (senão não manda — convidado não tem conta)
  const { data: biz } = await supabase
    .from("businesses")
    .select("user_id, name")
    .eq("place_id", placeId)
    .maybeSingle();
  if (!biz?.user_id) return;

  // 2. Email do dono (via auth admin).
  const { data: userData, error: uErr } = await supabase.auth.admin.getUserById(biz.user_id);
  const email = userData?.user?.email;
  if (uErr || !email) return;

  // 3. Auditoria pras pendências (N + 1 item real pro preview).
  let pendencias = 0, checklistItem = null;
  try {
    const audit = await runAudit({ placeId, site });
    pendencias = audit.pendencias || 0;
    checklistItem = firstFail(audit);
  } catch (e) {
    console.warn("[plano-email] auditoria falhou:", e.message);
  }

  // Só manda se há de fato o que resolver. N=0 (negócio saudável) ou auditoria
  // que falhou (também 0) → não manda um email "(0 pendências)" sem sentido.
  if (pendencias < 1) return;

  // 4. Envia pro dono + BCC admin. Idempotente por place_id (1x por negócio).
  const tmpl = planoTrabalhoEmail({ empresa: biz.name, pendencias, code, checklistItem });
  await sendTransactionalEmail({
    userId: biz.user_id,
    emailType: "plano_trabalho",
    to: email,
    bcc: process.env.ADMIN_NOTIFICATIONS_EMAIL || undefined,
    subject: tmpl.subject,
    html: tmpl.html,
    dedupeByMetadata: { key: "place_id", value: placeId },
    metadata: { place_id: placeId, code },
  });
}
