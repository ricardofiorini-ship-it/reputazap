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

  console.log("[savebiz] Payload recebido:", req.body);

  if (!place_id || !name) {
    console.error("[savebiz] Campos obrigatórios faltando:", { place_id, name });
    return res.status(400).json({ error: "place_id e name obrigatórios" });
  }

  try {
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      console.error("[savebiz] Erro de autenticação:", authError);
      return res.status(401).json({ error: "Token inválido" });
    }

    const user_id = userData.user.id;
    console.log("[savebiz] user_id autenticado:", user_id);

    const insertPayload = {
      user_id,
      place_id,
      name,
      address,
      rating,
      total_reviews: total,
      plan: plan || "free"
    };
    console.log("[savebiz] Tentando inserir:", insertPayload);

    const { data, error } = await supabase
      .from("businesses")
      .upsert(insertPayload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("[savebiz] ERRO DO SUPABASE:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return res.status(400).json({
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }

    console.log("[savebiz] Sucesso! Business salvo:", data);
    res.json({ ok: true, business: data });
  } catch (err) {
    console.error("[savebiz] Erro inesperado:", err);
    res.status(500).json({ error: err.message });
  }
}