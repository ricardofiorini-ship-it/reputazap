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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  let event;
  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] assinatura invalida:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        if (!userId) {
          console.warn("[stripe-webhook] session sem user_id:", session.id);
          break;
        }
        const { error } = await supabase
          .from("businesses")
          .update({
            plan: "pro",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId
          })
          .eq("user_id", userId);
        if (error) console.error("[stripe-webhook] erro ao ativar pro:", error);
        else console.log("[stripe-webhook] modo protegido ativado pra user", userId);
        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer;
        const status = sub.status;
        // Pro continua ativo enquanto status for active/trialing/past_due. Cai pra free em canceled/unpaid/incomplete_expired.
        const shouldBePro = ["active", "trialing", "past_due"].includes(status);
        const newPlan = shouldBePro ? "pro" : "free";
        const { error } = await supabase
          .from("businesses")
          .update({
            plan: newPlan,
            stripe_subscription_id: shouldBePro ? sub.id : null
          })
          .eq("stripe_customer_id", customerId);
        if (error) console.error("[stripe-webhook] erro ao sincronizar plano:", error);
        else console.log(`[stripe-webhook] plano -> ${newPlan} pra customer ${customerId} (status=${status})`);
        break;
      }

      default:
        // ignora eventos nao tratados
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] erro processando evento:", err);
    return res.status(500).json({ error: err.message });
  }
}
