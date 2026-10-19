import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // Evita que browser ou Vercel edge cache uma resposta antiga (sem colunas novas, ex: category_override)
  res.setHeader("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  res.setHeader("Pragma", "no-cache");

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

    // O MENU SAIU DO AR POR FALTA DE PAGAMENTO? (19/10/2026)
    // Teve assinatura no Stripe (cliente "cus_"), não é mais Pro e tem menu
    // publicado: os dispositivos voltaram a levar direto ao Google. O painel
    // mostra "insira seus dados de pagamento para continuar". Calculado aqui
    // e não na tela porque a tela do /app não carrega as experiências.
    // Falha na consulta = não mostra (nunca um aviso de cobrança chutado).
    business.menu_fora_do_ar = false;
    if (business.plan !== "pro" && String(business.stripe_customer_id || "").startsWith("cus_")) {
      const { count, error: eExp } = await supabase.from("experiences")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id).not("published", "is", null).is("archived_at", null);
      if (eExp) console.warn("[mybiz] não consegui ver os menus publicados:", eExp.message);
      else business.menu_fora_do_ar = (count || 0) > 0;
    }
    res.json({ business });
  } catch (err) {
    console.error("[mybiz] Erro inesperado:", err);
    res.status(500).json({ error: err.message });
  }
}
