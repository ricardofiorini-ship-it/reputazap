// ============================================================
// Cotação de frete — Frenet
// ============================================================
// POR QUE ESTE ENDPOINT EXISTE, e não um cálculo dentro do checkout:
//
// A página de pagamento hospedada da Stripe **não recalcula frete**. Está
// escrito na documentação deles: "the hosted page integration doesn't support
// dynamically customizing shipping options". Ela aceita um valor de frete já
// decidido e pronto. Logo, o CEP tem que ser perguntado no NOSSO site, antes
// de mandar o cliente pra lá — e é isso que este endpoint atende.
//
// Efeito colateral bom: o endereço passa a nascer completo no nosso banco
// (com número e bairro), em vez de vir pela metade do formulário da Stripe.
//
// Contrato da Frenet conferido no SDK oficial em PHP (a documentação pública
// deles é renderizada por JavaScript e não dá pra citar com segurança):
//   POST https://api.frenet.com.br/shipping/quote
//   cabeçalho `token`
//   corpo: SellerCEP, RecipientCEP, ShipmentInvoiceValue, RecipientCountry,
//          ShippingItemArray[{ Weight, Length, Height, Width, Quantity, SKU,
//          Category, isFragile }]
//   resposta: ShippingSevicesArray  ← o erro de digitação é da API, não daqui.
//             Cada item: ServiceCode, ServiceDescription, Carrier,
//             ShippingPrice, DeliveryTime, Error, Msg.

import { KIT_CATALOG, LOGISTICA } from "./_lib/catalogo-kit.js";
import { limitou, LIMITES } from "./_lib/rate-limit.js";

const FRENET_URL = "https://api.frenet.com.br/shipping/quote";

// CEP de onde a mercadoria sai. Sem ele a Frenet não cota nada.
const CEP_ORIGEM = (process.env.FRENET_CEP_ORIGEM || "").replace(/\D/g, "");

// Quantas opções devolver pro cliente escolher. A Stripe aceita no máximo 5
// `shipping_options` por sessão, e mais que isso na tela também vira ruído.
const MAX_OPCOES = 4;

// A Frenet às vezes demora. Melhor uma falha clara em 12s do que a function da
// Vercel morrendo no limite dela sem dizer o motivo.
const TIMEOUT_MS = 12000;

function respostaDeErro(res, status, mensagem, extra = {}) {
  return res.status(status).json({ error: mensagem, ...extra });
}

/**
 * Monta a lista de itens no formato da Frenet a partir do carrinho.
 * Peso e medida NUNCA vêm do cliente — vêm do nosso catálogo. Aceitar
 * dimensão do navegador seria deixar qualquer um pedir frete de carta
 * registrada pra uma caixa de placa.
 */
function montaItens(items) {
  if (!Array.isArray(items) || items.length === 0) return { erro: "Carrinho vazio" };

  const lista = [];
  let valorCentavos = 0;

  for (const item of items) {
    const produto = KIT_CATALOG[item?.id];
    if (!produto) return { erro: `Produto desconhecido: ${item?.id}` };
    if (produto.soldOut) return { erro: `${produto.name} está esgotado no momento.` };

    const log = LOGISTICA[item.id];
    if (!log) {
      // O guard do catálogo já grita no boot; aqui a venda para, porque frete
      // zerado parece que funcionou e sai do nosso bolso em todo pedido.
      console.error(`[frete] "${item.id}" sem peso/medida em LOGISTICA — cotação recusada`);
      return { erro: "Não consegui calcular o frete deste item. Fale com a gente." };
    }

    const qtd = parseInt(item.qty, 10);
    if (!Number.isFinite(qtd) || qtd < 1 || qtd > 99) {
      return { erro: `Quantidade inválida pra ${produto.name}` };
    }

    lista.push({
      SKU: item.id,
      Quantity: qtd,
      Weight: log.peso,
      Length: log.comprimento,
      Width: log.largura,
      Height: log.altura,
      Category: "Eletrônicos",
      isFragile: false
    });
    valorCentavos += produto.price_cents * qtd;
  }

  return { lista, valorCentavos };
}

/** Uma tentativa contra a Frenet, com relógio próprio. */
async function cotaUmaVez(corpo, token) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(FRENET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify(corpo),
      signal: ctrl.signal
    });
    clearTimeout(t);
    if (!r.ok) return { erro: `Frenet respondeu HTTP ${r.status}` };
    return { dados: await r.json() };
  } catch (e) {
    clearTimeout(t);
    return { erro: e?.name === "AbortError" ? "tempo esgotado" : (e?.message || String(e)) };
  }
}

/**
 * Cota com UMA retentativa.
 *
 * Regra do projeto: sonda que dispara ação retenta antes de concluir, e a
 * recuperação na segunda tentativa NÃO pode virar silêncio — soluço repetido é
 * o aviso prévio da queda real. Aqui a ação é vender: concluir "sem frete" por
 * um soluço de rede ou mataria a venda, ou (pior) a deixaria passar de graça.
 */
async function cotaComRetentativa(corpo, token) {
  const primeira = await cotaUmaVez(corpo, token);
  if (!primeira.erro) return primeira;

  console.warn(`[frete] 1ª tentativa falhou (${primeira.erro}) — repetindo`);
  const segunda = await cotaUmaVez(corpo, token);
  if (!segunda.erro) {
    console.warn(`[frete] recuperou na 2ª tentativa. A 1ª tinha falhado com: ${primeira.erro}`);
    return { ...segunda, retentou: true };
  }
  return { erro: segunda.erro, retentou: true };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return respostaDeErro(res, 405, "Method not allowed");

  const token = process.env.FRENET_TOKEN;
  if (!token || !CEP_ORIGEM) {
    // Não é erro do cliente e não pode ser confundido com "não entregamos aí".
    console.error(
      `[frete] configuração faltando: ${!token ? "FRENET_TOKEN " : ""}${!CEP_ORIGEM ? "FRENET_CEP_ORIGEM" : ""}`.trim()
    );
    return respostaDeErro(res, 503, "O cálculo de frete está indisponível no momento.", { motivo: "config" });
  }

  if (await limitou(req, res, LIMITES.frete)) return;

  const body = req.body || {};
  const cepDestino = String(body.cep || "").replace(/\D/g, "");
  if (cepDestino.length !== 8) {
    return respostaDeErro(res, 400, "Informe um CEP válido, com 8 dígitos.");
  }

  const carrinho = montaItens(body.items);
  if (carrinho.erro) return respostaDeErro(res, 400, carrinho.erro);

  const corpo = {
    SellerCEP: CEP_ORIGEM,
    RecipientCEP: cepDestino,
    ShipmentInvoiceValue: Number((carrinho.valorCentavos / 100).toFixed(2)),
    RecipientCountry: "BR",
    ShippingItemArray: carrinho.lista
  };

  const r = await cotaComRetentativa(corpo, token);
  if (r.erro) {
    console.error(`[frete] NÃO COTOU para ${cepDestino}: ${r.erro}`);
    return respostaDeErro(res, 502, "Não consegui calcular o frete agora. Tente de novo em instantes.", { motivo: "frenet" });
  }

  // `ShippingSevicesArray` — a falta do "r" é da API da Frenet. Se um dia eles
  // consertarem, o nome certo também é aceito aqui e nada quebra em silêncio.
  const servicos = r.dados?.ShippingSevicesArray || r.dados?.ShippingServicesArray || [];
  if (!Array.isArray(servicos) || servicos.length === 0) {
    console.error(`[frete] Frenet respondeu SEM lista de serviços para ${cepDestino}. Resposta: ${JSON.stringify(r.dados).slice(0, 400)}`);
    return respostaDeErro(res, 502, "Não consegui calcular o frete agora. Tente de novo em instantes.", { motivo: "resposta_vazia" });
  }

  // A Frenet devolve serviço com erro DENTRO da lista (Error: true + Msg), em
  // vez de omitir. Sem este filtro, "CEP não atendido" viraria uma opção de
  // frete R$ 0,00 na tela — grátis por engano, no lugar onde mais dói.
  const recusados = [];
  const opcoes = servicos
    .filter((s) => {
      const temErro = s?.Error === true || s?.Error === "true";
      const preco = Number(s?.ShippingPrice);
      if (temErro || !Number.isFinite(preco) || preco <= 0) {
        recusados.push(`${s?.ServiceDescription || s?.ServiceCode || "?"}: ${s?.Msg || "sem preço"}`);
        return false;
      }
      return true;
    })
    .map((s) => ({
      codigo: String(s.ServiceCode || ""),
      transportadora: String(s.Carrier || "").trim(),
      servico: String(s.ServiceDescription || "").trim(),
      precoCentavos: Math.round(Number(s.ShippingPrice) * 100),
      prazoDias: parseInt(s.DeliveryTime, 10) || null
    }))
    .sort((a, b) => a.precoCentavos - b.precoCentavos)
    .slice(0, MAX_OPCOES);

  if (opcoes.length === 0) {
    console.warn(`[frete] nenhuma transportadora atende ${cepDestino}. Recusas: ${recusados.join(" | ")}`);
    return respostaDeErro(res, 422, "Nenhuma transportadora atende esse CEP. Confira o número ou fale com a gente.", { motivo: "cep_sem_cobertura" });
  }

  if (recusados.length) {
    // Não é erro, mas se um dia TODAS começarem a recusar, o log já mostra o
    // porquê antes do cliente reclamar.
    console.log(`[frete] ${cepDestino}: ${opcoes.length} opção(ões), ${recusados.length} recusada(s) — ${recusados.join(" | ")}`);
  }

  return res.json({
    cep: cepDestino,
    subtotalCentavos: carrinho.valorCentavos,
    opcoes,
    ...(r.retentou ? { retentou: true } : {})
  });
}
