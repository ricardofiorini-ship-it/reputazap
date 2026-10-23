import { createClient } from "@supabase/supabase-js";
import { sendInBackground } from "./_lib/email-sender.js";
import { tryboNovaSenhaEmail, remetenteTrybo } from "./_lib/email-trybo.js";
import { limitou } from "./_lib/rate-limit.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, produto, code } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email obrigatório" });

  if (produto === "trybo") return trybo(req, res, String(email).trim().toLowerCase(), code);
  // Pedido feito na tela da StarTouch por conta que é SÓ da Trybo (23/10/2026):
  // sem isto ela recebia o e-mail da StarTouch e caía no /app. Na dúvida
  // (erro de consulta), segue o caminho padrão — ele funciona pros dois.
  if (await contaSoTrybo(String(email).trim().toLowerCase())) {
    return trybo(req, res, String(email).trim().toLowerCase(), code);
  }

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const redirectTo = `${origin}/reset`;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) console.error("[forgot-password] erro Supabase:", error);
  } catch (err) {
    console.error("[forgot-password] erro inesperado:", err);
  }

  // Sempre retorna ok pra nao vazar quais emails existem
  res.json({ ok: true });
}

// Conta só da Trybo = tem negócio, e nenhum com ficha no Google (trybo-003).
// perPage 1000: a base cabe folgada hoje (mesmo teto do broadcast).
async function contaSoTrybo(email) {
  const url = process.env.SUPABASE_URL, chave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !chave || !email) return false;
  try {
    const admin = createClient(url, chave, { auth: { persistSession: false } });
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = (data?.users || []).find((u) => (u.email || "").toLowerCase() === email);
    if (!user) return false;
    const { data: negocios, error } = await admin.from("businesses").select("place_id").eq("user_id", user.id);
    if (error || !negocios?.length) return false;
    return negocios.every((b) => !b.place_id);
  } catch (e) {
    console.warn("[forgot-password] não consegui ver se a conta é da Trybo:", e?.message || e);
    return false;
  }
}

// ── TRYBO (19/10/2026) ──────────────────────────────────────
// O e-mail padrão do login é um só, com a cara da StarTouch, e leva à página
// e ao painel da StarTouch. Pra Trybo, o link é gerado aqui (chave de
// serviço) e o e-mail sai com a cara dela, apontando pra `/nova-senha-trybo`,
// que troca a senha e já entra no painel da Trybo — ou volta pra ativação do
// cartão, se a pessoa estava no meio dela (`code`).
//
// O link leva o `token_hash`, e não o endereço de verificação do Supabase: o
// endereço dele só devolve a pessoa a URLs da lista de permitidas, e uma URL
// fora dela cai CALADA no endereço padrão do site — a StarTouch de novo.
//
// Dois freios, porque aqui quem dispara o e-mail somos nós, não o Supabase
// (que tem freio próprio no caminho padrão): 10 pedidos por IP/hora, e um
// e-mail por endereço a cada 2 minutos — senão um laço lotaria a caixa de
// entrada de um cliente nosso. Resposta sempre igual, exista a conta ou não.
async function trybo(req, res, email, code) {
  if (await limitou(req, res, { nome: "senha-trybo", porIpHora: 10 })) return;

  const url = process.env.SUPABASE_URL, chave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !chave) {
    console.error("[forgot-password/trybo] SUPABASE_SERVICE_KEY ausente — recuperação da Trybo DESLIGADA.");
    return res.json({ ok: true });
  }
  const admin = createClient(url, chave, { auth: { persistSession: false } });

  try {
    const doisMin = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recente } = await admin.from("email_log").select("id")
      .eq("email_type", "trybo_nova_senha").eq("to_email", email).gte("sent_at", doisMin).limit(1);
    if (recente?.length) return res.json({ ok: true });

    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (error || !data?.properties?.hashed_token) {
      // Conta inexistente cai aqui também — normal, e por isso não grita.
      if (error && !/not.?found|no user/i.test(error.message || "")) {
        console.error("[forgot-password/trybo] generateLink falhou:", error.message);
      }
      return res.json({ ok: true });
    }

    const origin = String(req.headers.origin || "");
    const base = /^http:\/\/localhost(:\d+)?$/.test(origin) ? origin : "https://startouch.com.br";
    const codigo = String(code || "").trim().toUpperCase();
    const link = `${base}/nova-senha-trybo?token_hash=${encodeURIComponent(data.properties.hashed_token)}` +
      (/^TRY-[A-Z0-9]{4,8}$/.test(codigo) ? `&code=${encodeURIComponent(codigo)}` : "");

    const tmpl = tryboNovaSenhaEmail({ link });
    await sendInBackground({
      userId: data.user.id,
      emailType: "trybo_nova_senha",
      to: email,
      subject: tmpl.subject,
      html: tmpl.html,
      metadata: { produto: "trybo" },
      from: remetenteTrybo() || undefined,
      lang: "pt"
    });
  } catch (err) {
    console.error("[forgot-password/trybo] erro inesperado:", err);
  }
  res.json({ ok: true });
}
