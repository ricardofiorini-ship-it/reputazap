import { createClient } from "@supabase/supabase-js";
import { sendInBackground } from "./_lib/email-sender.js";
import { welcomeEmail } from "./_lib/email-templates.js";

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

  const { email, password, id_token, action } = req.body;

  try {
    let data, error;

    if (action === "google" || id_token) {
      // Login via Google Identity Services — recebe o id_token (JWT) do client.
      // Supabase precisa ter Google provider habilitado em Authentication > Providers.
      if (!id_token) return res.status(400).json({ error: "id_token obrigatório pra login Google" });
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

    // Bem-vindo no primeiro login Google (idempotente — só envia 1x)
    if (action === "google" || id_token) {
      const name = meta.full_name || meta.name || (data.user.email || "").split("@")[0] || "";
      const tmpl = welcomeEmail({ userName: name });
      sendInBackground({
        userId: data.user.id,
        emailType: "welcome",
        to: data.user.email,
        subject: tmpl.subject,
        html: tmpl.html,
        metadata: { source: "login_google" }
      });
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
