import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token obrigatório" });

  try {
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) return res.status(401).json({ error: "Token inválido" });

    const user = userData.user;
    const userId = user.id;

    // Busca biz pra usar customer existente se já houver
    const { data: biz } = await supabase
      .from("businesses")
      .select("stripe_customer_id, name, plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (biz?.plan === "pro") {
      return res.status(400).json({ error: "Modo Protegido já está ativo" });
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const sessionPayload = {
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: userId, biz_name: biz?.name || "" }
      },
      client_reference_id: userId,
      metadata: { user_id: userId },
      allow_promotion_codes: true,
      success_url: `${origin}/app?upgrade=success&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app?upgrade=cancel`,
      locale: "pt-BR"
    };

    if (biz?.stripe_customer_id) {
      sessionPayload.customer = biz.stripe_customer_id;
    } else {
      sessionPayload.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionPayload);
    return res.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] erro:", err);
    return res.status(500).json({ error: err.message || "Erro ao criar checkout" });
  }
}
