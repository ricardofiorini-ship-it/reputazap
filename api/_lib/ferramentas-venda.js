// ============================================================
// Ferramentas de venda dos assistentes (25/10/2026; comum desde 29/10/2026)
// ============================================================
// Cotar frete e montar o link do carrinho. Moravam no api/whatsapp.js; saíram
// pra cá quando o assistente do site (api/robo.js) nasceu, pra que os dois
// robôs cotem o MESMO frete com a MESMA regra — duas cópias divergiriam calado
// no primeiro reajuste.
// ============================================================
import { cotaFrete } from "./frenet.js";
import { KIT_CATALOG, diasDeProducao } from "./catalogo-kit.js";

// Nomes que o modelo usa → ids do catálogo (contrato com o /kit e o billing).
export const PRODUTO_ID = { cartao: "cartao-nfc", placa_m: "placa-mesa", placa_g: "placa-balcao", cartao_trybo: "cartao-trybo" };
// Espelha o servidor de checkout. Quem DECIDE o frete grátis é o billing.
export const FRETE_GRATIS_ACIMA_CENTAVOS = 14900;
const reais = (c) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function itensDoCatalogo(itens) {
  return (Array.isArray(itens) ? itens : [])
    .map((i) => ({ id: PRODUTO_ID[i.produto], qty: Math.min(Math.max(parseInt(i.quantidade, 10) || 1, 1), 99) }))
    .filter((i) => i.id && KIT_CATALOG[i.id]);
}

export async function cotarFrete({ cep, itens }) {
  const items = itensDoCatalogo(itens);
  if (!items.length) return "Nenhum produto válido.";
  const esgotado = items.find((i) => KIT_CATALOG[i.id].soldOut);
  if (esgotado) return `${KIT_CATALOG[esgotado.id].name} está esgotado.`;
  const produtos = items.reduce((s, i) => s + KIT_CATALOG[i.id].price_cents * i.qty, 0);
  const r = await cotaFrete({ cep, items, modo: "unitario", valorCentavos: produtos });
  if (r.erro) return `Não consegui cotar: ${r.erro}`;
  const producao = diasDeProducao(items);
  const gratis = produtos >= FRETE_GRATIS_ACIMA_CENTAVOS;
  const linhas = r.opcoes.map((o) => `${o.transportadora} ${o.servico}: ${gratis ? "GRÁTIS" : reais(o.precoCentavos)}, chega em até ${o.prazoDias ? o.prazoDias + producao : "?"} dias úteis`);
  return `Produtos: ${reais(produtos)}. ` +
    (gratis ? "Frete grátis (acima de R$ 149 em produtos) — vai pela opção mais em conta."
      : `Faltam ${reais(FRETE_GRATIS_ACIMA_CENTAVOS - produtos)} em produtos para o frete grátis.`) +
    `\nOpções:\n${linhas.join("\n")}\n` + (producao ? `(Prazo = ${producao} dias úteis de produção + transporte.)` : "(Pronta entrega: o prazo é só o do transporte.)");
}

export function linkDeCompra({ itens }) {
  const items = itensDoCatalogo(itens);
  if (!items.length) return "Nenhum produto válido.";
  const ids = items.flatMap((i) => Array(i.qty).fill(i.id));
  const produtos = items.reduce((s, i) => s + KIT_CATALOG[i.id].price_cents * i.qty, 0);
  return `https://startouch.com.br/kit?add=${ids.join(",")}&utm_source=whatsapp&utm_medium=chat&utm_campaign=atendimento` +
    `\n(Total em produtos: ${reais(produtos)}${produtos >= FRETE_GRATIS_ACIMA_CENTAVOS ? ", com frete grátis" : ", frete calculado pelo CEP no site"}.)`;
}
