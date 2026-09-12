// ============================================================
// Cotação de frete — Frenet (motor compartilhado)
// ============================================================
// Usado por `api/frete.js` (endpoint público) e por `api/revenda.js` (cota o
// pedido B2B e manda o número junto do aviso pro admin).
//
// Contrato conferido no SDK oficial em PHP da Frenet, não de memória — a
// documentação pública deles é renderizada por JavaScript e não dá pra citar
// com segurança:
//   POST https://api.frenet.com.br/shipping/quote   (cabeçalho `token`)
//   corpo: SellerCEP, RecipientCEP, ShipmentInvoiceValue, RecipientCountry,
//          ShippingItemArray[{ Weight, Length, Height, Width, Quantity, SKU,
//          Category, isFragile }]
//   resposta: ShippingSevicesArray  ← a falta do "r" é da API, não daqui.

import { KIT_CATALOG, LOGISTICA } from "./catalogo-kit.js";

const FRENET_URL = "https://api.frenet.com.br/shipping/quote";
const TIMEOUT_MS = 12000;

// CEP de onde o pacote é POSTADO (não é o endereço da empresa). Informado pelo
// Ricardo em 12/09/2026. Fica no código, com env como atalho pra trocar sem
// deploy: não é segredo, e assim a configuração na Vercel é UMA variável só.
export const CEP_ORIGEM = (process.env.FRENET_CEP_ORIGEM || "05086010").replace(/\D/g, "");

// Quantas opções devolver. A Stripe aceita no máximo 5 `shipping_options` por
// sessão, e mais que isso na tela vira ruído.
const MAX_OPCOES = 4;

// Folga de embalagem na consolidação: caixa tem parede, e produto empilhado
// deixa vão. 35% é estimativa — o primeiro pedido real vai dizer se serve.
const FOLGA_CAIXA = 1.35;

// Mínimos dos Correios pra encomenda. Mandar menos que isso faz a
// transportadora arredondar sozinha; mandar o mínimo certo evita surpresa.
const MIN_COMPRIMENTO = 16, MIN_LARGURA = 11, MIN_ALTURA = 2;

export function temConfiguracao() {
  return !!process.env.FRENET_TOKEN && CEP_ORIGEM.length === 8;
}

export function motivoDaConfiguracao() {
  const falta = [];
  if (!process.env.FRENET_TOKEN) falta.push("FRENET_TOKEN");
  if (CEP_ORIGEM.length !== 8) falta.push(`CEP de origem inválido ("${CEP_ORIGEM}")`);
  return falta.join(" e ");
}

/**
 * UM PACOTE POR UNIDADE — como sai no varejo.
 * Peso e medida vêm do NOSSO catálogo, nunca do navegador: aceitar dimensão
 * do cliente seria deixar qualquer um pedir frete de carta pra uma placa.
 */
function itensUnitarios(carrinho) {
  return carrinho.map(({ id, qtd, log }) => ({
    SKU: id,
    Quantity: qtd,
    Weight: log.peso,
    Length: log.comprimento,
    Width: log.largura,
    Height: log.altura,
    Category: "Eletrônicos",
    isFragile: false
  }));
}

/**
 * TUDO NUMA CAIXA SÓ — como sai na revenda.
 *
 * POR QUE ISTO EXISTE, e é a diferença entre cotar certo e cotar 3× a mais:
 * a Frenet (como a transportadora) cobra pelo maior entre o peso real e o
 * peso CUBADO (C×L×A÷6000). Mandando 500 cartões como 500 pacotes de
 * 16×11×2 cm, o cubado dá ~29 kg — só que 500 cartões pesam 10 kg e cabem
 * numa caixa que cuba menos de 1 kg. O frete sairia pelo triplo.
 *
 * O modelo: soma o volume dos PRODUTOS (não o das embalagens individuais),
 * põe folga, e monta uma caixa com a base do maior item do pedido e altura
 * suficiente pro resto. Não é a caixa exata que vai ser usada — é uma
 * aproximação honesta, e por isso a cotação da revenda é tratada como
 * ESTIMATIVA até bater com alguns pedidos de verdade.
 */
function itemConsolidado(carrinho) {
  let peso = 0, volume = 0, base = MIN_COMPRIMENTO * MIN_LARGURA;
  let comprimento = MIN_COMPRIMENTO, largura = MIN_LARGURA;

  for (const { qtd, log } of carrinho) {
    peso += log.peso * qtd;
    const b = log.bruto;
    volume += (b.comprimento * b.largura * b.altura) * qtd;
    // A base da caixa é ditada pelo maior item: nada entra numa caixa menor
    // do que a própria peça.
    if (b.comprimento * b.largura > base) {
      base = b.comprimento * b.largura;
      comprimento = b.comprimento;
      largura = b.largura;
    }
  }

  // Margem pra parede da caixa e proteção nas laterais.
  comprimento = Math.ceil(comprimento + 2);
  largura = Math.ceil(largura + 2);
  const altura = Math.max(MIN_ALTURA, Math.ceil((volume * FOLGA_CAIXA) / (comprimento * largura)));

  return [{
    SKU: "pedido-consolidado",
    Quantity: 1,
    Weight: Math.round(peso * 1000) / 1000,
    Length: comprimento,
    Width: largura,
    Height: altura,
    Category: "Eletrônicos",
    isFragile: false
  }];
}

/**
 * Valida o carrinho contra o catálogo e devolve as linhas no formato da Frenet.
 * `aliases` mapeia id externo -> id do catálogo (a revenda usa `cartao`,
 * `placag`, `placam`; o catálogo usa `cartao-nfc`, `placa-balcao`,
 * `placa-mesa`). Duas grafias pro mesmo produto é coisa que já existe no
 * projeto — o que não pode é o frete e o preço discordarem sobre qual item é.
 */
export function montaCarrinho(items, { aliases = {}, modo = "unitario", checarEstoque = true, maxQtd = 99 } = {}) {
  if (!Array.isArray(items) || items.length === 0) return { erro: "Carrinho vazio" };

  const carrinho = [];
  let valorCentavos = 0;

  for (const item of items) {
    const id = aliases[item?.id] || item?.id;
    const produto = KIT_CATALOG[id];
    if (!produto) return { erro: `Produto desconhecido: ${item?.id}` };
    if (checarEstoque && produto.soldOut) return { erro: `${produto.name} está esgotado no momento.` };

    const log = LOGISTICA[id];
    if (!log) {
      // O guard do catálogo já grita no boot. Aqui a cotação PARA, porque
      // frete zerado parece que funcionou e sai do nosso bolso todo pedido.
      console.error(`[frenet] "${id}" sem peso/medida em LOGISTICA — cotação recusada`);
      return { erro: "Não consegui calcular o frete deste item. Fale com a gente." };
    }

    // O teto vem de QUEM CHAMA, porque cada caminho tem o seu: o varejo para
    // em 99 (é o que o checkout aceita) e a revenda vai a 10.000. Um teto só,
    // compartilhado, faria o frete cotar o que o checkout depois recusa — ou
    // o contrário, que é pior: pedido aceito e frete recusado.
    const qtd = parseInt(item.qty ?? item.qtd, 10);
    if (!Number.isFinite(qtd) || qtd < 1 || qtd > maxQtd) {
      return { erro: `Quantidade inválida pra ${produto.name}` };
    }

    carrinho.push({ id, qtd, log });
    valorCentavos += produto.price_cents * qtd;
  }

  const lista = modo === "consolidado" ? itemConsolidado(carrinho) : itensUnitarios(carrinho);
  return { lista, valorCentavos, carrinho };
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
 * um soluço de rede ou mata a venda, ou (pior) deixa passar de graça.
 */
async function cotaComRetentativa(corpo, token) {
  const primeira = await cotaUmaVez(corpo, token);
  if (!primeira.erro) return primeira;

  console.warn(`[frenet] 1ª tentativa falhou (${primeira.erro}) — repetindo`);
  const segunda = await cotaUmaVez(corpo, token);
  if (!segunda.erro) {
    console.warn(`[frenet] recuperou na 2ª tentativa. A 1ª tinha falhado com: ${primeira.erro}`);
    return { ...segunda, retentou: true };
  }
  return { erro: segunda.erro, retentou: true };
}

/**
 * Cota o frete. Devolve `{ opcoes, subtotalCentavos, pacote }` ou
 * `{ erro, motivo }` — nunca uma lista vazia fingindo sucesso.
 */
export async function cotaFrete({ cep, items, aliases, modo = "unitario", checarEstoque = true, maxQtd = 99, valorCentavos = null }) {
  const token = process.env.FRENET_TOKEN;
  if (!temConfiguracao()) {
    console.error(`[frenet] configuração faltando: ${motivoDaConfiguracao()}`);
    return { erro: "O cálculo de frete está indisponível no momento.", motivo: "config" };
  }

  const cepDestino = String(cep || "").replace(/\D/g, "");
  if (cepDestino.length !== 8) return { erro: "Informe um CEP válido, com 8 dígitos.", motivo: "cep" };

  const carrinho = montaCarrinho(items, { aliases, modo, checarEstoque, maxQtd });
  if (carrinho.erro) return { erro: carrinho.erro, motivo: "carrinho" };

  // VALOR DECLARADO. Por padrão é o preço de tabela do site, mas quem chama
  // pode mandar o seu: a revenda vende os MESMOS produtos por menos (cartão a
  // R$ 13,90 em vez de R$ 29,90), e declarar o preço de varejo num pedido de
  // revenda infla o seguro — que entra no preço do frete. Declarar valor que
  // não é o da nota também é problema na hora de dar sinistro.
  const valorDeclarado = Number.isFinite(valorCentavos) && valorCentavos > 0
    ? valorCentavos
    : carrinho.valorCentavos;

  const r = await cotaComRetentativa({
    SellerCEP: CEP_ORIGEM,
    RecipientCEP: cepDestino,
    ShipmentInvoiceValue: Number((valorDeclarado / 100).toFixed(2)),
    RecipientCountry: "BR",
    ShippingItemArray: carrinho.lista
  }, token);

  if (r.erro) {
    console.error(`[frenet] NÃO COTOU para ${cepDestino}: ${r.erro}`);
    return { erro: "Não consegui calcular o frete agora. Tente de novo em instantes.", motivo: "frenet" };
  }

  // `ShippingSevicesArray` — a falta do "r" é da API. Se um dia consertarem, o
  // nome certo também é aceito e nada quebra em silêncio.
  const servicos = r.dados?.ShippingSevicesArray || r.dados?.ShippingServicesArray || [];
  if (!Array.isArray(servicos) || servicos.length === 0) {
    console.error(`[frenet] resposta SEM lista de serviços para ${cepDestino}: ${JSON.stringify(r.dados).slice(0, 400)}`);
    return { erro: "Não consegui calcular o frete agora. Tente de novo em instantes.", motivo: "resposta_vazia" };
  }

  // A Frenet devolve o serviço que NÃO atende DENTRO da lista (Error: true,
  // ShippingPrice 0), em vez de omitir. Sem este filtro, "CEP não atendido"
  // viraria uma opção de frete R$ 0,00 na tela — grátis por engano, no lugar
  // onde mais dói.
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
    console.warn(`[frenet] nenhuma transportadora atende ${cepDestino}. Recusas: ${recusados.join(" | ")}`);
    return {
      erro: "Nenhuma transportadora atende esse CEP. Confira o número ou fale com a gente.",
      motivo: "cep_sem_cobertura"
    };
  }

  if (recusados.length) {
    console.log(`[frenet] ${cepDestino}: ${opcoes.length} opção(ões), ${recusados.length} recusada(s) — ${recusados.join(" | ")}`);
  }

  return {
    cep: cepDestino,
    subtotalCentavos: valorDeclarado,
    opcoes,
    pacote: carrinho.lista.length === 1 ? carrinho.lista[0] : null,
    ...(r.retentou ? { retentou: true } : {})
  };
}
