// ============================================================
// StarTouch Pro no Stripe — o que o checkout e o Publicar do Menu compartilham
// ============================================================
// Saiu do billing.js em 19/10/2026, quando publicar o Menu passou a ABRIR o
// teste de 7 dias sozinho. Antes disso o único jeito de começar o teste era o
// checkout do Stripe: clicar em Publicar, ver a caixa da assinatura, ir pra
// página do Stripe, confirmar e voltar. Três telas entre "montei" e "está no
// ar" — e em 14/10 eram 19 negócios com menu montado e nenhum publicado.
//
// Decisão do Ricardo: nenhum ponto de recusa. Criou, publicou, o teste começa.
// O cartão só é pedido no fim, pra continuar. Isso NÃO muda a regra do teste
// (Termos 1.9 §5.3): 7 dias, sem cartão, um por cliente, e sem cartão no fim a
// assinatura se encerra sem cobrança — `missing_payment_method: cancel`, o
// mesmo caminho do checkout. Muda só a porta de entrada.
//
// Preço e "um teste por cliente" moram aqui, num lugar só: se o checkout e o
// Publicar tivessem cada um a sua cópia, um dia dariam teste a quem o outro
// recusa.
// ============================================================
import Stripe from "stripe";

let _stripe = null;
export function getStripePro() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY não configurada");
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

export const TRIAL_DIAS_PRO = 7;

// O preço do Pro. STRIPE_PRICE_ID manda; sem ele, lê o preço do link de
// pagamento que já vendia o Pro — o mesmo R$ 19,90 que o cliente via antes.
// Guardado por instância: o preço não muda entre um clique e outro.
//
// O STRIPE_PRICE_ID é CONFERIDO antes de usar (15/10/2026). Ele estava
// apontando pra um preço do modo TESTE com a chave de produção — e passou anos
// sem fazer mal porque o link de pagamento tinha prioridade. Quando ele virou o
// caminho principal (07/10), todo clique em "Começar os 7 dias grátis" passou a
// dar "No such price" na cara do cliente. Preço inválido agora grita no log e
// cai pro link, que é o preço que já vendia.
let _precoPro = null;
export async function precoDoPro(stripe) {
  if (_precoPro) return _precoPro;
  const envId = process.env.STRIPE_PRICE_ID;
  if (envId) {
    try {
      const p = await stripe.prices.retrieve(envId);
      if (p?.active) { _precoPro = p.id; return p.id; }
      console.error(`[stripe/checkout] STRIPE_PRICE_ID ${envId} está INATIVO no Stripe — usando o preço do link. Corrija a env na Vercel.`);
    } catch (e) {
      console.error(`[stripe/checkout] STRIPE_PRICE_ID ${envId} INVÁLIDO (${e?.message}) — usando o preço do link. Corrija a env na Vercel.`);
    }
  }
  // Ler o link exige a permissão "Payment Links Read", que a chave restrita de
  // produção NÃO tem (16/10/2026: o cliente viu "Permission denied" no botão
  // dos 7 dias grátis). Falha aqui não encerra: cai pras assinaturas.
  const link = (process.env.STRIPE_PRO_PAYMENT_LINK || "").split("?")[0];
  if (link) {
    try {
      for await (const pl of stripe.paymentLinks.list({ limit: 100 })) {
        if ((pl.url || "").split("?")[0] !== link) continue;
        const itens = await stripe.paymentLinks.listLineItems(pl.id, { limit: 5 });
        const id = itens.data?.[0]?.price?.id;
        if (id) { _precoPro = id; return id; }
      }
    } catch (e) {
      console.error(`[stripe/checkout] não consegui ler o link de pagamento (${e?.message}) — procurando o preço nas assinaturas. Setar STRIPE_PRICE_ID com o preço de PRODUÇÃO resolve de vez.`);
    }
  }
  // Último caminho: o preço que as assinaturas Pro de verdade já usam. A chave
  // lê assinaturas (o `jaTeveAssinatura` depende disso). Ignora o item do
  // dispositivo extra, que mora na mesma assinatura.
  try {
    for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
      const item = (sub.items?.data || []).find((i) =>
        i.price?.active && i.price?.lookup_key !== "menu_dispositivo_extra" && i.price?.recurring);
      if (item) {
        console.warn(`[stripe/checkout] preço do Pro achado na assinatura ${sub.id}: ${item.price.id}. Setar STRIPE_PRICE_ID=${item.price.id} na Vercel.`);
        _precoPro = item.price.id;
        return item.price.id;
      }
    }
  } catch (e) {
    console.error(`[stripe/checkout] não consegui ler as assinaturas (${e?.message})`);
  }
  throw new Error("Não achei o preço do Pro. Configure STRIPE_PRICE_ID na Vercel com o preço de PRODUÇÃO.");
}

// Teste grátis é UM por cliente. Com cartão isso se regulava sozinho; sem
// cartão, cancelar e voltar viraria Pro de graça pra sempre. Quem já teve
// qualquer assinatura neste cliente do Stripe volta pagando, com cartão.
// Falha ao consultar = trata como quem já teve (não dá teste): na dúvida, o
// cliente paga com cartão, que é o fluxo que já funcionava antes.
export async function jaTeveAssinatura(stripe, customerId) {
  if (!customerId) return false;
  try {
    const r = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 });
    return (r.data || []).length > 0;
  } catch (e) {
    console.warn(`[stripe/checkout] não consegui ver o histórico de ${customerId}: ${e?.message} — sem teste grátis`);
    return true;
  }
}

// O id de cliente só serve se for do Stripe. As colunas `stripe_*` já
// guardaram ids do Mercado Pago (CLAUDE.md), e mandar um deles pro Stripe
// derrubaria a criação inteira com "No such customer".
export function clienteStripe(id) {
  return typeof id === "string" && id.startsWith("cus_") ? id : null;
}

/**
 * Abre o teste de 7 dias do Pro SEM checkout — chamado pelo Publicar do Menu.
 *
 * Devolve:
 *   { ok: true, sub, customerId, fimDoTeste }  teste aberto (ou já existia)
 *   { ok: false, motivo: "teste_usado" }       já teve assinatura: paga com cartão
 *   { ok: false, motivo: "erro", erro }        Stripe falhou: quem chama cai no checkout
 *
 * Idempotente por usuário (chave de idempotência do Stripe, 24h): dois
 * cliques em Publicar, ou duas abas, abrem UM teste e UM cliente.
 *
 * Não grava o banco: quem chama grava, porque é quem tem o negócio em mãos e
 * precisa do plano já ligado pra seguir publicando na mesma requisição. O
 * webhook `customer.subscription.updated` grava de novo depois — a fonte da
 * verdade continua sendo o Stripe.
 */
export async function iniciarTesteSemCheckout({ biz, user }) {
  try {
    const stripe = getStripePro();
    let customerId = clienteStripe(biz?.stripe_customer_id);
    if (await jaTeveAssinatura(stripe, customerId)) return { ok: false, motivo: "teste_usado" };

    const price = await precoDoPro(stripe);
    if (!customerId) {
      const c = await stripe.customers.create({
        email: user.email,
        name: biz?.name || undefined,
        metadata: { user_id: user.id, origem: "publicar_menu" },
      }, { idempotencyKey: `cliente-pro-${user.id}` });
      customerId = c.id;
    }

    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price, quantity: 1 }],
      trial_period_days: TRIAL_DIAS_PRO,
      // Sem cartão no fim do teste: o Stripe ENCERRA, não cobra. É o que leva
      // o menu de volta pro Google pelo caminho que já existe (webhook →
      // plano free → api/m/[slug].js).
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      // O cartão posto depois, pelo portal, vira o da assinatura.
      payment_settings: { save_default_payment_method: "on_subscription" },
      metadata: { user_id: user.id, biz_name: biz?.name || "", origem: "publicar_menu" },
    }, { idempotencyKey: `teste-menu-${user.id}-${customerId}` });

    return {
      ok: true, sub, customerId,
      fimDoTeste: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    };
  } catch (e) {
    // Grita: falha aqui manda o cliente de volta pra caixa da assinatura, que
    // é justamente o atrito que esta função existe pra tirar. Causa provável:
    // a chave restrita do Stripe sem permissão de escrita em Customers ou
    // Subscriptions.
    console.error(`[stripe-pro] NÃO ABRI o teste sem checkout (user=${user?.id}): ${e?.message} — cliente caiu na caixa da assinatura`);
    return { ok: false, motivo: "erro", erro: e?.message || String(e) };
  }
}
