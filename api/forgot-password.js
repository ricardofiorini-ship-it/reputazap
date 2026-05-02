import { createClient } from "@supabase/supabase-js";

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

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email obrigatório" });

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
