// ============================================================
// StarTouch — Descadastro de 1 clique (opt-out do email semanal)
// ============================================================
// Público (sem login). Link no rodapé do digest: ?u=<user_id>&t=<token>.
// - GET  : clique do usuário → desativa e mostra página de confirmação.
// - POST : one-click do Gmail (List-Unsubscribe-Post) → desativa, responde 200.
// Token HMAC valida que o link é legítimo (não dá pra descadastrar terceiros).
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { verifyUnsubToken } from "./_lib/unsubscribe.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// kind="tips" desliga SÓ a dica da semana (tips_enabled). Qualquer outro
// valor (ou ausência) mantém o comportamento antigo: desliga todos os
// emails (email_enabled) — é o link do rodapé do resumo semanal.
async function disableEmail(userId, kind) {
  const patch = kind === "tips" ? { tips_enabled: false } : { email_enabled: false };
  const { data: existing } = await supabase
    .from("alert_preferences")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    await supabase.from("alert_preferences").update(patch).eq("user_id", userId);
  } else {
    await supabase.from("alert_preferences").insert({ user_id: userId, ...patch });
  }
}

function page(title, msg) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title} · StarTouch</title>
<style>body{font-family:Arial,Helvetica,sans-serif;background:#F8F9FA;color:#202124;margin:0;display:grid;place-items:center;min-height:100vh;padding:24px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;max-width:440px;text-align:center;box-shadow:0 6px 24px -8px rgba(15,23,42,.1)}
h1{font-size:20px;margin:0 0 8px}p{font-size:14px;color:#5F6368;line-height:1.6;margin:0 0 8px}
a{color:#1A73E8;text-decoration:none;font-weight:600}</style></head>
<body><div class="card"><div style="font-size:42px;margin-bottom:8px">📭</div>
<h1>${title}</h1><p>${msg}</p>
<p style="margin-top:16px"><a href="https://startouch.com.br/app?login=1">Voltar pro painel</a></p></div></body></html>`;
}

export default async function handler(req, res) {
  const u = req.query.u || req.query.user;
  const t = req.query.t || req.query.token;
  const k = req.query.k || req.query.kind; // "tips" = só a dica; senão = todos

  // POST = one-click do Gmail. Responde 200 sempre (não vaza validade).
  if (req.method === "POST") {
    if (u && t && verifyUnsubToken(u, t)) {
      try { await disableEmail(u, k); } catch (e) { console.error("[unsubscribe] POST erro:", e); }
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "GET") return res.status(405).send("Método não permitido");

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (!u || !t || !verifyUnsubToken(u, t)) {
    return res.status(400).send(page("Link inválido", "Esse link de descadastro não é válido ou expirou. Você pode ajustar suas preferências no painel."));
  }
  try {
    await disableEmail(u, k);
    const msg = k === "tips"
      ? "Você não vai mais receber a <strong>dica da semana</strong>. Seu resumo semanal de desempenho continua chegando normalmente. Se mudar de ideia, é só reativar nas preferências do painel."
      : "Você não vai mais receber o resumo semanal por email. Se mudar de ideia, é só reativar nas preferências do painel.";
    return res.status(200).send(page("Pronto, você foi descadastrado", msg));
  } catch (e) {
    console.error("[unsubscribe] GET erro:", e);
    return res.status(500).send(page("Algo deu errado", "Não consegui processar agora. Tente de novo em instantes ou ajuste no painel."));
  }
}
