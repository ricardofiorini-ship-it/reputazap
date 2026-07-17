// ============================================================
// StarTouch — Aprovar a dica (botão da prévia do admin)
// ============================================================
// GET público protegido por token HMAC: ?p=<periodo>&t=<token>.
// Marca tip_approvals.approved_at → o cron dispara pros clientes na data
// de envio (9h). Não dispara aqui (o cron cuida disso no horário certo).
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { verifyApproveToken } from "./_lib/unsubscribe.js";
import { TIPS, sendDateOf } from "./_lib/tips-content.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function page(title, msg, tone = "ok") {
  const emoji = tone === "ok" ? "✅" : tone === "info" ? "📨" : "⚠️";
  const color = tone === "bad" ? "#A50E0E" : "#137333";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)} · StarTouch</title>
<style>body{font-family:Arial,Helvetica,sans-serif;background:#F8F9FA;color:#202124;margin:0;display:grid;place-items:center;min-height:100vh;padding:24px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;max-width:460px;text-align:center;box-shadow:0 6px 24px -8px rgba(15,23,42,.1)}
h1{font-size:20px;margin:0 0 8px;color:${color}}p{font-size:14.5px;color:#5F6368;line-height:1.6;margin:0 0 8px}
a{color:#1A73E8;text-decoration:none;font-weight:600}</style></head>
<body><div class="card"><div style="font-size:44px;margin-bottom:8px">${emoji}</div>
<h1>${esc(title)}</h1><p>${msg}</p>
<p style="margin-top:16px"><a href="https://startouch.com.br/app?login=1">Ir pro painel</a></p></div></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  const p = (req.query.p || "").trim();
  const t = (req.query.t || "").trim();
  if (!p || !t || !verifyApproveToken(p, t)) {
    return res.status(400).send(page("Link inválido", "Este link de aprovação não é válido ou expirou.", "bad"));
  }

  const idx = parseInt(String(p).replace(/^p/, ""), 10);
  const tip = Number.isFinite(idx) ? TIPS[idx % TIPS.length] : null;
  const when = Number.isFinite(idx) ? sendDateOf(idx).split("-").reverse().join("/") : "no próximo horário";

  try {
    const { data: existing } = await supabase
      .from("tip_approvals").select("period, approved_at, dispatched_at").eq("period", p).maybeSingle();

    if (existing?.dispatched_at) {
      return res.status(200).send(page("Já foi enviada", `A dica "<strong>${esc(tip?.headline || "")}</strong>" já foi disparada pros clientes.`, "info"));
    }
    if (existing?.approved_at) {
      return res.status(200).send(page("Já estava aprovada", `Tudo certo — a dica "<strong>${esc(tip?.headline || "")}</strong>" já estava aprovada e vai sair em <strong>${when}</strong>, às 9h.`, "ok"));
    }

    if (existing) {
      await supabase.from("tip_approvals").update({ approved_at: new Date().toISOString() }).eq("period", p);
    } else {
      await supabase.from("tip_approvals").insert({ period: p, headline: tip?.headline || null, approved_at: new Date().toISOString() });
    }

    return res.status(200).send(page(
      "Aprovada!",
      `A dica "<strong>${esc(tip?.headline || "")}</strong>" vai ser enviada pros clientes em <strong>${when}</strong>, às 9h. Quer mudar algo ou cancelar? É só me avisar no chat.`,
      "ok"
    ));
  } catch (e) {
    console.error("[tips-approve] erro:", e);
    return res.status(500).send(page("Deu um erro", "Não consegui registrar a aprovação agora. Tenta de novo em instantes.", "bad"));
  }
}
