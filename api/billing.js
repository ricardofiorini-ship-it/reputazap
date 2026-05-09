import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

function parseJson(buf) {
  if (!buf.length) return {};
  try { return JSON.parse(buf.toString("utf8")); } catch { return {}; }
}

async function authUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return { error: "Token obrigatório", status: 401 };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { error: "Token inválido", status: 401 };
  return { user: data.user };
}

async function handleCheckout(req, res) {
  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { data: biz } = await supabase
      .from("businesses")
      .select("stripe_customer_id, name, plan")
      .eq("user_id", auth.user.id)
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
        metadata: { user_id: auth.user.id, biz_name: biz?.name || "" }
      },
      client_reference_id: auth.user.id,
      metadata: { user_id: auth.user.id },
      allow_promotion_codes: true,
      success_url: `${origin}/app?upgrade=success&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app?upgrade=cancel`,
      locale: "pt-BR"
    };

    if (biz?.stripe_customer_id) sessionPayload.customer = biz.stripe_customer_id;
    else sessionPayload.customer_email = auth.user.email;

    const session = await stripe.checkout.sessions.create(sessionPayload);
    return res.json({ url: session.url });
  } catch (err) {
    console.error("[billing/checkout] erro:", err);
    return res.status(500).json({ error: err.message || "Erro ao criar checkout" });
  }
}

async function handlePortal(req, res) {
  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { data: biz } = await supabase
      .from("businesses")
      .select("stripe_customer_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (!biz?.stripe_customer_id) {
      return res.status(400).json({ error: "Sem assinatura ativa pra gerenciar" });
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripe.billingPortal.sessions.create({
      customer: biz.stripe_customer_id,
      return_url: `${origin}/app`
    });
    return res.json({ url: session.url });
  } catch (err) {
    console.error("[billing/portal] erro:", err);
    return res.status(500).json({ error: err.message || "Erro ao abrir portal" });
  }
}

async function handleWebhook(req, res) {
  let event;
  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[billing/webhook] assinatura inválida:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id;
        if (!userId) { console.warn("[billing/webhook] session sem user_id:", session.id); break; }
        const { error } = await supabase
          .from("businesses")
          .update({
            plan: "pro",
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription
          })
          .eq("user_id", userId);
        if (error) console.error("[billing/webhook] erro ao ativar pro:", error);
        else console.log("[billing/webhook] pro ativado pra user", userId);
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const shouldBePro = ["active", "trialing", "past_due"].includes(sub.status);
        const { error } = await supabase
          .from("businesses")
          .update({
            plan: shouldBePro ? "pro" : "free",
            stripe_subscription_id: shouldBePro ? sub.id : null
          })
          .eq("stripe_customer_id", sub.customer);
        if (error) console.error("[billing/webhook] erro ao sincronizar:", error);
        else console.log(`[billing/webhook] plano -> ${shouldBePro ? "pro" : "free"} pra ${sub.customer}`);
        break;
      }
      default: break;
    }
    return res.json({ received: true });
  } catch (err) {
    console.error("[billing/webhook] erro processando:", err);
    return res.status(500).json({ error: err.message });
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, stripe-signature");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const action = req.query.action || req.query.a;

  if (action === "webhook") return handleWebhook(req, res);
  if (action === "checkout") return handleCheckout(req, res);
  if (action === "portal") return handlePortal(req, res);

  return res.status(400).json({ error: "Unknown action. Use ?action=checkout|portal|webhook" });
}
