// ============================================================
// StarTouch — Helper de envio de email com log e idempotência
// ============================================================
// Garante que cada email transacional só vai 1x por user (welcome,
// business_linked, first_device, first_review) — mesmo se a função
// for chamada 2x por race condition.
//
// Para tipos recorrentes (another_device), não checa idempotência.
// ============================================================

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const EMAIL_FROM = process.env.RESEND_FROM || "StarTouch <onboarding@resend.dev>";

// Tipos únicos (só 1 vez por user, idempotente)
const UNIQUE_TYPES = new Set([
  "welcome",
  "business_linked",
  "first_device",
  "first_review",
  "admin_new_client"  // 1 notificação admin por cliente novo
]);

/**
 * Envia email transacional + grava em email_log.
 * Não bloqueia o flow do caller — se Resend falhar ou a chave estiver
 * ausente, só loga warning e segue. Email não é crítico pro fluxo.
 *
 * @param {Object} opts
 * @param {string} opts.userId        - UUID do user
 * @param {string} opts.emailType     - 'welcome' | 'business_linked' | etc.
 * @param {string} opts.to            - email destino
 * @param {string} opts.subject       - assunto
 * @param {string} opts.html          - corpo HTML
 * @param {Object} [opts.metadata]    - dados extras pra log
 * @returns {Promise<Object>} { sent, skipped, error, resend_id }
 */
export async function sendTransactionalEmail({
  userId, emailType, to, subject, html, metadata = {},
  // dedupeByMetadata: se passado, faz idempotência por user_id + email_type + metadata[key]=value
  // (em vez de só user_id + email_type). Útil pra eventos por dispositivo (plate_id), etc.
  dedupeByMetadata,
  // headers: headers SMTP extras (ex: List-Unsubscribe pro digest semanal).
  headers
}) {
  if (!userId || !emailType || !to) {
    console.warn("[email-sender] params faltando:", { userId, emailType, to });
    return { skipped: true, reason: "params faltando" };
  }

  // Idempotência: por user+type por padrão, ou por user+type+metadata[key] se dedupeByMetadata
  if (UNIQUE_TYPES.has(emailType) || dedupeByMetadata) {
    let q = supabase
      .from("email_log")
      .select("id")
      .eq("user_id", userId)
      .eq("email_type", emailType);

    if (dedupeByMetadata && dedupeByMetadata.key && dedupeByMetadata.value != null) {
      q = q.eq(`metadata->>${dedupeByMetadata.key}`, String(dedupeByMetadata.value));
    }

    const { data: existing } = await q.limit(1).maybeSingle();
    if (existing) {
      const detail = dedupeByMetadata ? ` (${dedupeByMetadata.key}=${dedupeByMetadata.value})` : "";
      console.log(`[email-sender] ${emailType}${detail} ja enviado pro user ${userId} — pulando.`);
      return { skipped: true, reason: "already sent" };
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email-sender] RESEND_API_KEY ausente — pulando envio:", emailType);
    return { skipped: true, reason: "RESEND_API_KEY ausente" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html,
        ...(headers && Object.keys(headers).length ? { headers } : {})
      })
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("[email-sender] Resend erro:", data);
      return { error: data?.message || "Resend falhou" };
    }

    // Registra envio (não bloqueia se falhar)
    try {
      await supabase.from("email_log").insert({
        user_id: userId,
        email_type: emailType,
        to_email: to,
        resend_id: data.id || null,
        metadata: metadata || {}
      });
    } catch (logErr) {
      console.error("[email-sender] erro ao gravar log:", logErr);
      // Não rejeita — email já foi enviado
    }

    return { sent: true, resend_id: data.id };
  } catch (err) {
    console.error("[email-sender] erro inesperado:", err);
    return { error: err.message };
  }
}

/**
 * Versão "fire and forget" — chama em background, não trava o caller.
 * Use quando o email é desejável mas não crítico pro fluxo.
 */
export function sendInBackground(opts) {
  // Promise não-awaited — gracefully ignored em serverless graças ao
  // Vercel manter functions vivas até o response final. Pra garantir,
  // o caller pode aguardar opcionalmente.
  return sendTransactionalEmail(opts).catch((e) => {
    console.error("[email-sender:bg]", opts.emailType, e);
  });
}
