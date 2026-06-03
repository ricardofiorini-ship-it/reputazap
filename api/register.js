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

    // Aguarda paralelo (~300-800ms a mais de latência, mas garante envio)
    await Promise.allSettled(emailPromises);

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
