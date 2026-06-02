// ============================================================
// StarTouch — Redirect UNIVERSAL de placa (/r/:code → /api/r/:code)
// Coração do FLUXO ÚNICO: decide o destino SÓ pelo status da placa.
// NÃO liga pro source (site/ML/parceiro) — tratamento idêntico.
// Endpoint público (qualquer um que toca a placa cai aqui).
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { sendInBackground } from "../_lib/email-sender.js";
import { firstReviewEmail } from "../_lib/email-templates.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const raw = req.query.code || "";
  const code = String(raw).trim().toUpperCase();

  if (!code) return res.redirect(302, "/ativar-codigo?error=invalida");

  try {
    const { data: plate, error } = await supabase
      .from("plates")
      .select("id, code, status, business_id, total_taps, channel_name")
      .eq("code", code)
      .maybeSingle();

    // 1. Placa não existe
    if (error || !plate) {
      return res.redirect(302, "/ativar-codigo?error=invalida");
    }

    // 2. Placa desabilitada
    if (plate.status === "disabled") {
      return res.redirect(302, "/ativar-codigo?error=desabilitada");
    }

    // 3. Placa ainda não ativa (in_stock / assigned / sent) → onboarding
    if (plate.status !== "active") {
      return res.redirect(302, `/ativar-codigo?code=${encodeURIComponent(plate.code)}`);
    }

    // 4. Placa ativa → captura review. Resolve place_id do negócio vinculado.
    let placeId = null;
    if (plate.business_id) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("place_id")
        .eq("id", plate.business_id)
        .maybeSingle();
      placeId = biz?.place_id || null;
    }

    // Sem place_id resolvido (edge case) → manda pra reativar
    if (!placeId) {
      return res.redirect(302, `/ativar-codigo?code=${encodeURIComponent(plate.code)}`);
    }

    // Incrementa contador de taps (await rápido pra garantir gravação)
    const wasFirstTap = (plate.total_taps || 0) === 0;
    try {
      await supabase
        .from("plates")
        .update({ total_taps: (plate.total_taps || 0) + 1, last_tapped_at: new Date().toISOString() })
        .eq("id", plate.id);
    } catch (e) {
      console.error("[r/code] falha ao incrementar taps:", e);
    }

    // Se é a PRIMEIRA avaliação capturada por esse user (em qualquer dispositivo),
    // envia email celebratório. Idempotência via email_log garante 1x só.
    if (wasFirstTap) {
      try {
        const { data: biz } = await supabase
          .from("businesses")
          .select("user_id, name")
          .eq("id", plate.business_id)
          .maybeSingle();
        if (biz?.user_id) {
          const { data: { user: ownerUser } } = await supabase.auth.admin.getUserById(biz.user_id);
          if (ownerUser?.email) {
            const ownerMeta = ownerUser.user_metadata || {};
            const userName = ownerMeta.name || ownerMeta.full_name || ownerUser.email.split("@")[0] || "";
            const tmpl = firstReviewEmail({
              userName,
              bizName: biz.name,
              channelName: plate.channel_name
            });
            sendInBackground({
              userId: biz.user_id,
              emailType: "first_review",
              to: ownerUser.email,
              subject: tmpl.subject,
              html: tmpl.html,
              metadata: { plate_id: plate.id, code: plate.code }
            });
          }
        }
      } catch (e) {
        console.error("[r/code] erro no email de primeira avaliação:", e);
      }
    }

    return res.redirect(302, `/avaliar?place_id=${encodeURIComponent(placeId)}&plate=${encodeURIComponent(plate.code)}`);
  } catch (err) {
    console.error("[r/code] erro:", err);
    return res.redirect(302, "/ativar-codigo?error=invalida");
  }
}
