import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token obrigatório" });

  const { place_id, name, address, rating, total, plan } = req.body;
  if (!place_id || !name) return res.status(400).json({ error: "place_id e name obrigatórios" });

  try {
    // Verifica o token e pega o user_id
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError) return res.status(401).json({ error: "Token inválido" });

    const user_id = userData.user.id;

    // Salva ou atualiza o negócio
    const { data, error } = await supabase
      .from("businesses")
      .upsert({ user_id, place_id, name, address, rating, total_reviews: total, plan: plan || "free" },
        { onConflict: "user_id" })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ ok: true, business: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
