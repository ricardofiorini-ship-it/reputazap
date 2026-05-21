// ============================================================
// StarTouch — Redirect UNIVERSAL de placa (/r/:code → /api/r/:code)
// Coração do FLUXO ÚNICO: decide o destino SÓ pelo status da placa.
// NÃO liga pro source (site/ML/parceiro) — tratamento idêntico.
// Endpoint público (qualquer um que toca a placa cai aqui).
// ============================================================
import { createClient } from "@supabase/supabase-js";

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
      .select("id, code, status, business_id, total_taps")
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
    try {
      await supabase
        .from("plates")
        .update({ total_taps: (plate.total_taps || 0) + 1, last_tapped_at: new Date().toISOString() })
        .eq("id", plate.id);
    } catch (e) {
      console.error("[r/code] falha ao incrementar taps:", e);
    }

    return res.redirect(302, `/avaliar?place_id=${encodeURIComponent(placeId)}&plate=${encodeURIComponent(plate.code)}`);
  } catch (err) {
    console.error("[r/code] erro:", err);
    return res.redirect(302, "/ativar-codigo?error=invalida");
  }
}
