// ============================================================
// StarTouch — Ciclo de vida do pedido
// ============================================================
// FUNÇÕES PURAS: recebem estado e devolvem se a virada é permitida. Sem banco,
// sem rede — dá pra testar todas as combinações, que é o que impede a tela de
// admin de virar um campo de texto livre onde qualquer palavra entra.
//
// Nasceu em 15/09/2026, quando o primeiro revendedor perguntou onde acompanhava
// o pedido e a resposta era "em lugar nenhum": o pedido só conhecia `pending` e
// `paid`, e nenhuma das sete telas de /admin era de vendas.
// ============================================================

export const ESTADOS = ["pending", "paid", "em_producao", "postado", "entregue", "cancelado"];

export const ROTULO = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  em_producao: "Em produção",
  postado: "Postado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

// O que o CLIENTE lê. Diferente do rótulo do admin de propósito: "Pago" não
// diz nada pra quem está esperando uma caixa chegar.
export const ROTULO_CLIENTE = {
  pending: "Aguardando pagamento",
  paid: "Pagamento confirmado — entrando na fila de produção",
  em_producao: "Em produção",
  postado: "A caminho",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

// ============================================================
// `paid` NÃO ESTÁ EM NENHUMA LISTA DE DESTINO. É a trava principal.
// ============================================================
// Quem diz que um pedido foi pago é o webhook do provedor, olhando o dinheiro.
// Se a tela de admin pudesse marcar "pago", bastaria um clique errado num dia
// corrido pra despachar produto não pago — e o pior: o sistema passaria a
// concordar com o erro, porque `paid` é o que dispara e-mail de confirmação,
// aviso ao admin e a conversão no GA4.
//
// Um boleto que compensou vira `paid` sozinho, pelo `async_payment_succeeded`.
// Se não virou, o lugar de investigar é o Stripe, não este campo.
// ============================================================
// "Entregue" SAI DE QUALQUER ESTADO PAGO, e não só de `postado` (18/09/2026).
// ============================================================
// O caminho bonito é paid → em_producao → postado → entregue. Mas `postado`
// EXIGE código de rastreio, e um pedido já entregue por fora do sistema — o
// cliente que buscou na mão, a entrega local, o pedido despachado antes desta
// tela existir — não tem código nenhum pra informar.
//
// Sem a saída direta, dar baixa nesse pedido exigiria passar por `postado`
// inventando um código. Isso é pior que o atalho por dois motivos: grava um
// rastreio falso em `tracking_code`, onde ele vira verdade pra quem olhar
// depois, e dispara pro cliente um e-mail "A caminho 📦" de uma caixa que ele
// JÁ TEM na mão.
//
// `pending` continua sem essa saída: pedido não pago não se entrega. E o atalho
// pede confirmação na tela, porque pular a etapa de envio é a exceção, não o
// caminho — quem clica precisa ter percebido que está pulando.
export const TRANSICOES = {
  pending:     ["cancelado"],
  paid:        ["em_producao", "postado", "entregue", "cancelado"],
  em_producao: ["postado", "entregue", "cancelado"],
  postado:     ["entregue"],
  entregue:    [],
  cancelado:   [],
};

/**
 * A virada PULA a etapa de envio? Serve pra tela pedir confirmação só no
 * atalho, e não em todo clique — confirmação que aparece sempre é confirmação
 * que ninguém lê.
 */
export function pulaEnvio(atual, destino) {
  return destino === "entregue" && atual !== "postado";
}

/** Só o que o admin pode escolher a partir do estado atual. */
export function destinosPossiveis(atual) {
  return TRANSICOES[atual] ? [...TRANSICOES[atual]] : [];
}

/**
 * `postado` sem código de rastreio é a mesma coisa que não postar, do ponto de
 * vista de quem espera: o cliente recebe "a caminho" e não tem o que fazer com
 * essa informação. Então o código é obrigatório na virada.
 */
export function exigeRastreio(destino) {
  return destino === "postado";
}

/**
 * @returns {{ok: true} | {ok: false, erro: string}}
 */
export function validaTransicao(atual, destino, { rastreio } = {}) {
  if (!ESTADOS.includes(destino)) return { ok: false, erro: `estado desconhecido: "${destino}"` };
  if (!ESTADOS.includes(atual)) return { ok: false, erro: `pedido em estado desconhecido: "${atual}"` };
  if (atual === destino) return { ok: false, erro: "o pedido já está nesse estado" };
  if (destino === "paid") {
    return { ok: false, erro: "pagamento só é confirmado pelo provedor, nunca à mão" };
  }
  if (!destinosPossiveis(atual).includes(destino)) {
    return { ok: false, erro: `não dá pra ir de "${ROTULO[atual]}" para "${ROTULO[destino]}"` };
  }
  if (exigeRastreio(destino) && !String(rastreio || "").trim()) {
    return { ok: false, erro: "informe o código de rastreio para marcar como postado" };
  }
  return { ok: true };
}

/**
 * Os campos a gravar na virada. Carimba o momento — sem isso "quantos dias
 * entre pagar e postar" não tem resposta, e essa é a única pergunta que a
 * operação realmente faz.
 */
export function camposDaTransicao(destino, { rastreio, quem } = {}) {
  const agora = new Date().toISOString();
  const patch = { status: destino, status_updated_at: agora, status_updated_by: quem || null };
  if (destino === "em_producao") patch.production_started_at = agora;
  if (destino === "postado") {
    patch.shipped_at = agora;
    patch.tracking_code = String(rastreio || "").trim().toUpperCase();
  }
  if (destino === "entregue") patch.delivered_at = agora;
  if (destino === "cancelado") patch.cancelled_at = agora;
  return patch;
}

/** Estados em que o pedido ainda pede alguma ação nossa. */
export const EM_ABERTO = new Set(["paid", "em_producao", "postado"]);
