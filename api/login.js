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

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email e senha obrigatórios" });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: "Email ou senha incorretos" });

    // Busca o negócio vinculado
    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", data.user.id)
      .single();

    res.json({
      ok: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || "Usuário",
      },
      business: biz || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
