// ============================================================
// Cotação de frete — endpoint público
// ============================================================
// O motor está em `_lib/frenet.js`, compartilhado com a revenda. Aqui mora só
// a porta: método, freio e tradução de erro em código HTTP.
//
// POR QUE UM ENDPOINT NOSSO, e não um cálculo dentro do checkout: a página de
// pagamento hospedada da Stripe **não recalcula frete**. Está na documentação
// deles — "the hosted page integration doesn't support dynamically customizing
// shipping options". Ela aceita um valor já decidido. Logo o CEP tem que ser
// perguntado no NOSSO site antes de mandar o cliente pra lá.
//
// ESTADO EM 12/09/2026: o varejo vende com FRETE GRÁTIS por decisão do
// Ricardo, então nenhuma tela chama isto ainda. Quem usa o cálculo hoje é a
// revenda, direto pelo `_lib/frenet.js`. Este endpoint fica de pé porque é
// aqui que o frete do varejo entra no dia em que entrar — e porque é por ele
// que dá pra conferir uma cotação sem fazer um pedido.

import { cotaFrete } from "./_lib/frenet.js";
import { limitou, LIMITES } from "./_lib/rate-limit.js";

// De onde a falha veio → o que o cliente merece ver.
// `config` é 503 e não 422 de propósito: mandar alguém conferir o CEP por
// causa de uma variável de ambiente faltando é o tipo de erro que ninguém
// descobre — o cliente culpa o próprio endereço e vai embora.
const STATUS = {
  config: 503,
  cep: 400,
  carrinho: 400,
  frenet: 502,
  resposta_vazia: 502,
  cep_sem_cobertura: 422
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (await limitou(req, res, LIMITES.frete)) return;

  const body = req.body || {};
  const r = await cotaFrete({
    cep: body.cep,
    items: body.items,
    modo: body.modo === "consolidado" ? "consolidado" : "unitario"
  });

  if (r.erro) {
    return res.status(STATUS[r.motivo] || 502).json({ error: r.erro, motivo: r.motivo });
  }
  return res.json(r);
}
