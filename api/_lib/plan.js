// ============================================================
// StarTouch — Resolvedor de plano (fonte única da verdade)
// ============================================================
// POR QUÊ ESTE ARQUIVO EXISTE
//
// Hoje quem decide se alguém é Free ou Pro é uma função dentro do painel, no
// NAVEGADOR (src/AppV2.jsx, getPlan). Enquanto tudo era free isso não custava
// nada. Com trial de 14 dias e com regra de rebaixamento, custa: regra que mora
// no navegador é regra que o navegador pode contar diferente.
//
// A partir daqui a decisão é UMA, no servidor, e todo mundo pergunta pra ela:
// a tela (pra mostrar), o publicador (pra imprimir a camada servida) e a
// varredura diária (pra reimprimir quando o plano muda). Se a regra viver em
// dois lugares, um dia eles discordam — e o dia em que discordarem é o dia em
// que alguém sem assinatura serve um Menu, ou alguém pagando serve o Google.
//
// Tudo aqui é FUNÇÃO PURA: não toca banco, não faz rede, não tem efeito
// colateral. Recebe a linha de `businesses` e devolve a conclusão. Quem lê o
// banco é quem chama.
// ============================================================

export const PLANO = {
  FREE:  "free",
  TRIAL: "trial",
  PRO:   "pro"
};

export const TRIAL_DIAS = 14;

// Mesma lista dos outros arquivos (api/admin.js, api/plates.js). Ainda
// hardcoded — evoluir pra profiles.is_admin é dívida conhecida, não desta fase.
const ADMIN_EMAILS = new Set(["ricardo.fiorini@gmail.com"]);

// Quantos dias depois da próxima cobrança prevista a assinatura vira suspeita.
// NÃO derruba ninguém (ver nota em `atencao`), só acende a luz.
const GRACA_DIAS = 7;

const DIA_MS = 24 * 60 * 60 * 1000;

function paraData(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Decide o plano efetivo de um negócio.
 *
 * @param {object|null} business  linha da tabela `businesses`
 * @param {string|null} userEmail email do usuário logado (pro override de admin)
 * @param {Date}        agora     injetável pra teste
 * @returns {{
 *   plano: 'free'|'trial'|'pro',
 *   proAtivo: boolean,
 *   fonte: 'admin'|'assinatura'|'trial'|'padrao',
 *   trialTerminaEm: string|null,
 *   trialDiasRestantes: number|null,
 *   assinaturaAte: string|null,
 *   atencao: string|null
 * }}
 */
export function resolvePlano(business, userEmail = null, agora = new Date()) {
  const base = {
    plano: PLANO.FREE,
    proAtivo: false,
    fonte: "padrao",
    trialTerminaEm: null,
    trialDiasRestantes: null,
    assinaturaAte: null,
    atencao: null
  };

  // 1. Admin enxerga tudo como Pro. Mantém o comportamento que já existe hoje
  //    no painel e no backend — não é privilégio novo, é o mesmo.
  const email = (userEmail || "").toLowerCase().trim();
  if (email && ADMIN_EMAILS.has(email)) {
    return { ...base, plano: PLANO.PRO, proAtivo: true, fonte: "admin" };
  }

  if (!business) return base;

  const fimAssinatura = paraData(business.stripe_current_period_end);
  const fimTrial = paraData(business.trial_ends_at);

  // 2. Assinatura. `businesses.plan` é escrito pelo webhook do Mercado Pago
  //    (api/billing.js): 'pro' quando o status é `authorized`, 'free' em
  //    pending/paused/cancelled. Ele é a verdade.
  if (business.plan === "pro") {
    // A data de próxima cobrança NÃO rebaixa ninguém sozinha, de propósito.
    // Ela é `next_payment_date` do MP: se um webhook não chegar, ela envelhece
    // sem que o cliente tenha feito nada de errado. Derrubar um assinante por
    // causa de um webhook perdido é pior do que o problema que isso evitaria.
    // Então: mantém o Pro e acende a luz, que é a regra da casa — não falhar
    // calado, e também não gritar à toa.
    let atencao = null;
    if (fimAssinatura && agora.getTime() - fimAssinatura.getTime() > GRACA_DIAS * DIA_MS) {
      atencao = "assinatura_vencida_sem_webhook";
    }
    return {
      ...base,
      plano: PLANO.PRO,
      proAtivo: true,
      fonte: "assinatura",
      assinaturaAte: fimAssinatura ? fimAssinatura.toISOString() : null,
      atencao
    };
  }

  // 3. Trial de 14 dias. Vale enquanto a data não passou. O vencimento é
  //    aplicado pela varredura DIÁRIA, então na prática pode sobrar até 24h de
  //    Pro — erro a favor do cliente, escolhido pra manter verificação de plano
  //    fora do caminho do toque. (Decisão aprovada em 29/08/2026.)
  if (fimTrial && fimTrial.getTime() > agora.getTime()) {
    const restantes = Math.max(0, Math.ceil((fimTrial.getTime() - agora.getTime()) / DIA_MS));
    return {
      ...base,
      plano: PLANO.TRIAL,
      proAtivo: true,
      fonte: "trial",
      trialTerminaEm: fimTrial.toISOString(),
      trialDiasRestantes: restantes
    };
  }

  // 4. Free. Trial já vencido volta como informação (a tela usa pra dizer
  //    "seu teste terminou" em vez de fingir que nunca existiu).
  return {
    ...base,
    trialTerminaEm: fimTrial ? fimTrial.toISOString() : null,
    trialDiasRestantes: fimTrial ? 0 : null
  };
}

/** Atalho de leitura: o Menu Inteligente é o benefício Pro do lançamento. */
export function podeUsarMenu(resolucao) {
  return !!resolucao?.proAtivo;
}

// ============================================================
// A REGRA DA IMPRESSÃO (camada 1 → camada 2)
// ============================================================
// Esta é a única função que decide o que um dispositivo serve. Ela mora aqui,
// junto do plano, porque plano e modo servido são a mesma decisão vista de dois
// ângulos — separar os dois é criar a chance de discordarem.
//
// Ela NÃO escreve nada e NÃO recebe nada além de dados: quem grava é o
// publicador (Fase 2) e a varredura diária. Por construção, não existe caminho
// daqui pra dentro de `experiences` — é assim que o manuscrito fica intocável.
//
// @param {object|null} experiencia linha de `experiences` (ou null: sem experiência)
// @param {object} resolucao        saída de resolvePlano()
// @returns {{ served_mode, served_slug, served_reason }}
export function decidirServido(experiencia, resolucao) {
  const GOOGLE = (motivo) => ({
    served_mode: "google_direto",
    served_slug: null,
    served_reason: motivo
  });

  // Sem experiência vinculada: o padrão de fábrica de todo dispositivo novo.
  if (!experiencia) return GOOGLE("padrao");

  // Arquivada pelo lojista. A linha continua no banco (nunca apagamos), mas
  // deixa de ser servida.
  if (experiencia.archived_at) return GOOGLE("experiencia_removida");

  // Nunca publicada, ou publicada como Google Direto: o rascunho não vai ao ar.
  if (!experiencia.published || experiencia.published_mode !== "menu") {
    return GOOGLE("padrao");
  }

  // Tem Menu publicado, mas o Pro não está ativo (cancelou, pausou, trial
  // venceu). O manuscrito continua exatamente onde está; só a placa da porta
  // muda — e o motivo fica gravado pro painel explicar em vez de o cliente
  // achar que perdeu a configuração.
  if (!resolucao?.proAtivo) return GOOGLE("rebaixado_plano");

  return {
    served_mode: "menu",
    served_slug: experiencia.slug,
    served_reason: "publicado"
  };
}

// Texto que o painel mostra pro gestor. Fica aqui pra que o motivo gravado e a
// explicação exibida nunca saiam de sincronia.
export const MOTIVO_SERVIDO = {
  padrao:               "Este dispositivo leva direto ao Google.",
  publicado:            "Servindo a experiência publicada.",
  rebaixado_plano:      "Sua experiência está guardada. Enquanto o Pro estiver inativo, seus dispositivos levam direto ao Google.",
  experiencia_removida: "A experiência foi arquivada. Este dispositivo voltou a levar direto ao Google."
};
