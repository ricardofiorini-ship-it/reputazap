import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { access_token, refresh_token, password } = req.body;
  if (!access_token || !refresh_token || !password) {
    return res.status(400).json({ error: "access_token, refresh_token e password obrigatorios" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Senha precisa ter ao menos 6 caracteres" });
  }

  // Cliente com a sessao de recovery do usuario
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    if (sessionError) {
      console.error("[reset-password] setSession:", sessionError);
      return res.status(401).json({ error: "Link de recuperacao invalido ou expirado" });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      console.error("[reset-password] updateUser:", updateError);
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[reset-password] erro inesperado:", err);
    res.status(500).json({ error: err.message });
  }
}
