// ============================================================
// CUPOM "VOLTA" — 20% na primeira compra de quem não fechou (23/10/2026)
// ============================================================
// Quem preenche o modal de entrega do /kit e não paga deixa um pedido
// `pending` em `orders`, com e-mail. O cron `carrinho-abandonado` manda UM
// e-mail, ~24h depois, com um cupom de uso único. Política de Privacidade 1.11
// §3.1 ("Lembrete de compra não concluída").
//
// SEM TABELA NOVA, de propósito (SQL esquecido antes do deploy é o modo de
// falha clássico daqui). O cupom mora no próprio pedido abandonado:
//   orders.shipping.cupom_oferecido = { codigo, pct, expira, enviado_em }
// e o pedido que o USA guarda:
//   orders.shipping.cupom_usado = { codigo, pct, desconto_centavos }
// "Já foi usado" = existe pedido PAGO com aquele cupom_usado.codigo.
//
// O desconto vale só sobre os PRODUTOS. O frete é cobrado inteiro, e a faixa
// de frete grátis (R$ 149) olha o valor dos produtos ANTES do desconto — assim
// a tela e o servidor não discordam sobre quem ganha frete grátis.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export const CUPOM_PCT = 20;
export const CUPOM_VALIDADE_DIAS = 7;

// Sem 0/O/1/I/L: o cliente pode precisar digitar.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function geraCodigo() {
  const bytes = crypto.randomBytes(6);
  let s = "";
  for (const b of bytes) s += ALFABETO[b % ALFABETO.length];
  return `VOLTA-${s}`;
}

export function normalizaCodigo(c) {
  return String(c || "").trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Confere o cupom. Devolve { ok: true, codigo, pct, expira } ou
 * { ok: false, motivo, erro } — o `erro` é a frase que o cliente vê.
 */
export async function validaCupom(codigoBruto) {
  const codigo = normalizaCodigo(codigoBruto);
  if (!/^VOLTA-[A-Z0-9]{6}$/.test(codigo)) {
    return { ok: false, motivo: "formato", erro: "Cupom inválido." };
  }

  const { data: origem, error } = await supabase
    .from("orders")
    .select("id, shipping")
    .eq("shipping->cupom_oferecido->>codigo", codigo)
    .limit(1)
    .maybeSingle();
  if (error) {
    // Banco fora não pode virar "cupom inválido" calado: o cliente desiste
    // achando que o código está errado.
    console.error("[cupom] FALHOU ao consultar o cupom:", error.message);
    return { ok: false, motivo: "banco", erro: "Não consegui conferir o cupom agora. Tente de novo em instantes." };
  }
  const oferta = origem?.shipping?.cupom_oferecido;
  if (!oferta) return { ok: false, motivo: "inexistente", erro: "Cupom inválido." };
  if (Date.parse(oferta.expira) < Date.now()) {
    return { ok: false, motivo: "expirado", erro: "Este cupom expirou." };
  }

  const { data: usado, error: e2 } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "paid")
    .eq("shipping->cupom_usado->>codigo", codigo)
    .limit(1)
    .maybeSingle();
  if (e2) {
    console.error("[cupom] FALHOU ao conferir uso do cupom:", e2.message);
    return { ok: false, motivo: "banco", erro: "Não consegui conferir o cupom agora. Tente de novo em instantes." };
  }
  if (usado) return { ok: false, motivo: "usado", erro: "Este cupom já foi usado." };

  return { ok: true, codigo, pct: Number(oferta.pct) || CUPOM_PCT, expira: oferta.expira };
}

/** Desconto em centavos sobre os produtos (nunca sobre o frete). */
export function descontoCentavos(produtosCentavos, pct) {
  return Math.round((produtosCentavos * pct) / 100);
}

/**
 * Aplica o cupom numa sessão do Stripe. Cria um cupom de VALOR FIXO, uso
 * único, igual ao desconto dos produtos — percentual no Stripe pegaria a
 * linha do frete junto, porque o frete é line item (ver linhaDeFrete).
 */
export async function cupomStripe(stripe, { codigo, desconto }) {
  const c = await stripe.coupons.create({
    amount_off: desconto,
    currency: "brl",
    duration: "once",
    max_redemptions: 1,
    name: `Cupom ${codigo}`.slice(0, 40),
    metadata: { codigo }
  });
  return [{ coupon: c.id }];
}
