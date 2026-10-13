// ============================================================
// Frete INTERNACIONAL — tabela própria, sem cotação online (13/10/2026)
// ============================================================
// O Brasil cota pela Frenet (`_lib/frenet.js`). Pra fora do Brasil não há
// cotador: o que existe é a TABELA que a DHL entregou à ZAYOR (PDF de
// 13/10/2026, código de tarifa BRC01MRCF–BRB01KRDI, "DHL Express Worldwide
// Export", Não Documentos). Ela está transcrita aqui e o preço sai de conta,
// não de chamada a ninguém.
//
// FEITO PRA RECEBER OUTRAS MODALIDADES. O Ricardo vai procurar opções mais
// baratas (Correios, etc.). Cada uma entra como mais um item em `MODALIDADES`
// com a mesma assinatura `cota(peso, pais)`; a tela já mostra uma lista.
//
// O QUE A CONTA COBRE E O QUE NÃO COBRE — escrito pra ninguém achar que o
// número é exato:
//   cobre:  tarifa da zona × (1 − desconto), endereço residencial (US$ 6,
//           cobrado sempre, porque não dá pra saber se a entrega é numa casa),
//           taxa de combustível sobre tudo isso, dólar PTAX do dia + folga.
//   NÃO cobre: área remota (US$ 0,60/kg, mín. US$ 30 — só a DHL sabe se o
//           endereço é remoto), impostos de importação (por conta de quem
//           recebe, e a tela diz isso), sobretaxa de alta demanda.
// A folga do câmbio existe também pra absorver parte disso.
//
// VALIDADE: a DHL reajusta em 1º de janeiro. Tabela nova = trocar `TARIFA`
// e `INCREMENTO` abaixo no mesmo commit em que o PDF novo chegar.

import { montaCarrinho } from "./frenet.js";

// ── Premissas que mudam sem a tabela mudar ───────────────────────
// Ficam em variável de ambiente pra trocar sem deploy. Os padrões são o lado
// SEGURO de cada uma: errar pra cima cobra um pouco a mais do cliente; errar
// pra baixo é prejuízo em todo pedido, calado.
//
// DESCONTO: o PDF diz "Customer Specific" e usa 53% só de exemplo. 50% é o
// piso da tabela de desconto dinâmico (faixa de menor volume), então é o que
// vale com certeza depois dos 6 meses iniciais.
const DESCONTO_PADRAO = 0.50;
// COMBUSTÍVEL: muda todo mês e não está no PDF (fica no MyDHL+ → Sobretaxas).
const COMBUSTIVEL_PADRAO = 0.35;
// Folga sobre o dólar: a DHL fatura pelo PTAX do último dia do mês anterior,
// e a gente cota pelo de hoje. Mais as taxas que a conta não enxerga.
const FOLGA_CAMBIO = 0.05;
const RESIDENCIAL_USD = 6.00;
// Tara da caixa/envelope da DHL, somada ao peso dos produtos.
const TARA_KG = 0.10;
// Divisor do peso volumétrico da DHL Express (C×L×A em cm ÷ 5000).
const DIVISOR_VOLUMETRICO = 5000;
// Acima disto é pedido de revenda, cotado à mão.
const PESO_MAXIMO_KG = 30;

function premissa(nome, padrao) {
  const v = parseFloat(String(process.env[nome] ?? "").replace(",", "."));
  if (Number.isFinite(v) && v >= 0 && v < 1) return { valor: v, padrao: false };
  return { valor: padrao, padrao: true };
}

// Avisa UMA vez por instância quando está rodando no padrão — regra do projeto:
// proteção que não prova que está ligada é falha silenciosa esperando acontecer.
let avisouPadrao = false;
function premissas() {
  const desconto = premissa("DHL_DESCONTO", DESCONTO_PADRAO);
  const combustivel = premissa("DHL_COMBUSTIVEL", COMBUSTIVEL_PADRAO);
  if (!avisouPadrao && (desconto.padrao || combustivel.padrao)) {
    avisouPadrao = true;
    console.warn(`[frete-internacional] usando premissa PADRÃO — ` +
      `${desconto.padrao ? `DHL_DESCONTO=${DESCONTO_PADRAO} ` : ""}` +
      `${combustivel.padrao ? `DHL_COMBUSTIVEL=${COMBUSTIVEL_PADRAO}` : ""}. ` +
      `Configure na Vercel com os números reais do MyDHL+.`);
  }
  return { desconto: desconto.valor, combustivel: combustivel.valor };
}

// ── Zonas (página 4 do PDF) ──────────────────────────────────────
// Códigos ISO. Onde a DHL usa código próprio, convertido: Bonaire XB→BQ,
// Curaçao XC→CW, St. Maarten XM→SX, St. Barthélemy XY→BL, Kosovo KV→XK.
// Ficaram de fora St. Eustatius (XE), Nevis (XN), Somalilândia (XS) e as
// Canárias (IC), que não têm código ISO próprio.
export const ZONA_DHL = {
  AF:7, AL:6, DZ:7, AS:7, AD:4, AO:7, AI:3, AG:3, AR:1, AM:6, AW:3, AU:5, AT:4,
  AZ:6, BS:3, BH:6, BD:6, BB:3, BY:7, BE:4, BZ:3, BJ:7, BM:3, BT:7, BO:3, BQ:3,
  BA:6, BW:7, BN:6, BG:4, BF:7, BI:7, KH:6, CM:7, CA:2, CV:7, KY:3, CF:7, TD:7,
  CL:1, CN:5, CO:3, KM:7, CG:7, CD:7, CK:7, CR:3, CI:7, HR:4, CU:3, CW:3, CY:4,
  CZ:4, DK:4, DJ:7, DM:3, DO:3, EC:3, EG:6, SV:3, ER:7, EE:4, SZ:7, ET:7, FK:6,
  FO:6, FJ:7, FI:4, FR:4, GF:3, GA:7, GM:7, GE:6, DE:4, GH:7, GI:4, GR:4, GL:6,
  GD:3, GP:3, GU:7, GT:3, GG:6, GN:7, GW:7, GQ:7, GY:3, HT:3, HN:3, HK:5, HU:4,
  IS:4, IN:6, ID:5, IR:7, IQ:7, IE:4, IL:6, IT:4, JM:3, JP:5, JE:6, JO:7, KZ:7,
  KE:7, KI:7, KR:5, KP:7, XK:6, KW:6, KG:7, LA:6, LV:4, LB:7, LS:7, LR:7, LY:7,
  LI:4, LT:4, LU:4, MO:5, MG:7, MW:7, MY:5, MV:7, ML:7, MT:4, MH:7, MQ:3, MR:7,
  MU:7, YT:7, MX:3, FM:7, MD:6, MC:4, MN:7, ME:6, MS:3, MA:7, MZ:7, MM:7, NA:7,
  NR:7, NP:5, NL:4, NC:7, NZ:6, NI:3, NE:7, NG:7, NU:7, MK:6, MP:7, NO:4, OM:6,
  PK:6, PW:7, PA:3, PG:5, PY:1, PE:3, PH:5, PL:4, PT:4, PR:3, QA:6, RE:7, RO:4,
  RU:7, RW:7, SH:7, WS:7, SM:4, ST:7, SA:6, SN:7, RS:6, SC:7, SL:7, SG:5, SK:4,
  SI:4, SB:7, SO:7, ZA:7, SS:7, ES:4, LK:6, BL:3, KN:3, LC:3, SX:3, VC:3, SD:7,
  SR:3, SE:4, CH:4, SY:7, PF:7, TW:5, TJ:7, TZ:7, TH:5, TL:7, TG:7, TO:7, TT:3,
  TN:7, TR:6, TM:7, TC:3, TV:7, US:2, UG:7, UA:7, AE:6, GB:4, UY:1, UZ:7, VU:7,
  VA:4, VE:3, VN:6, VG:3, VI:3, YE:7, ZM:7, ZW:7
};

// Não vendemos pra estes: sanção, guerra ou o que a DHL cobra como "risco
// elevado"/"destino restrito" (US$ 37,50 a mais, fora da conta acima). Lista
// curta e de propósito conservadora — tirar um país daqui é decisão, não ajuste.
const BLOQUEADOS = new Set([
  "AF", "BY", "CF", "CD", "CU", "IR", "IQ", "KP", "LY", "ML", "MM", "RU",
  "SD", "SO", "SS", "SY", "UA", "VE", "YE"
]);

export const PAISES_ATENDIDOS = Object.keys(ZONA_DHL).filter((p) => !BLOQUEADOS.has(p)).sort();

// ── Tarifa pública em USD (página 3, "Não Documentos") ───────────
// Linha = peso de 0,5 em 0,5 kg até 10 kg; coluna = zona 1..7.
const TARIFA = [
  [ 91.00,  98.20, 109.00, 116.00, 124.50, 180.00, 224.00], // 0.5
  [105.00, 113.60, 125.00, 134.00, 143.50, 204.50, 259.00], // 1.0
  [119.00, 128.70, 141.00, 152.00, 162.50, 229.00, 294.00], // 1.5
  [133.00, 143.80, 157.00, 170.00, 181.50, 253.50, 329.00], // 2.0
  [147.00, 158.80, 173.00, 188.00, 201.00, 278.00, 364.00], // 2.5
  [161.00, 174.30, 189.00, 206.00, 220.50, 302.50, 399.00], // 3.0
  [175.00, 189.80, 205.00, 224.00, 240.00, 327.00, 434.00], // 3.5
  [189.00, 205.30, 221.00, 242.00, 259.50, 351.50, 469.00], // 4.0
  [203.00, 220.80, 237.00, 260.00, 279.00, 376.00, 504.00], // 4.5
  [217.00, 236.30, 253.00, 278.00, 298.50, 400.50, 539.00], // 5.0
  [231.50, 251.70, 269.00, 295.00, 319.50, 427.00, 573.50], // 5.5
  [246.00, 267.10, 285.00, 312.00, 340.50, 453.50, 608.00], // 6.0
  [260.50, 282.50, 301.00, 329.00, 361.50, 480.00, 642.50], // 6.5
  [275.00, 297.90, 317.00, 346.00, 382.50, 506.50, 677.00], // 7.0
  [289.50, 313.30, 333.00, 363.00, 403.50, 533.00, 711.50], // 7.5
  [304.00, 328.70, 349.00, 380.00, 424.50, 559.50, 746.00], // 8.0
  [318.50, 344.10, 365.00, 397.00, 445.50, 586.00, 780.50], // 8.5
  [333.00, 359.50, 381.00, 414.00, 466.50, 612.50, 815.00], // 9.0
  [347.50, 374.90, 397.00, 431.00, 487.50, 639.00, 849.50], // 9.5
  [362.00, 390.30, 413.00, 448.00, 508.50, 665.50, 884.00], // 10.0
];
// Acréscimo por 0,5 kg acima de 10 kg. O PDF também lista 11, 12… 30 kg, e
// todos batem com "10 kg + incrementos" — conferido nas zonas 1, 2 e 6.
const INCREMENTO = {
  ate20: [10.00, 11.90, 16.00, 17.00, 21.50, 22.00, 34.50], // 10,1 a 20 kg
  ate30: [10.50, 11.30, 16.00, 17.50, 21.50, 21.50, 34.50], // 20,1 a 30 kg
};

/** Tarifa pública em USD pra um peso já arredondado pra cima em 0,5 kg. */
export function tarifaPublica(pesoKg, zona) {
  const z = zona - 1;
  if (pesoKg <= 10) return TARIFA[Math.round(pesoKg / 0.5) - 1][z];
  const passos20 = Math.min(pesoKg, 20) - 10;
  const passos30 = Math.max(pesoKg - 20, 0);
  return TARIFA[19][z] + (passos20 / 0.5) * INCREMENTO.ate20[z] + (passos30 / 0.5) * INCREMENTO.ate30[z];
}

// ── Dólar ────────────────────────────────────────────────────────
// PTAX de venda do Banco Central — é o índice que a própria DHL usa pra
// converter a fatura. API pública, sem chave. Guardado por 6 horas na
// instância; se o BC cair, vale o último bom. Sem nenhum, a cotação PARA:
// inventar um dólar seria cobrar um número que ninguém conferiu.
const DOLAR_TTL_MS = 6 * 60 * 60 * 1000;
let dolarCache = null; // { valor, data, em }

function dataBC(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}-${d.getUTCFullYear()}`;
}

export async function dolarPtax() {
  if (dolarCache && Date.now() - dolarCache.em < DOLAR_TTL_MS) return dolarCache;
  const fim = new Date();
  const ini = new Date(fim.getTime() - 10 * 24 * 60 * 60 * 1000); // cobre feriado longo
  const url = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/" +
    "CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)" +
    `?@dataInicial='${dataBC(ini)}'&@dataFinalCotacao='${dataBC(fim)}'` +
    "&$top=100&$format=json&$select=cotacaoVenda,dataHoraCotacao";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const lista = (await r.json())?.value || [];
    const ultimo = lista[lista.length - 1];
    const valor = Number(ultimo?.cotacaoVenda);
    if (!Number.isFinite(valor) || valor <= 0) throw new Error("resposta sem cotação");
    dolarCache = { valor, data: String(ultimo.dataHoraCotacao || "").slice(0, 10), em: Date.now() };
    return dolarCache;
  } catch (e) {
    if (dolarCache) {
      console.warn(`[frete-internacional] PTAX falhou (${e?.message || e}) — usando a de ${dolarCache.data}`);
      return dolarCache;
    }
    console.error(`[frete-internacional] PTAX falhou e não há cotação guardada: ${e?.message || e}`);
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ── Peso cobrado ─────────────────────────────────────────────────
// Pedido internacional sai numa caixa só (é uma remessa DHL só), então usa o
// modelo de caixa consolidada da revenda. A DHL cobra o MAIOR entre o peso
// real e o volumétrico, arredondado pra cima em 0,5 kg.
export function pesoCobrado(items) {
  const carrinho = montaCarrinho(items, { modo: "consolidado", maxQtd: 99 });
  if (carrinho.erro) return { erro: carrinho.erro };
  const cx = carrinho.lista[0];
  const real = cx.Weight + TARA_KG;
  const volumetrico = (cx.Length * cx.Width * cx.Height) / DIVISOR_VOLUMETRICO;
  const peso = Math.max(0.5, Math.ceil(Math.max(real, volumetrico) / 0.5) * 0.5);
  return { peso, real: Math.round(real * 1000) / 1000, volumetrico: Math.round(volumetrico * 1000) / 1000,
           valorCentavos: carrinho.valorCentavos };
}

// ── Modalidades ──────────────────────────────────────────────────
const MODALIDADES = [
  {
    codigo: "dhl_express",
    transportadora: "DHL",
    servico: "Express Worldwide",
    // Prazo de porta a porta que a DHL costuma cumprir do Brasil, depois da
    // postagem. Estimativa — a DHL não publica prazo por país nesta tabela.
    // A tela do /kit escreve o mesmo texto por conta própria (pra entrar na
    // tradução): mudou aqui, muda lá.
    prazo: "3 a 7 dias úteis",
    atende: (pais) => !!ZONA_DHL[pais] && !BLOQUEADOS.has(pais),
    custoUsd(peso, pais) {
      const { desconto, combustivel } = premissas();
      const tarifa = tarifaPublica(peso, ZONA_DHL[pais]);
      return (tarifa * (1 - desconto) + RESIDENCIAL_USD) * (1 + combustivel);
    },
  },
];

/**
 * Cota o frete internacional. Devolve `{ pais, opcoes, peso }` ou
 * `{ erro, motivo }` — mesmo contrato do `cotaFrete` da Frenet, pra o
 * checkout tratar os dois do mesmo jeito.
 */
export async function cotaInternacional({ pais, items }) {
  const p = String(pais || "").toUpperCase().trim();
  if (!/^[A-Z]{2}$/.test(p) || p === "BR") return { erro: "País inválido.", motivo: "pais" };

  const modalidades = MODALIDADES.filter((m) => m.atende(p));
  if (modalidades.length === 0) {
    return { erro: "Ainda não entregamos nesse país. Fale com a gente pelo WhatsApp.", motivo: "pais_sem_cobertura" };
  }

  const pc = pesoCobrado(items);
  if (pc.erro) return { erro: pc.erro, motivo: "carrinho" };
  if (pc.peso > PESO_MAXIMO_KG) {
    return { erro: "Pedido grande demais pro envio padrão. Fale com a gente pra cotar à parte.", motivo: "peso" };
  }

  const dolar = await dolarPtax();
  if (!dolar) return { erro: "Não consegui calcular o frete internacional agora. Tente de novo em instantes.", motivo: "cambio" };

  const cambio = dolar.valor * (1 + FOLGA_CAMBIO);
  const opcoes = modalidades.map((m) => {
    const usd = m.custoUsd(pc.peso, p);
    return {
      codigo: m.codigo,
      transportadora: m.transportadora,
      servico: m.servico,
      // Arredonda pra cima no real inteiro: centavo quebrado em frete parece
      // conta de padaria e não protege ninguém.
      precoCentavos: Math.ceil(usd * cambio) * 100,
      prazoDias: null,
      prazoTexto: m.prazo,
      internacional: true,
    };
  }).sort((a, b) => a.precoCentavos - b.precoCentavos);

  return {
    pais: p,
    subtotalCentavos: pc.valorCentavos,
    opcoes,
    peso: { cobrado: pc.peso, real: pc.real, volumetrico: pc.volumetrico },
    dolar: { ptax: dolar.valor, data: dolar.data },
  };
}
