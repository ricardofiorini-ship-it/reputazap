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
// ATUALIZADO EM 18/09/2026: o varejo passou a COBRAR frete (grátis só acima de
// R$ 149 em produtos) — este endpoint deixou de ser só informativo e virou o
// que alimenta o checkout do `kit.html`. O texto abaixo é o estado anterior.
// ESTADO EM 12/09/2026: o varejo vende com FRETE GRÁTIS por decisão do
// Ricardo, então nenhuma tela chama isto ainda. Quem usa o cálculo hoje é a
// revenda, direto pelo `_lib/frenet.js`. Este endpoint fica de pé porque é
// aqui que o frete do varejo entra no dia em que entrar — e porque é por ele
// que dá pra conferir uma cotação sem fazer um pedido.

import { cotaFrete } from "./_lib/frenet.js";
import { cotaInternacional } from "./_lib/frete-internacional.js";
import { diasDeProducao } from "./_lib/catalogo-kit.js";
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
  cep_sem_cobertura: 422,
  // Internacional (13/10/2026)
  pais: 400,
  pais_sem_cobertura: 422,
  peso: 422,
  cambio: 502
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (await limitou(req, res, LIMITES.frete)) return;

  const body = req.body || {};
  // Fora do Brasil não há CEP nem Frenet: o preço sai da tabela da DHL.
  const pais = String(body.pais || "BR").toUpperCase();
  const r = pais !== "BR" ? await cotaInternacional({ pais, items: body.items }) : await cotaFrete({
    cep: body.cep,
    items: body.items,
    modo: body.modo === "consolidado" ? "consolidado" : "unitario"
  });

  if (r.erro) {
    return res.status(STATUS[r.motivo] || 502).json({ error: r.erro, motivo: r.motivo });
  }
  // Varejo nacional: o prazo da tela é o de CHEGADA (produção + transporte).
  // A revenda não passa por aqui — ela soma os 10 dias dela no revenda.js.
  if (pais === "BR" && body.modo !== "consolidado") {
    const producao = diasDeProducao(body.items);
    r.diasDeProducao = producao;
    r.opcoes = r.opcoes.map((o) => ({ ...o, prazoTotalDias: o.prazoDias ? o.prazoDias + producao : null }));
  }
  return res.json(r);
}
