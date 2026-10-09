// ============================================================
// email-fixtures.mjs — dados de teste dos e-mails do CLIENTE
// ============================================================
// Usado por `node scripts/i18n.mjs check|extract emails`: cada fixture monta
// um e-mail com dados falsos, o HTML é fatiado igual ao envio e cada pedaço de
// texto precisa de tradução em api/_lib/email-i18n-dict.js.
//
// Regras:
//   · texto livre (nome, negócio, código, texto de avaliação) vai como S("x")
//     → ⟦x⟧, que vira lacuna (.+?) no dicionário; número vira lacuna sozinho;
//   · objeto que um helper produz (meta, marco zero, score, marco redondo)
//     é produzido PELO helper — o português que ele escreve tem que aparecer
//     aqui literal, pra ser traduzido;
//   · um caso por RAMO que muda texto visível. Ramo novo de modelo = caso novo
//     aqui, senão a frase nova passa sem tradução e ninguém vê.
//
// Fora daqui de propósito (sempre em português): admin*, tipPreviewEmail,
// weeklyTipEmail e _lib/email-pro-menu.js.
// Sem env, sem rede.
// ============================================================
import {
  welcomeEmail, tapsHistoryNewsEmail, revendaNewsEmail,
  pedidoRecebidoEmail, pedidoAtualizadoEmail, pedidoConfirmadoEmail,
  businessLinkedEmail, firstDeviceEmail, firstReviewEmail,
  additionalDeviceEmail, deviceUnlinkedEmail,
  assinaturaRecusadaEmail, assinaturaCobradaEmail, testeTerminandoEmail, assinaturaEncerradaEmail,
  negativeReviewEmail, weeklyReportEmail, planoTrabalhoEmail,
  weeklyDigestEmail, pickWeeklyTip, emailScore, nextMilestone, latestArticle,
  montaMarcoZero, metaDeConcorrencia,
} from "../api/_lib/email-templates.js";

export const S = (k) => `⟦${k}⟧`;

const UNSUB = "https://startouch.com.br/api/unsub?t=teste";
const ANO = new Date().getUTCFullYear();
const DATA_ESTE_ANO = `${ANO}-09-09T12:00:00Z`;
const DATA_ANO_PASSADO = `${ANO - 1}-06-22T12:00:00Z`;

const fx = [];
const add = (name, render) => fx.push({ name, render });

// ── Boas-vindas e anúncios ─────────────────────────────────────────────
add("welcome", () => welcomeEmail({ userName: S("nome") }));
add("welcome:sem-nome", () => welcomeEmail({ userName: null }));
add("tapsHistoryNews", () => tapsHistoryNewsEmail({ userName: S("nome"), unsubUrl: UNSUB }));
add("tapsHistoryNews:sem-nome", () => tapsHistoryNewsEmail({ userName: null, unsubUrl: UNSUB }));
add("revendaNews", () => revendaNewsEmail({ userName: S("nome"), unsubUrl: UNSUB }));
add("revendaNews:sem-nome", () => revendaNewsEmail({ userName: null, unsubUrl: UNSUB }));

// ── Pedido ─────────────────────────────────────────────────────────────
const ITENS = [
  { nome: S("produto"), qtd: 2, subtotal: 9980 },
  { nome: null, qtd: 1, subtotal: 4990 },
];
add("pedidoRecebido:cartao", () => pedidoRecebidoEmail({ nome: S("nome"), ref: S("ref"), itens: ITENS, totalCentavos: 14970 }));
add("pedidoRecebido:cartao-revenda-sem-nome", () => pedidoRecebidoEmail({ nome: null, ref: S("ref"), itens: ITENS, totalCentavos: 89000, ehRevenda: true }));
add("pedidoRecebido:boleto", () => pedidoRecebidoEmail({ nome: S("nome"), ref: S("ref"), itens: ITENS, totalCentavos: 14970, boleto: { url: "https://pay.stripe.com/boleto/teste", numero: S("numero"), vence: "12/10/2026" } }));
add("pedidoRecebido:boleto-sem-vencimento", () => pedidoRecebidoEmail({ nome: S("nome"), ref: S("ref"), itens: ITENS, totalCentavos: 14970, boleto: { url: "https://pay.stripe.com/boleto/teste" } }));

add("pedidoAtualizado:em_producao", () => pedidoAtualizadoEmail({ nome: S("nome"), ref: S("ref"), estado: "em_producao" }));
add("pedidoAtualizado:em_producao-revenda", () => pedidoAtualizadoEmail({ nome: null, ref: S("ref"), estado: "em_producao", ehRevenda: true }));
add("pedidoAtualizado:postado", () => pedidoAtualizadoEmail({ nome: S("nome"), ref: S("ref"), estado: "postado", rastreio: S("rastreio"), transportadora: S("transportadora") }));
add("pedidoAtualizado:postado-sem-rastreio", () => pedidoAtualizadoEmail({ nome: S("nome"), ref: S("ref"), estado: "postado" }));
add("pedidoAtualizado:cancelado", () => pedidoAtualizadoEmail({ nome: S("nome"), ref: S("ref"), estado: "cancelado" }));

add("pedidoConfirmado", () => pedidoConfirmadoEmail({ nome: S("nome"), ref: S("ref"), totalCentavos: 14970 }));
add("pedidoConfirmado:revenda-sem-nome", () => pedidoConfirmadoEmail({ nome: null, ref: S("ref"), totalCentavos: 89000, ehRevenda: true }));

// ── Negócio e dispositivos ─────────────────────────────────────────────
add("businessLinked", () => businessLinkedEmail({ userName: S("nome"), bizName: S("negocio") }));
add("businessLinked:sem-nomes", () => businessLinkedEmail({ userName: null, bizName: null }));

add("firstDevice", () => firstDeviceEmail({ userName: S("nome"), bizName: S("negocio"), code: S("codigo"), channelName: S("apelido") }));
add("firstDevice:sem-apelido-sem-nomes", () => firstDeviceEmail({ userName: null, bizName: null, code: S("codigo") }));

add("firstReview", () => firstReviewEmail({ userName: S("nome"), bizName: S("negocio"), channelName: S("apelido") }));
add("firstReview:sem-apelido-sem-nomes", () => firstReviewEmail({ userName: null, bizName: null }));

for (const n of [2, 3, 5]) {
  add(`additionalDevice:${n}`, () => additionalDeviceEmail({ userName: S("nome"), bizName: S("negocio"), code: S("codigo"), channelName: S("apelido"), totalCount: n }));
}
add("additionalDevice:sem-apelido", () => additionalDeviceEmail({ userName: null, bizName: null, code: S("codigo"), totalCount: 2 }));

for (const pt of ["placa_balcao", "placa_mesa", "placa_parede", "pulseira_nfc", "cartao_nfc", null]) {
  add(`deviceUnlinked:${pt || "generico"}`, () => deviceUnlinkedEmail({ userName: S("nome"), bizName: S("negocio"), code: S("codigo"), channelName: S("apelido"), productType: pt }));
}
add("deviceUnlinked:sem-apelido-sem-nomes", () => deviceUnlinkedEmail({ userName: null, bizName: null, code: S("codigo"), productType: "cartao_nfc" }));

// ── Assinatura Pro ─────────────────────────────────────────────────────
for (const meio of ["card", "boleto", null]) {
  for (const link of [true, false]) {
    add(`assinaturaRecusada:${meio || "sem-meio"}:${link ? "fatura" : "painel"}`, () => assinaturaRecusadaEmail({
      userName: S("nome"), valorCentavos: 1990, meio, linkFatura: link ? "https://invoice.stripe.com/i/teste" : null,
    }));
  }
}
add("assinaturaRecusada:sem-nome-sem-valor", () => assinaturaRecusadaEmail({ userName: null }));

add("assinaturaCobrada:primeira", () => assinaturaCobradaEmail({ userName: S("nome"), valorCentavos: 1990, proximaCobranca: "2026-11-09T12:00:00Z", primeira: true }));
add("assinaturaCobrada:renovada", () => assinaturaCobradaEmail({ userName: S("nome"), valorCentavos: 1990, proximaCobranca: "2026-11-09T12:00:00Z" }));
add("assinaturaCobrada:sem-proxima", () => assinaturaCobradaEmail({ userName: null, valorCentavos: 1990 }));

for (const semCartao of [false, true]) {
  add(`testeTerminando:${semCartao ? "sem-cartao" : "com-cartao"}`, () => testeTerminandoEmail({ userName: S("nome"), valorCentavos: 1990, fimDoTeste: "2026-10-12T12:00:00Z", semCartao }));
  add(`testeTerminando:${semCartao ? "sem-cartao" : "com-cartao"}:sem-data`, () => testeTerminandoEmail({ userName: null, valorCentavos: 1990, fimDoTeste: null, semCartao }));
}

add("assinaturaEncerrada:fim", () => assinaturaEncerradaEmail({ userName: S("nome") }));
add("assinaturaEncerrada:falta-pagamento", () => assinaturaEncerradaEmail({ userName: S("nome"), porFaltaDePagamento: true }));
add("assinaturaEncerrada:teste-sem-cartao", () => assinaturaEncerradaEmail({ userName: null, fimDoTesteSemCartao: true }));

// ── Avaliação negativa ─────────────────────────────────────────────────
add("negativeReview", () => negativeReviewEmail({ bizName: S("negocio"), author: S("autor"), rating: 2, text: S("texto"), placeId: "ChIJteste" }));
add("negativeReview:sem-autor-sem-texto", () => negativeReviewEmail({ bizName: null, author: null, rating: 1, text: "", placeId: null }));

// ── Resumo semanal (Pro, legado) ───────────────────────────────────────
const wr = (o) => weeklyReportEmail({ bizName: S("negocio"), ratingNow: 4.6, ratingDelta: 0, reviewsDelta: 0, rankNow: 3, rankDelta: 0, total: 12, ...o });
add("weeklyReport:caiu-1-com-nome", () => wr({ rankDelta: -1, aheadName: S("concorrente"), ratingDelta: -0.1, reviewsDelta: 2 }));
add("weeklyReport:caiu-2-sem-nome", () => wr({ rankDelta: -2, reviewsDelta: -1 }));
add("weeklyReport:subiu-1", () => wr({ rankDelta: 1, ratingDelta: 0.2, reviewsDelta: 4 }));
add("weeklyReport:subiu-3", () => wr({ rankDelta: 3, reviewsDelta: 1 }));
add("weeklyReport:nota-caiu", () => wr({ ratingDelta: -0.2 }));
add("weeklyReport:estavel-sem-total", () => wr({ bizName: null, total: null }));

// ── Plano de trabalho ──────────────────────────────────────────────────
const item = { label: S("pendencia"), detail: S("detalhe") };
add("planoTrabalho:1", () => planoTrabalhoEmail({ empresa: S("empresa"), pendencias: 1, code: "abc", checklistItem: item, unsubUrl: UNSUB }));
add("planoTrabalho:2", () => planoTrabalhoEmail({ empresa: S("empresa"), pendencias: 2, code: "abc", checklistItem: { label: S("pendencia") }, unsubUrl: UNSUB }));
add("planoTrabalho:5", () => planoTrabalhoEmail({ empresa: S("empresa"), pendencias: 5, code: "abc", checklistItem: item, unsubUrl: UNSUB }));
add("planoTrabalho:sem-preview-sem-empresa", () => planoTrabalhoEmail({ empresa: null, pendencias: 3, code: "abc", unsubUrl: UNSUB }));

// ── Resumo semanal (digest, todos) ─────────────────────────────────────
// Base realista; cada caso muda só o ramo que interessa.
const REVIEWS = [
  { author: S("autor"), rating: 5, date: S("quando"), text: S("texto") },
  { author: null, rating: 4, date: S("quando"), text: "" },
];
const DISPOSITIVOS = [
  { nome: S("apelido1"), codigo: S("cod1"), toques: 12 },
  { nome: S("apelido2"), codigo: S("cod2"), toques: 7 },
  { nome: null, codigo: S("cod3"), toques: 3 },
  { nome: S("apelido4"), codigo: S("cod4"), toques: 0 },
];
const scoreDe = (o) => emailScore({ rating: 4.7, reviews: 150, gridAvg: 3, photo: true, phone: true, category: true, ...o });
const gridRow = (ranking, medidoEm = DATA_ESTE_ANO) => ({ ranking, total: ranking.length, medidoEm });
const concorrentes = (alvoReviews) => [
  { name: S("concorrente"), reviews: alvoReviews, is_me: false },
  { name: S("outro"), reviews: alvoReviews + 400, is_me: false },
  { name: S("negocio"), reviews: 40, is_me: true },
];

function digest(o = {}) {
  const total = o.total ?? 40;
  return weeklyDigestEmail({
    bizName: S("negocio"),
    rating: 4.7,
    total,
    newThisWeek: 3,
    novasAoMenos: false,
    recentReviews: REVIEWS,
    tip: pickWeeklyTip(0),
    score: scoreDe({}),
    milestone: nextMilestone(total),
    article: latestArticle(),
    unsubUrl: UNSUB,
    marcoZero: null,
    meta: null,
    taps7d: 22,
    porDispositivo: DISPOSITIVOS,
    temDispositivo: true,
    ...o,
  });
}

// Novas na semana e veredito (0, 1, 2, 3, 5 exatas; teto do Google = não conta)
for (const n of [0, 1, 2, 3, 5]) add(`digest:novas-${n}`, () => digest({ newThisWeek: n }));
add("digest:novas-sem-contagem", () => digest({ newThisWeek: 5, novasAoMenos: true }));

// Dispositivos: com toques (1 e muitos), lista longa, um zerado, vários zerados, sem toque, sem aparelho
add("digest:toque-1-um-dispositivo", () => digest({ taps7d: 1, porDispositivo: [{ nome: S("apelido1"), codigo: S("cod1"), toques: 1 }] }));
add("digest:dispositivos-lista-longa", () => digest({
  taps7d: 40,
  porDispositivo: Array.from({ length: 10 }, (_, i) => ({ nome: S(`apelido${i}`), codigo: S(`cod${i}`), toques: i < 7 ? 10 - i : 0 })),
}));
add("digest:dispositivos-zerado-1", () => digest({ porDispositivo: DISPOSITIVOS }));
add("digest:dispositivos-zerados-2", () => digest({ porDispositivo: [...DISPOSITIVOS, { nome: S("apelido5"), codigo: S("cod5"), toques: 0 }] }));
add("digest:dispositivo-sem-toque", () => digest({ taps7d: 0, porDispositivo: [] }));
add("digest:sem-dispositivo", () => digest({ temDispositivo: false, taps7d: 0, porDispositivo: [] }));

// Meta de concorrência (via helper) e marco redondo de reserva
add("digest:meta-lidera", () => digest({ meta: metaDeConcorrencia(gridRow([{ name: S("outro"), reviews: 10, is_me: false }, { name: S("negocio"), reviews: 40, is_me: true }]), 40) }));
add("digest:meta-lidera-ano-passado", () => digest({ meta: metaDeConcorrencia(gridRow([{ name: S("outro"), reviews: 10, is_me: false }], DATA_ANO_PASSADO), 40) }));
add("digest:meta-lidera-sem-data", () => digest({ meta: metaDeConcorrencia({ ranking: [{ name: S("outro"), reviews: 10 }], total: 8 }, 40) }));
add("digest:meta-faltam-1", () => digest({ meta: metaDeConcorrencia(gridRow(concorrentes(41)), 40) }));
add("digest:meta-faltam-3", () => digest({ meta: metaDeConcorrencia(gridRow(concorrentes(43)), 40) }));
add("digest:meta-faltam-semanas", () => digest({ meta: metaDeConcorrencia(gridRow(concorrentes(52)), 40) }));
add("digest:meta-faltam-muitas", () => digest({ meta: metaDeConcorrencia(gridRow(concorrentes(400)), 40) }));
add("digest:meta-sem-nome-do-alvo", () => digest({ meta: metaDeConcorrencia(gridRow([{ reviews: 52, is_me: false }]), 40) }));
add("digest:marco-redondo-falta-1", () => digest({ total: 9, milestone: nextMilestone(9) }));
add("digest:marco-redondo-grande", () => digest({ total: 14811, milestone: nextMilestone(14811) }));

// Marco zero (via helper): "instalou" x "entrou", 1 x várias, ano corrente x passado
add("digest:marco-zero-instalacao", () => digest({ total: 52, marcoZero: montaMarcoZero({ total_reviews: 40, rating: 4.7, created_at: DATA_ESTE_ANO }, DATA_ESTE_ANO) }));
add("digest:marco-zero-conta", () => digest({ total: 52, marcoZero: montaMarcoZero({ total_reviews: 40, rating: 4.7, created_at: DATA_ESTE_ANO }, `${ANO}-10-01T12:00:00Z`) }));
add("digest:marco-zero-1-ano-passado", () => digest({ total: 52, marcoZero: montaMarcoZero({ total_reviews: 1, rating: 5, created_at: DATA_ANO_PASSADO }, null) }));

// Score: cada primeiro conselho possível (via emailScore) + perfil completo + sem score
add("digest:score-fora-das-buscas", () => digest({ score: scoreDe({ gridAvg: null, gridSemCobertura: true }) }));
add("digest:score-ausente-1-ponto", () => digest({ score: scoreDe({ gridCobertura: 4, gridMedidos: 5 }) }));
add("digest:score-ausente-varios-pontos", () => digest({ score: scoreDe({ gridCobertura: 2, gridMedidos: 5 }) }));
for (const [photo, phone, category] of [
  [false, true, true], [true, false, true], [true, true, false],
  [false, false, true], [false, true, false], [true, false, false], [false, false, false],
]) {
  add(`digest:score-perfil-${+photo}${+phone}${+category}`, () => digest({ score: scoreDe({ photo, phone, category }) }));
}
add("digest:score-colete-avaliacoes", () => digest({ score: scoreDe({ reviews: 40 }) }));
add("digest:score-completo", () => digest({ score: scoreDe({}) }));
add("digest:sem-score-sem-avaliacoes-recentes", () => digest({ score: null, recentReviews: [] }));

// Sem nome do negócio ("seu negócio") e sem nota. (O corte da avaliação longa
// em 160 só acrescenta "…", que não tem texto a traduzir.)
// Sem toque, pra o banner do Menu não sair com a inicial "S" solta como texto.
add("digest:sem-nome-sem-nota", () => digest({ bizName: null, rating: null, taps7d: 0 }));

export default fx;
