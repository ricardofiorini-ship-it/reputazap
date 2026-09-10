import { createClient } from "@supabase/supabase-js";
import { sendInBackground } from "./_lib/email-sender.js";
import { welcomeEmail, adminNewClientEmail } from "./_lib/email-templates.js";
import { logFunnel } from "./track.js";

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

  const { name, email, phone, password, anon_id } = req.body;
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    // Cria conta e já retorna a sessão
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone }
      }
    });

    // ── O ERRO DO SUPABASE NÃO PODE CHEGAR CRU NA TELA ─────────
    // Achado em 10/09/2026 investigando a perda entre "clicou em criar conta"
    // (9) e "concluiu o cadastro" (4): o `error.message` do Supabase vem em
    // INGLÊS e ia direto pra um alert() no celular do lojista. Quem já tinha
    // conta e não lembrava lia "User already registered" e não tinha o que
    // fazer com aquilo — beco sem saída em língua estrangeira, no passo onde a
    // pessoa JÁ tinha decidido se cadastrar.
    //
    // `codigo` viaja junto pro front poder oferecer a AÇÃO certa (entrar, em
    // vez de tentar de novo). Traduzir sem dar saída resolveria metade.
    if (error) {
      const cru = String(error.message || "");
      const baixo = cru.toLowerCase();
      let codigo = "desconhecido";
      let msg = "Não deu pra criar a conta agora. Tente de novo em instantes.";

      if (baixo.includes("already registered") || baixo.includes("already exists")) {
        codigo = "email_ja_existe";
        msg = "Você já tem uma conta com esse e-mail.";
      } else if (baixo.includes("password")) {
        codigo = "senha_fraca";
        msg = "A senha precisa de pelo menos 6 caracteres.";
      } else if (baixo.includes("invalid") && baixo.includes("email")) {
        codigo = "email_invalido";
        msg = "Esse e-mail não parece válido. Confira se não faltou uma letra.";
      } else if (baixo.includes("for security purposes") || baixo.includes("rate limit") || baixo.includes("too many")) {
        codigo = "muitas_tentativas";
        msg = "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
      } else {
        // Mensagem nova do Supabase: o cliente vê o texto genérico acima, mas
        // o log guarda o original — senão a próxima só aparece como "não deu".
        console.error("[register] erro do Supabase sem tradução:", cru);
      }

      return res.status(400).json({ error: msg, codigo });
    }

    // Fim do funil do convidado: cadastro concluído. Server-side pra não depender
    // do front (best-effort; anon_id vem do cliente se enviado, senão conta o evento).
    const funnelPromise = logFunnel({ step: "signup_complete", anon_id, meta: { source: "register" } });

    // Retorna token direto se a sessão foi criada
    const token = data.session?.access_token || null;

    // Emails em paralelo, mas AGUARDADOS antes do res.json — caso contrário
    // o serverless da Vercel termina a função antes do Resend completar
    // (fire-and-forget não é confiável em ambiente serverless).
    const emailPromises = [];

    // 1) Boas-vindas pro cliente
    const tmpl = welcomeEmail({ userName: name });
    emailPromises.push(sendInBackground({
      userId: data.user.id,
      emailType: "welcome",
      to: email,
      subject: tmpl.subject,
      html: tmpl.html,
      metadata: { source: "register" }
    }));

    // 2) Notificação admin (pra Ricardo) — 1x por novo cliente
    const adminTo = process.env.ADMIN_NOTIFICATIONS_EMAIL;
    if (adminTo) {
      const adminTmpl = adminNewClientEmail({
        clientName: name,
        clientEmail: email,
        clientPhone: phone,
        source: "register"
      });
      emailPromises.push(sendInBackground({
        userId: data.user.id,
        emailType: "admin_new_client",
        to: adminTo,
        subject: adminTmpl.subject,
        html: adminTmpl.html,
        metadata: { source: "register", client_email: email }
      }));
    }

    // Aguarda paralelo (~300-800ms a mais de latência, mas garante envio +
    // grava o signup_complete antes do serverless encerrar).
    await Promise.allSettled([...emailPromises, funnelPromise]);

    res.json({
      ok: true,
      user_id: data.user.id,
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
