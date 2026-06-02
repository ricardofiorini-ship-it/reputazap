import { createClient } from "@supabase/supabase-js";
import { sendInBackground } from "./_lib/email-sender.js";
import { welcomeEmail, adminNewClientEmail } from "./_lib/email-templates.js";

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

  const { name, email, phone, password } = req.body;
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

    if (error) return res.status(400).json({ error: error.message });

    // Retorna token direto se a sessão foi criada
    const token = data.session?.access_token || null;

    // Email de boas-vindas pro cliente (background — não bloqueia resposta)
    const tmpl = welcomeEmail({ userName: name });
    sendInBackground({
      userId: data.user.id,
      emailType: "welcome",
      to: email,
      subject: tmpl.subject,
      html: tmpl.html,
      metadata: { source: "register" }
    });

    // Notificação admin (pra Ricardo) — 1x por novo cliente
    const adminTo = process.env.ADMIN_NOTIFICATIONS_EMAIL;
    if (adminTo) {
      const adminTmpl = adminNewClientEmail({
        clientName: name,
        clientEmail: email,
        clientPhone: phone,
        source: "register"
      });
      sendInBackground({
        userId: data.user.id,
        emailType: "admin_new_client",
        to: adminTo,
        subject: adminTmpl.subject,
        html: adminTmpl.html,
        metadata: { source: "register", client_email: email }
      });
    }

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
