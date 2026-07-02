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

// ── UTMs de placa ───────────────────────────────────────────
// Toda batida de placa deve chegar na página de destino (/avaliar, /ativar-codigo,
// onde vive o GA4/gtag) com atribuição de origem. Duas realidades convivem:
//   • Placas NOVAS: a gráfica grava a URL já com ?utm_source=placa&utm_medium=nfc|qr
//     (ver CSV em admin-producao.html). O medium (nfc vs qr) fica embutido no chip/QR.
//   • Placas ANTIGAS: foram gravadas como /r/CODE, SEM parâmetros.
// Solução única no servidor: repassa os UTMs que vierem na URL e, se não vier
// NENHUM (placa antiga), aplica o padrão. Não muda o chip físico já gravado.
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

function buildPlateUtm(query) {
  const parts = [];
  for (const k of UTM_KEYS) {
    const v = query[k];
    if (v != null && String(v) !== "") parts.push(`${k}=${encodeURIComponent(String(v))}`);
  }
  // Sem nenhum UTM na URL = placa antiga → padrão de placa (assume NFC, o toque é o caso comum).
  if (parts.length === 0) parts.push("utm_source=placa", "utm_medium=nfc");
  return parts.join("&");
}

// Anexa os UTMs ao destino respeitando se ele já tem query string.
function withUtm(dest, utm) {
  if (!utm) return dest;
  return dest + (dest.includes("?") ? "&" : "?") + utm;
}

// Tenta uma consulta ao Supabase até `tries` vezes antes de desistir.
// Crucial pro fluxo de placa: uma falha transitória de banco NÃO pode ser
// confundida com "placa não existe" — senão uma placa ativa, no balcão do
// cliente, seria jogada pra reativação por causa de um soluço de rede.
async function queryWithRetry(buildQuery, tries = 3) {
  let last = { data: null, error: null };
  for (let i = 0; i < tries; i++) {
    last = await buildQuery();
    if (!last.error) return last;
    console.error(`[r/code] tentativa ${i + 1}/${tries} falhou:`, last.error?.message || last.error);
    if (i < tries - 1) await new Promise((r) => setTimeout(r, 150 * (i + 1)));
  }
  return last;
}

export default async function handler(req, res) {
  // NUNCA cachear: o destino da placa muda com o status (estoque→ativa).
  // Sem isso, o celular memoriza o redirect antigo (ex: tocou antes de ativar
  // → guardou "vai pra /ativar-codigo") e fica preso nele mesmo após ativação.
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const raw = req.query.code || "";
  const code = String(raw).trim().toUpperCase();

  // Modo consulta: responde o status em JSON, sem redirect e SEM contar toque.
  // Usado pela tela /ativar-codigo pra resgatar dispositivos cujo NFC foi
  // gravado com a URL errada (/ativar-codigo?code= em vez de /r/): um chip de
  // placa ATIVA cairia na ativação e deveria ir pro Google. A tela consulta
  // aqui e, se reviewReady, reencaminha pro /r/CODE (fluxo de avaliação).
  const checkOnly = req.query.check === "1";

  // UTMs a repassar ao destino (padrão de placa se a URL veio sem parâmetros).
  const utm = buildPlateUtm(req.query);

  if (!code) {
    if (checkOnly) return res.status(200).json({ ok: true, status: "not_found", reviewReady: false });
    return res.redirect(302, withUtm("/ativar-codigo?error=invalida", utm));
  }

  try {
    const { data: plate, error } = await queryWithRetry(() =>
      supabase
        .from("plates")
        .select("id, code, status, business_id, total_taps, channel_name")
        .eq("code", code)
        .maybeSingle()
    );

    // Modo consulta: resolve status (+ se está pronta pra avaliação) e retorna JSON.
    if (checkOnly) {
      if (error) return res.status(200).json({ ok: false, transient: true });
      if (!plate) return res.status(200).json({ ok: true, status: "not_found", reviewReady: false });
      let reviewReady = false;
      if (plate.status === "active" && plate.business_id) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("place_id")
          .eq("id", plate.business_id)
          .maybeSingle();
        reviewReady = !!(biz?.place_id);
      }
      return res.status(200).json({ ok: true, status: plate.status, reviewReady });
    }

    // 1a. Erro de infra (banco fora / timeout) APÓS retries → NÃO é "inválido".
    // A placa pode estar ativa; mandar pra reativar/erro seria mentira. Pede
    // pro cliente tocar de novo em vez de descartar uma placa boa.
    if (error) {
      console.error("[r/code] busca de placa falhou após retries:", error.message || error);
      return res.redirect(302, withUtm(`/ativar-codigo?error=instavel&code=${encodeURIComponent(code)}`, utm));
    }

    // 1b. Banco respondeu, mas placa realmente não existe (0 linhas)
    if (!plate) {
      return res.redirect(302, withUtm("/ativar-codigo?error=invalida", utm));
    }

    // 2. Placa desabilitada
    if (plate.status === "disabled") {
      return res.redirect(302, withUtm("/ativar-codigo?error=desabilitada", utm));
    }

    // 3. Placa ainda não ativa (in_stock / assigned / sent) → onboarding
    if (plate.status !== "active") {
      return res.redirect(302, withUtm(`/ativar-codigo?code=${encodeURIComponent(plate.code)}`, utm));
    }

    // 4. Placa ativa → captura review. Resolve place_id do negócio vinculado.
    let placeId = null;
    if (plate.business_id) {
      const { data: biz, error: bizErr } = await queryWithRetry(() =>
        supabase
          .from("businesses")
          .select("place_id")
          .eq("id", plate.business_id)
          .maybeSingle()
      );
      // Falha de banco ao resolver o negócio → instável, não "reativar".
      // A placa está ativa; o negócio existe; foi só o banco que tropeçou.
      if (bizErr) {
        console.error("[r/code] busca de negócio falhou após retries:", bizErr.message || bizErr);
        return res.redirect(302, withUtm(`/ativar-codigo?error=instavel&code=${encodeURIComponent(plate.code)}`, utm));
      }
      placeId = biz?.place_id || null;
    }

    // Sem place_id resolvido de verdade (negócio sem place_id) → manda pra reativar
    if (!placeId) {
      return res.redirect(302, withUtm(`/ativar-codigo?code=${encodeURIComponent(plate.code)}`, utm));
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
            // Aguarda antes do redirect — serverless corta promises órfãs
            await sendInBackground({
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

    return res.redirect(302, withUtm(`/avaliar?place_id=${encodeURIComponent(placeId)}&plate=${encodeURIComponent(plate.code)}`, utm));
  } catch (err) {
    // Exceção inesperada = problema nosso, não código inválido do cliente.
    console.error("[r/code] erro:", err);
    return res.redirect(302, withUtm(`/ativar-codigo?error=instavel&code=${encodeURIComponent(code)}`, utm));
  }
}
