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
      console.error("[mybiz] Erro de autenticação:", authError);
      return res.status(401).json({ error: "Token inválido" });
    }

    const user_id = userData.user.id;
    console.log("[mybiz] Buscando business do user_id:", user_id);

    const { data: business, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) {
      console.error("[mybiz] Erro ao buscar business:", error);
      return res.status(400).json({ error: error.message });
    }

    if (!business) {
      console.log("[mybiz] Nenhum business encontrado para esse usuário");
      return res.status(404).json({ error: "Nenhum negócio cadastrado" });
    }

    console.log("[mybiz] Business encontrado:", business.name);
    res.json({ business });
  } catch (err) {
    console.error("[mybiz] Erro inesperado:", err);
    res.status(500).json({ error: err.message });
  }
}
