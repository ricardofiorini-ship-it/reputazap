import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token obrigatório" });

  try {
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      console.error("[feedbacks] Erro de autenticação:", authError);
      return res.status(401).json({ error: "Token inválido" });
    }

    const user_id = userData.user.id;

    // Busca o place_id do negócio do usuário
    const { data: business } = await supabase
      .from("businesses")
      .select("place_id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!business?.place_id) return res.json({ feedbacks: [] });

    // Busca feedbacks com decision='wait' (aguardando contato/resolução)
    const { data: feedbacks, error } = await supabase
      .from("feedbacks")
      .select("id, text, rating, contact, created_at")
      .eq("place_id", business.place_id)
      .eq("decision", "wait")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[feedbacks] Erro ao buscar:", error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ feedbacks: feedbacks || [] });
  } catch (err) {
    console.error("[feedbacks] Erro inesperado:", err);
    res.status(500).json({ error: err.message });
  }
}
