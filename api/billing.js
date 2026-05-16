import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Lazy init pra que falta de env retorne JSON amigavel em vez de FUNCTION_INVOCATION_FAILED
let _stripe;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY não configurada no Vercel. Vá em Project → Settings → Environment Variables.");
  }
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

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

  if (!process.env.STRIPE_PRICE_ID) {
    return res.status(500).json({ error: "STRIPE_PRICE_ID não configurada no Vercel" });
  }

  try {
    const stripe = getStripe();
    const { data: biz } = await supabase
      .from("businesses")
      .select("stripe_customer_id, name, plan")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (biz?.plan === "pro") {
      return res.status(400).json({ error: "Plano Pro já está ativo" });
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

// Catalogo do kit — fonte de verdade pra preços. Deve refletir public/kit.html.
// Preços em centavos.
const KIT_CATALOG = {
  "placa-balcao": { name: "Placa de Balcão NFC",      price_cents: 7990  },
  "placa-mesa":   { name: "Placa de Mesa NFC",         price_cents: 4990  },
  "pulseira":     { name: "Pulseira NFC",              price_cents: 10990 },
  "adesivo":      { name: "Adesivos NFC (kit com 3)",  price_cents: 2990  }
};

async function handleCheckoutKit(req, res) {
  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const rawBody = await getRawBody(req);
    const { items = [], biz_name = "" } = parseJson(rawBody);

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Carrinho vazio" });
    }

    const line_items = [];
    let totalCents = 0;
    for (const item of items) {
      const product = KIT_CATALOG[item?.id];
      if (!product) return res.status(400).json({ error: `Produto desconhecido: ${item?.id}` });
      const qty = parseInt(item.qty, 10);
      if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
        return res.status(400).json({ error: `Quantidade inválida pra ${product.name}` });
      }
      line_items.push({
        price_data: {
          currency: "brl",
          product_data: { name: product.name },
          unit_amount: product.price_cents
        },
        quantity: qty
      });
      totalCents += product.price_cents * qty;
    }

    if (totalCents === 0) return res.status(400).json({ error: "Total zerado" });

    const stripe = getStripe();
    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      shipping_address_collection: { allowed_countries: ["BR"] },
      phone_number_collection: { enabled: true },
      customer_email: auth.user.email,
      client_reference_id: auth.user.id,
      metadata: {
        user_id: auth.user.id,
        biz_name,
        kit_total_cents: String(totalCents),
        order_type: "kit"
      },
      payment_intent_data: {
        metadata: { user_id: auth.user.id, biz_name, order_type: "kit" }
      },
      allow_promotion_codes: true,
      locale: "pt-BR",
      success_url: `${origin}/app?kit=success&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/kit?biz=${encodeURIComponent(biz_name)}&cancelled=1`
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("[billing/checkout-kit] erro:", err);
    return res.status(500).json({ error: err.message || "Erro ao criar checkout do kit" });
  }
}

async function handlePortal(req, res) {
  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const stripe = getStripe();
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
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: "STRIPE_WEBHOOK_SECRET não configurada" });
  }
  let event;
  try {
    const stripe = getStripe();
    const rawBody = await getRawBody(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[billing/webhook] assinatura inválida:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const stripe = getStripe();
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id;
        if (!userId) { console.warn("[billing/webhook] session sem user_id:", session.id); break; }

        // Pedidos de kit (mode=payment) sao logados pra acompanhamento — nao mexem no plano.
        // O envio fisico do hardware e feito a partir do Stripe Dashboard.
        if (session.mode === "payment") {
          const totalCents = session.amount_total ?? session.metadata?.kit_total_cents ?? "?";
          const bizName = session.metadata?.biz_name || "(sem biz)";
          console.log(`[billing/webhook] pedido de kit pago — user=${userId} biz=${bizName} total_cents=${totalCents} session=${session.id}`);
          break;
        }

        // Busca a subscription completa pra pegar current_period_end + status
        let periodEnd = null;
        let cancelAtEnd = false;
        let status = null;
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
            cancelAtEnd = !!sub.cancel_at_period_end;
            status = sub.status;
          } catch (e) {
            console.error("[billing/webhook] erro ao buscar subscription:", e);
          }
        }

        const { error } = await supabase
          .from("businesses")
          .update({
            plan: "pro",
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            stripe_current_period_end: periodEnd,
            stripe_cancel_at_period_end: cancelAtEnd,
            stripe_subscription_status: status
          })
          .eq("user_id", userId);
        if (error) console.error("[billing/webhook] erro ao ativar pro:", error);
        else console.log("[billing/webhook] pro ativado pra user", userId, "status", status, "renova em", periodEnd);
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const shouldBePro = ["active", "trialing", "past_due"].includes(sub.status);
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
        const { error } = await supabase
          .from("businesses")
          .update({
            plan: shouldBePro ? "pro" : "free",
            stripe_subscription_id: shouldBePro ? sub.id : null,
            stripe_current_period_end: shouldBePro ? periodEnd : null,
            stripe_cancel_at_period_end: shouldBePro ? !!sub.cancel_at_period_end : false,
            stripe_subscription_status: shouldBePro ? sub.status : null
          })
          .eq("stripe_customer_id", sub.customer);
        if (error) console.error("[billing/webhook] erro ao sincronizar:", error);
        else console.log(`[billing/webhook] plano -> ${shouldBePro ? "pro" : "free"} pra ${sub.customer} (status=${sub.status} cancela=${sub.cancel_at_period_end})`);
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

  try {
    const action = req.query.action || req.query.a;
    if (action === "webhook") return await handleWebhook(req, res);
    if (action === "checkout") return await handleCheckout(req, res);
    if (action === "checkout-kit") return await handleCheckoutKit(req, res);
    if (action === "portal") return await handlePortal(req, res);
    return res.status(400).json({ error: "Unknown action. Use ?action=checkout|checkout-kit|portal|webhook" });
  } catch (err) {
    console.error("[billing] erro nao tratado:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err?.message || "Erro interno", stack: err?.stack });
    }
  }
}
