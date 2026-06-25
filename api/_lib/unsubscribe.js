// ============================================================
// StarTouch — Token de descadastro (opt-out de 1 clique)
// ============================================================
// Gera/valida um token HMAC por user_id pro link "Descadastrar" do
// email semanal. Sem expiração (o link no email precisa funcionar sempre).
// Segredo: reusa CRON_SECRET (ou a service key) — não precisa de env novo.
// ============================================================
import crypto from "crypto";

const SECRET =
  process.env.UNSUB_SECRET ||
  process.env.CRON_SECRET ||
  process.env.SUPABASE_SERVICE_KEY ||
  "startouch-unsub-fallback";

const BASE = process.env.PUBLIC_BASE_URL || "https://startouch.com.br";

export function unsubToken(userId) {
  return crypto.createHmac("sha256", SECRET).update(String(userId)).digest("hex").slice(0, 24);
}

export function verifyUnsubToken(userId, token) {
  if (!userId || !token) return false;
  const expected = unsubToken(userId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(token)));
  } catch {
    return false;
  }
}

export function unsubUrl(userId) {
  return `${BASE}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubToken(userId)}`;
}
