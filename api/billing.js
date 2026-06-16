// Billing — provedor PRIMARIO: Mercado Pago. Stripe fica preservado como dormente (reativa trocando o dispatcher).
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { MercadoPagoConfig, PreApproval, Preference, Payment } from "mercadopago";
import crypto from "crypto";

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─────────────────────────────────────────────────────────────
// Util compartilhado
// ─────────────────────────────────────────────────────────────

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

function parseJson(buf) {
  if (!buf || !buf.length) return {};
  try { return JSON.parse(buf.toString("utf8")); } catch { return {}; }
}

async function authUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return { error: "Token obrigatório", status: 401 };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { error: "Token inválido", status: 401 };
  return { user: data.user };
}

// Catalogo do kit — fonte de verdade pra preços. Deve refletir public/kit.html.
// Preços em centavos. soldOut: true bloqueia o item no checkout.
const KIT_CATALOG = {
  "placa-balcao": {
    name: "Placa de Balcão G",
    description: "Placa NFC de balcão tamanho G — acrílico premium. Cliente aproxima o celular e avalia no Google em segundos.",
    price_cents: 7990,
    image: "https://startouch.com.br/gadget-placa.png",
    category_id: "electronics",
    soldOut: false
  },
  "placa-mesa": {
    name: "Placa de Balcão M",
    description: "Placa NFC de balcão tamanho M — versão compacta, perfeita pra balcões menores e mesas.",
    price_cents: 4990,
    image: "https://startouch.com.br/gadget-placa.png",
    category_id: "electronics",
    soldOut: false
  },
  "cartao-nfc": {
    name: "Cartão de Avaliação NFC",
    description: "Cartão NFC tamanho carteira. Ideal pra atendimento, networking e aproximação rápida.",
    price_cents: 2990,
    image: "https://startouch.com.br/gadget-cartao.png",
    category_id: "electronics",
    soldOut: false
  },
  "pulseira": {
    name: "Pulseira NFC",
    description: "Pulseira NFC pra atendimento e experiências em eventos.",
    price_cents: 10990,
    image: "https://startouch.com.br/gadget-pulseira.png",
    category_id: "electronics",
    soldOut: true
  }
};

// Preço do plano Pro mensal (em reais, NUMBER)
const PRO_MONTHLY_PRICE = 19.90;

// ─────────────────────────────────────────────────────────────
// MERCADO PAGO — provedor ativo
// ─────────────────────────────────────────────────────────────

let _mp;
function getMP() {
  if (!process.env.MP_ACCESS_TOKEN) {
    throw new Error("MP_ACCESS_TOKEN não configurado. Defina nas variáveis de ambiente da Vercel (Project → Settings → Environment Variables).");
  }
  if (!_mp) _mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  return _mp;
}

// Plano Pro mensal — usa link estatico se MP_PRO_PAYMENT_LINK setada, senao chama API (PreApproval).
async function handleCheckoutMP(req, res) {
  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, name, plan")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (biz?.plan === "pro") {
      return res.status(400).json({ error: "Plano Pro já está ativo" });
    }

    // Caminho 1 (preferencial): link pre-configurado no painel MP.
    // Adicionamos external_reference na URL pra o webhook ligar o pagamento ao user.
    if (process.env.MP_PRO_PAYMENT_LINK) {
      const base = process.env.MP_PRO_PAYMENT_LINK;
      const sep = base.includes("?") ? "&" : "?";
      const url = `${base}${sep}external_reference=pro_${auth.user.id}`;
      return res.json({ url });
    }

    // Caminho 2 (fallback): cria PreApproval via API. So funciona se conta MP estiver liberada (sem PolicyAgent block).
    const mp = getMP();
    const preapproval = new PreApproval(mp);
    const origin = req.headers.origin || `https://${req.headers.host}`;

    // Tenta extrair nome/sobrenome do biz pra enriquecer o checkout (sobe nota de qualidade no MP)
    const fullName = (biz?.name || "").trim();
    const [first_name, ...rest] = fullName.split(/\s+/).filter(Boolean);
    const last_name = rest.join(" ") || first_name || "";

    const result = await preapproval.create({
      body: {
        reason: "Plano Pro StarTouch — desbloqueio de ranking e concorrentes",
        external_reference: `pro_${auth.user.id}`,
        payer_email: auth.user.email,
        back_url: `${origin}/app?upgrade=success`,
        notification_url: `${origin}/api/billing?action=webhook`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: PRO_MONTHLY_PRICE,
          currency_id: "BRL"
        },
        ...(first_name && {
          payer: {
            first_name,
            last_name
          }
        }),
        status: "pending"
      }
    });

    return res.json({ url: result.init_point });
  } catch (err) {
    console.error("[mp/checkout] erro:", err);
    return res.status(500).json({ error: err?.message || "Erro ao criar checkout do plano Pro" });
  }
}

// Kit (placas + cartão) — cria Preference one-shot e devolve init_point.
async function handleCheckoutKitMP(req, res) {
  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const rawBody = await getRawBody(req);
    const { items = [], biz_name = "" } = parseJson(rawBody);

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Carrinho vazio" });
    }

    const mpItems = [];
    let totalCents = 0;
    for (const item of items) {
      const product = KIT_CATALOG[item?.id];
      if (!product) return res.status(400).json({ error: `Produto desconhecido: ${item?.id}` });
      if (product.soldOut) return res.status(400).json({ error: `${product.name} está esgotado no momento.` });
      const qty = parseInt(item.qty, 10);
      if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
        return res.status(400).json({ error: `Quantidade inválida pra ${product.name}` });
      }
      mpItems.push({
        id: item.id,
        title: product.name,
        description: product.description,
        picture_url: product.image,
        category_id: product.category_id || "electronics",
        quantity: qty,
        unit_price: Number((product.price_cents / 100).toFixed(2)),
        currency_id: "BRL"
      });
      totalCents += product.price_cents * qty;
    }

    if (totalCents === 0) return res.status(400).json({ error: "Total zerado" });

    const mp = getMP();
    const preference = new Preference(mp);
    const origin = req.headers.origin || `https://${req.headers.host}`;

    // Enriquece nome do payer pra subir nota de qualidade no MP
    const fullName = (biz_name || "").trim();
    const [first_name, ...rest] = fullName.split(/\s+/).filter(Boolean);
    const last_name = rest.join(" ") || first_name || "";

    const result = await preference.create({
      body: {
        items: mpItems,
        payer: {
          email: auth.user.email,
          ...(first_name && { name: first_name, surname: last_name })
        },
        back_urls: {
          success: `${origin}/app?kit=success`,
          pending: `${origin}/app?kit=pending`,
          failure: `${origin}/kit?biz=${encodeURIComponent(biz_name)}&cancelled=1`
        },
        auto_return: "approved",
        external_reference: `kit_${auth.user.id}_${Date.now()}`,
        notification_url: `${origin}/api/billing?action=webhook`,
        metadata: {
          user_id: auth.user.id,
          biz_name,
          kit_total_cents: String(totalCents)
        },
        statement_descriptor: "STARTOUCH",
        additional_info: `Pedido do kit StarTouch — ${mpItems.length} item(ns), total R$ ${(totalCents / 100).toFixed(2)}`
      }
    });

    return res.json({ url: result.init_point });
  } catch (err) {
    console.error("[mp/checkout-kit] erro:", err);
    return res.status(500).json({ error: err?.message || "Erro ao criar checkout do kit" });
  }
}

// Pacote Presença em IA — checkout PÚBLICO (sem login). Lead vem do Radar.
// R$ 599 total, parcelável em até 6x no cartão. Captura o lead antes de pagar.
const IA_PACKAGE = {
  title: "Pacote Presença em IA — Programa de 6 meses",
  description: "Diagnóstico mensal no IA Radar + diretrizes de otimização do Google e estratégia de avaliações. Em até 6x.",
  price_cents: 59900,
  max_installments: 6,
};

async function handleCheckoutServicoMP(req, res) {
  try {
    const b = parseJson(await getRawBody(req));
    const nome = (b.nome || "").toString().trim();
    const email = (b.email || "").toString().trim();
    const whatsapp = (b.whatsapp || "").toString().trim();
    const biz_name = (b.biz_name || "").toString().trim();
    const cidade = (b.cidade || "").toString().trim();
    const bairro = (b.bairro || "").toString().trim();
    const want_kit = !!b.want_kit;
    const scoreInt = parseInt(b.score, 10);
    const score = Number.isFinite(scoreInt) ? scoreInt : null;

    if (!nome || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "Informe nome e um email válido." });
    }

    // Captura do lead (best-effort — não derruba o checkout se a tabela faltar).
    try {
      await supabase.from("radar_leads").insert({ nome, email, whatsapp, biz_name, cidade, bairro, score, want_kit });
    } catch (e) {
      console.warn("[mp/checkout-ia] lead insert falhou:", e?.message);
    }

    const mp = getMP();
    const preference = new Preference(mp);
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const [first_name, ...rest] = nome.split(/\s+/).filter(Boolean);
    const last_name = rest.join(" ") || first_name || "";

    const result = await preference.create({
      body: {
        items: [{
          id: "presenca-ia-6m",
          title: IA_PACKAGE.title,
          description: IA_PACKAGE.description,
          category_id: "services",
          quantity: 1,
          unit_price: Number((IA_PACKAGE.price_cents / 100).toFixed(2)),
          currency_id: "BRL",
        }],
        payer: { email, ...(first_name && { name: first_name, surname: last_name }) },
        back_urls: {
          success: `${origin}/radar?contratado=1`,
          pending: `${origin}/radar?contratado=pending`,
          failure: `${origin}/radar?contratado=0`,
        },
        auto_return: "approved",
        payment_methods: { installments: IA_PACKAGE.max_installments },
        external_reference: `ia_${Date.now()}`,
        notification_url: `${origin}/api/billing?action=webhook`,
        metadata: { tipo: "presenca_ia", nome, email, whatsapp, biz_name, cidade, bairro, score, want_kit },
        statement_descriptor: "STARTOUCH",
        additional_info: `Pacote Presença em IA (6 meses) — ${biz_name || nome}`,
      },
    });

    return res.json({ url: result.init_point });
  } catch (err) {
    console.error("[mp/checkout-ia] erro:", err);
    return res.status(500).json({ error: err?.message || "Erro ao criar checkout do pacote" });
  }
}

// Cancela a assinatura Pro do usuario logado (substitui o portal do Stripe).
async function handlePortalMP(req, res) {
  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { data: biz } = await supabase
      .from("businesses")
      .select("stripe_subscription_id, plan")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (!biz?.stripe_subscription_id) {
      return res.status(400).json({ error: "Sem assinatura ativa pra cancelar" });
    }

    const mp = getMP();
    const preapproval = new PreApproval(mp);

    // Cancela imediatamente. (MP nao tem "cancel at period end" nativo simples.)
    await preapproval.update({
      id: biz.stripe_subscription_id,
      body: { status: "cancelled" }
    });

    // O webhook deve atualizar o Supabase, mas marcamos pre-emptivamente aqui.
    await supabase
      .from("businesses")
      .update({
        plan: "free",
        stripe_subscription_status: "cancelled",
        stripe_cancel_at_period_end: true
      })
      .eq("user_id", auth.user.id);

    return res.json({ ok: true, cancelled: true, message: "Assinatura cancelada com sucesso." });
  } catch (err) {
    console.error("[mp/portal] erro:", err);
    return res.status(500).json({ error: err?.message || "Erro ao cancelar assinatura" });
  }
}

// Valida assinatura HMAC do webhook do MP (se MP_WEBHOOK_SECRET estiver configurada).
// Template oficial MP: id:{data_id};request-id:{x-request-id};ts:{ts}
function verifyMPSignature(req, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // Se nao tiver secret configurada, pula validacao (modo dev/setup inicial)
  const sigHeader = req.headers["x-signature"] || "";
  const requestId = req.headers["x-request-id"] || "";
  if (!sigHeader || !requestId || !dataId) return false;

  // Parse "ts=xxx,v1=yyy"
  const parts = Object.fromEntries(
    sigHeader.split(",").map(p => p.trim().split("=").map(s => s.trim()))
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const template = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(template).digest("hex");
  return expected === v1;
}

async function handleWebhookMP(req, res) {
  // MP envia GET (legado) ou POST (novo). Em ambos, type/topic + id ou data.id.
  let type, id;

  if (req.method === "GET") {
    type = req.query.type || req.query.topic;
    id = req.query.id || req.query["data.id"];
  } else {
    const rawBody = await getRawBody(req);
    const body = parseJson(rawBody);
    type = body.type || body.action || req.query.type || req.query.topic;
    id = body?.data?.id || body?.id || req.query.id || req.query["data.id"];
  }

  if (!type || !id) {
    console.log("[mp/webhook] notificação sem type/id — ignorada", { type, id });
    return res.status(200).json({ ok: true, ignored: "missing type/id" });
  }

  // Validacao de assinatura (silenciosa em modo setup)
  if (!verifyMPSignature(req, String(id))) {
    console.warn("[mp/webhook] assinatura inválida — rejeitado", { type, id });
    return res.status(401).json({ error: "Invalid signature" });
  }

  try {
    const mp = getMP();

    // ── Assinatura (Plano Pro) ──
    if (type === "subscription_preapproval" || type === "preapproval") {
      const preapproval = new PreApproval(mp);
      const pp = await preapproval.get({ id });

      const externalRef = pp.external_reference || "";
      if (!externalRef.startsWith("pro_")) {
        console.log("[mp/webhook] preapproval não-Pro — ignorado", externalRef);
        return res.json({ ok: true, ignored: "not pro" });
      }
      const userId = externalRef.replace("pro_", "");

      // Status MP: pending | authorized | paused | cancelled
      const isActive = ["authorized"].includes(pp.status);
      const periodEnd = pp.next_payment_date ? new Date(pp.next_payment_date).toISOString() : null;

      const { error } = await supabase
        .from("businesses")
        .update({
          plan: isActive ? "pro" : "free",
          stripe_subscription_id: isActive ? pp.id : null, // reusa coluna pra ID do MP (simplifica schema)
          stripe_current_period_end: periodEnd,
          stripe_cancel_at_period_end: pp.status === "cancelled",
          stripe_subscription_status: pp.status
        })
        .eq("user_id", userId);

      if (error) console.error("[mp/webhook] erro update pro:", error);
      else console.log(`[mp/webhook] preapproval ${pp.id} status=${pp.status} → plan=${isActive ? "pro" : "free"} user=${userId}`);

      return res.json({ ok: true, type: "preapproval", id, status: pp.status });
    }

    // ── Payment (pagamento avulso — usado por kit + recorrencias da assinatura) ──
    if (type === "payment") {
      const paymentClient = new Payment(mp);
      const pay = await paymentClient.get({ id });
      const externalRef = pay.external_reference || "";

      if (externalRef.startsWith("kit_")) {
        const userId = externalRef.split("_")[1];
        console.log(
          `[mp/webhook] pagamento kit ${id} status=${pay.status} user=${userId} valor=${pay.transaction_amount}`
        );
        // Aqui no futuro: criar registro em "orders" ou marcar status do pedido.
        // Por enquanto, só log; o envio fisico é manual via painel.
        return res.json({ ok: true, type: "payment-kit", id, status: pay.status });
      }

      // Pagamento mensal da assinatura (recurring) — log pra rastreio
      console.log(`[mp/webhook] payment ${id} status=${pay.status} ref="${externalRef}"`);
      return res.json({ ok: true, type: "payment", id, status: pay.status });
    }

    return res.json({ ok: true, ignored: type });
  } catch (err) {
    console.error("[mp/webhook] erro:", err);
    return res.status(500).json({ error: err?.message || "Erro processando webhook" });
  }
}

// ─────────────────────────────────────────────────────────────
// STRIPE — DORMENTE (preservado pra reativar trocando o dispatcher)
// ─────────────────────────────────────────────────────────────

let _stripe;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY não configurada");
  }
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

async function handleCheckoutStripe(req, res) {
  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  if (!process.env.STRIPE_PRICE_ID) return res.status(500).json({ error: "STRIPE_PRICE_ID não configurada" });
  try {
    const stripe = getStripe();
    const { data: biz } = await supabase
      .from("businesses").select("stripe_customer_id, name, plan").eq("user_id", auth.user.id).maybeSingle();
    if (biz?.plan === "pro") return res.status(400).json({ error: "Plano Pro já está ativo" });
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const sessionPayload = {
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: { trial_period_days: 14, metadata: { user_id: auth.user.id, biz_name: biz?.name || "" } },
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
    console.error("[stripe/checkout] erro:", err);
    return res.status(500).json({ error: err.message || "Erro" });
  }
}

async function handleCheckoutKitStripe(req, res) {
  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  try {
    const rawBody = await getRawBody(req);
    const { items = [], biz_name = "" } = parseJson(rawBody);
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Carrinho vazio" });
    const line_items = [];
    let totalCents = 0;
    for (const item of items) {
      const product = KIT_CATALOG[item?.id];
      if (!product) return res.status(400).json({ error: `Produto desconhecido: ${item?.id}` });
      if (product.soldOut) return res.status(400).json({ error: `${product.name} esgotado.` });
      const qty = parseInt(item.qty, 10);
      if (!Number.isFinite(qty) || qty < 1 || qty > 99) return res.status(400).json({ error: `Qty inválida pra ${product.name}` });
      line_items.push({
        price_data: { currency: "brl", product_data: { name: product.name }, unit_amount: product.price_cents },
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
      payment_method_options: { card: { installments: { enabled: true } } },
      metadata: { user_id: auth.user.id, biz_name, kit_total_cents: String(totalCents), order_type: "kit" },
      payment_intent_data: { metadata: { user_id: auth.user.id, biz_name, order_type: "kit" } },
      allow_promotion_codes: true,
      locale: "pt-BR",
      success_url: `${origin}/app?kit=success&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/kit?biz=${encodeURIComponent(biz_name)}&cancelled=1`
    });
    return res.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout-kit] erro:", err);
    return res.status(500).json({ error: err.message });
  }
}

async function handlePortalStripe(req, res) {
  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  try {
    const stripe = getStripe();
    const { data: biz } = await supabase.from("businesses").select("stripe_customer_id").eq("user_id", auth.user.id).maybeSingle();
    if (!biz?.stripe_customer_id) return res.status(400).json({ error: "Sem assinatura ativa" });
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripe.billingPortal.sessions.create({ customer: biz.stripe_customer_id, return_url: `${origin}/app` });
    return res.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/portal] erro:", err);
    return res.status(500).json({ error: err.message });
  }
}

async function handleWebhookStripe(req, res) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(500).json({ error: "STRIPE_WEBHOOK_SECRET não configurada" });
  let event;
  try {
    const stripe = getStripe();
    const rawBody = await getRawBody(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe/webhook] assinatura inválida:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  try {
    const stripe = getStripe();
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id;
        if (!userId) break;
        if (session.mode === "payment") { console.log("[stripe/webhook] kit pago", session.id); break; }
        let periodEnd = null, cancelAtEnd = false, status = null;
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
            cancelAtEnd = !!sub.cancel_at_period_end; status = sub.status;
          } catch (e) { console.error(e); }
        }
        await supabase.from("businesses").update({
          plan: "pro", stripe_customer_id: session.customer, stripe_subscription_id: session.subscription,
          stripe_current_period_end: periodEnd, stripe_cancel_at_period_end: cancelAtEnd, stripe_subscription_status: status
        }).eq("user_id", userId);
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const shouldBePro = ["active", "trialing", "past_due"].includes(sub.status);
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
        await supabase.from("businesses").update({
          plan: shouldBePro ? "pro" : "free", stripe_subscription_id: shouldBePro ? sub.id : null,
          stripe_current_period_end: shouldBePro ? periodEnd : null, stripe_cancel_at_period_end: shouldBePro ? !!sub.cancel_at_period_end : false,
          stripe_subscription_status: shouldBePro ? sub.status : null
        }).eq("stripe_customer_id", sub.customer);
        break;
      }
      default: break;
    }
    return res.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] erro:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// Dispatcher — provedor ativo: Mercado Pago
// Pra reativar Stripe: trocar as 4 linhas abaixo por handle*Stripe.
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-signature, x-request-id, stripe-signature");
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action || req.query.a;

  // Webhook aceita GET (MP legado) ou POST. Outras actions: só POST.
  if (action === "webhook") {
    return await handleWebhookMP(req, res);
  }

  // Diagnostico GET — mostra prefixo dos tokens e quais envs estao setadas (nao vaza segredos).
  if (action === "debug" || action === "health") {
    const mpToken = process.env.MP_ACCESS_TOKEN || "";
    const mpType = mpToken.startsWith("APP_USR-") ? "PRODUCTION (live)"
                 : mpToken.startsWith("TEST-")    ? "TEST (sandbox)"
                 : mpToken                        ? "UNKNOWN (não começa com APP_USR/TEST)"
                                                 : "NAO_SETADO";
    const proLink = process.env.MP_PRO_PAYMENT_LINK || "";
    let proLinkHost = null;
    try { if (proLink) proLinkHost = new URL(proLink).host; } catch {}
    return res.json({
      mp: {
        access_token_set: !!mpToken,
        access_token_type: mpType,
        access_token_prefix: mpToken ? mpToken.slice(0, 12) + "..." : null,
        webhook_secret_set: !!process.env.MP_WEBHOOK_SECRET,
        pro_payment_link_set: !!proLink,
        pro_payment_link_host: proLinkHost,
        pro_payment_link_starts: proLink ? proLink.slice(0, 50) + "..." : null
      },
      stripe_dormant: {
        secret_set: !!process.env.STRIPE_SECRET_KEY,
        price_id_set: !!process.env.STRIPE_PRICE_ID,
        webhook_secret_set: !!process.env.STRIPE_WEBHOOK_SECRET
      },
      supabase: {
        url_set: !!process.env.SUPABASE_URL,
        service_key_set: !!process.env.SUPABASE_SERVICE_KEY
      }
    });
  }

  // Diagnostico profundo do MP — chama API real e retorna o que MP diz da conta + tentativa de PreApproval
  if (action === "mp-probe") {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) return res.status(500).json({ error: "MP_ACCESS_TOKEN nao setado" });

    const out = { token_prefix: token.slice(0, 12) + "...", checks: {} };

    // 1) /users/me — quem é o dono da conta
    try {
      const r = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await r.json();
      out.checks.users_me = {
        status: r.status,
        ok: r.ok,
        id: body?.id,
        nickname: body?.nickname,
        country_id: body?.country_id,
        site_id: body?.site_id,
        email: body?.email,
        user_type: body?.user_type,
        tags: body?.tags,
        status_user: body?.status,
        secure_email: body?.secure_email
      };
    } catch (e) { out.checks.users_me = { error: e.message }; }

    // 2) /v1/payment_methods — endpoint público (qualquer token válido lê) — descarta token corrompido
    try {
      const r = await fetch("https://api.mercadopago.com/v1/payment_methods", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await r.json();
      out.checks.payment_methods = {
        status: r.status,
        ok: r.ok,
        count: Array.isArray(body) ? body.length : null,
        sample: Array.isArray(body) ? body.slice(0, 3).map(m => m?.id) : body
      };
    } catch (e) { out.checks.payment_methods = { error: e.message }; }

    // 3) Tenta criar Preference (kit, pagamento avulso) — testa se o problema é só PreApproval ou tudo
    try {
      const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ id: "probe", title: "Diagnostico StarTouch", quantity: 1, unit_price: 1.00, currency_id: "BRL" }]
        })
      });
      const body = await r.json();
      out.checks.preference_create = {
        status: r.status,
        ok: r.ok,
        body: r.ok ? { id: body?.id, init_point: body?.init_point ? "present" : "missing" } : body
      };
    } catch (e) { out.checks.preference_create = { error: e.message }; }

    // 4) Tenta criar PreApproval (assinatura) — testa se o problema é específico desse recurso
    try {
      const sample = {
        reason: "Diagnostico StarTouch",
        external_reference: "probe_" + Date.now(),
        payer_email: "diag-probe@example.com",
        back_url: "https://startouch.com.br/app",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 19.90,
          currency_id: "BRL"
        },
        status: "pending"
      };
      const r = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(sample)
      });
      const body = await r.json();
      out.checks.preapproval_create = {
        status: r.status,
        ok: r.ok,
        body: body
      };
    } catch (e) { out.checks.preapproval_create = { error: e.message }; }

    return res.json(out);
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (action === "checkout") return await handleCheckoutMP(req, res);
    if (action === "checkout-kit") return await handleCheckoutKitMP(req, res);
    if (action === "checkout-ia") return await handleCheckoutServicoMP(req, res);
    if (action === "portal") return await handlePortalMP(req, res);
    return res.status(400).json({ error: "Unknown action. Use ?action=checkout|checkout-kit|checkout-ia|portal|webhook|debug" });
  } catch (err) {
    console.error("[billing] erro nao tratado:", err);
    if (!res.headersSent) return res.status(500).json({ error: err?.message || "Erro interno" });
  }
}
