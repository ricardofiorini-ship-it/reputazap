import { createClient } from "@supabase/supabase-js";
import { sendInBackground } from "./_lib/email-sender.js";
import { welcomeEmail, adminNewClientEmail } from "./_lib/email-templates.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Cliente admin pra verificar existencia de user sem cria-lo
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Decodifica o payload do id_token Google (JWT) sem validar a assinatura.
// Validacao real e feita pelo Supabase no signInWithIdToken — aqui so
// queremos o email pra checar se ja existe antes de deixar o Supabase criar.
function decodeJwtEmail(idToken) {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "===".slice((payload.length + 3) % 4);
    const json = Buffer.from(padded, "base64").toString("utf-8");
    const obj = JSON.parse(json);
    return (obj.email || "").toLowerCase() || null;
  } catch {
    return null;
  }
}

// Verifica se existe conta com esse email. Pra base pequena, listUsers
// resolve. Quando passar de ~500 users, migrar pra query direta na tabela
// auth.users via SQL ou pra GET /admin/users?email=
async function findUserByEmail(email) {
  if (!email) return null;
  const target = email.toLowerCase();
  // perPage=1000 = padrao maximo. Pra escalar acima disso, paginar.
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1, perPage: 1000
  });
  if (error) {
    console.error("[login.findUserByEmail]", error);
    return null;
  }
  return (data?.users || []).find(u => (u.email || "").toLowerCase() === target) || null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, password, id_token, action } = req.body;

  try {
    let data, error;

    if (action === "google" || id_token) {
      // Login via Google Identity Services — recebe o id_token (JWT) do client.
      // Supabase precisa ter Google provider habilitado em Authentication > Providers.
      if (!id_token) return res.status(400).json({ error: "id_token obrigatório pra login Google" });

      // SEGURANCA: por padrao, signInWithIdToken CRIA o user se nao existir.
      // No /app queremos so LOGIN — cadastro tem que passar pelo fluxo do /ativar
      // (que vincula o negocio do Google). Sem esse check, sobravam contas orfas
      // sem business.
      // Decodifica o email do id_token (sem validar — Supabase valida depois)
      // e checa antes se ja existe.
      const tokenEmail = decodeJwtEmail(id_token);
      if (!tokenEmail) {
        return res.status(400).json({ error: "Token Google inválido (sem email)" });
      }
      const existingUser = await findUserByEmail(tokenEmail);
      if (!existingUser) {
        return res.status(404).json({
          error: "no_account",
          message: "Você ainda não tem conta no StarTouch. Crie sua conta primeiro pra começar.",
          email: tokenEmail
        });
      }

      ({ data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: id_token
      }));
      if (error) return res.status(401).json({ error: error.message || "Login Google falhou" });
    } else {
      // Login tradicional email/senha
      if (!email || !password) return res.status(400).json({ error: "Email e senha obrigatórios" });
      ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
      if (error) return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    // Busca o negócio vinculado (pode não existir pra usuários novos Google)
    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", data.user.id)
      .maybeSingle();

    const meta = data.user.user_metadata || {};

    // Bem-vindo no primeiro login Google + notificação admin (idempotentes — só 1x)
    // Emails aguardados antes do res.json — serverless corta promises órfãs.
    if (action === "google" || id_token) {
      const name = meta.full_name || meta.name || (data.user.email || "").split("@")[0] || "";
      const emailPromises = [];

      const tmpl = welcomeEmail({ userName: name });
      emailPromises.push(sendInBackground({
        userId: data.user.id,
        emailType: "welcome",
        to: data.user.email,
        subject: tmpl.subject,
        html: tmpl.html,
        metadata: { source: "login_google" }
      }));

      const adminTo = process.env.ADMIN_NOTIFICATIONS_EMAIL;
      if (adminTo) {
        const adminTmpl = adminNewClientEmail({
          clientName: name,
          clientEmail: data.user.email,
          clientPhone: meta.phone || null,
          source: "login_google"
        });
        emailPromises.push(sendInBackground({
          userId: data.user.id,
          emailType: "admin_new_client",
          to: adminTo,
          subject: adminTmpl.subject,
          html: adminTmpl.html,
          metadata: { source: "login_google", client_email: data.user.email }
        }));
      }

      await Promise.allSettled(emailPromises);
    }
    res.json({
      ok: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: meta.full_name || meta.name || (data.user.email || "").split("@")[0] || "Usuário",
        avatar_url: meta.avatar_url || meta.picture || null,
        provider: data.user.app_metadata?.provider || "email"
      },
      business: biz || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
