// ============================================================
// StarTouch V3 — Score StarTouch: a MONTAGEM dos ingredientes
// ============================================================
// A CONTA não mora aqui. Ela mora em `api/_lib/score-core.js`, que é um módulo
// puro (sem Node, sem React) escrito exatamente pra ser carregado pelo painel e
// pelo servidor sem adaptação. Aqui só se traduz o formato de dados do V3 para
// os parâmetros que ela espera.
//
// POR QUE ISSO IMPORTA: em 02/08/2026 a fórmula existia duplicada — painel e
// e-mail semanal — e o mesmo negócio, no mesmo dia, aparecia com 74 num lugar
// e 59 no outro. O cliente lê um número no e-mail, abre o painel e vê outro, e
// a partir daí não acredita em nenhum dos dois. O arquivo compartilhado nasceu
// pra impedir isso. Reimplementar a conta aqui seria refazer o mesmo erro.
//
// ⚠️ O SCORE É CALCULÁVEL SEM SER CLIENTE. Os quatro ingredientes — nota,
// volume de avaliações, posição na grade e perfil completo no Google — são
// todos públicos, obtidos por `place_id`. Nenhum depende de ter dispositivo,
// conta ou plano. É o que permite a MESMA medida servir o visitante que acabou
// de chegar, o comprador esperando o cartão chegar e o cliente que já opera.
//
// ⚠️ `score` E NÃO `avg` (leia antes de trocar). A grade devolve dois números
// de posição, e a diferença está documentada em `_lib/competitors.js:1336`:
//   · `avg`   = média crua dos pontos em que o negócio APARECE — ausência some
//               da conta, então quem desaparece de metade da região pontua bem.
//   · `score` = média contando cada ausência como 21ª posição. É o que ORDENA
//               a lista e é o número que o painel mostra na tela.
// O painel atual alimenta o Score com `score`; o e-mail semanal alimenta com
// `avg` (`cron/weekly-digest.js:146`) — ou seja, a divergência de 02/08 voltou
// pela entrada depois que a matemática foi unificada. O V3 usa `score`, que é
// o que o cliente vê na tela. Se um dia os dois forem alinhados, é o e-mail que
// se move, e esta nota sai junto.
// ============================================================
import { calcularScore } from '../../../api/_lib/score-core.js'

/**
 * Monta o Score a partir do pacote de dados do V3 (`useDados`).
 * Devolve o retorno cru de `calcularScore` — score, pontos por fator e o que
 * falta no perfil — para quem chama decidir o que mostrar.
 */
export function scoreDoNegocio({ avaliacoes, info, posicao }) {
  const rating = avaliacoes?.rating ?? info?.rating ?? 0
  const reviews = avaliacoes?.total ?? info?.total ?? 0

  // Só entra posição quando ela foi medida E o negócio apareceu em algum ponto.
  const gridAvg = (posicao && posicao.coverage > 0 && posicao.score != null) ? posicao.score : null
  // Medido em pelo menos um ponto e ausente em TODOS: é informação ("você não
  // aparece"), não falta de dado. A conta trata os dois casos diferente de
  // propósito — dar meio termo aqui premiaria justamente o pior caso.
  const gridSemCobertura = !!(posicao && posicao.measured > 0 && posicao.coverage === 0)

  return calcularScore({
    rating,
    reviews,
    gridAvg,
    gridSemCobertura,
    photo: !!info?.photoUrl,
    phone: !!(info?.phone && String(info.phone).trim()),
    category: !!(info?.category && String(info.category).trim())
  })
}

/** Faixa de cor do anel. Mesma régua do painel atual — reusada, não copiada. */
export function faixaDoScore(score) {
  if (score >= 80) return 'bom'
  if (score >= 55) return 'medio'
  return 'baixo'
}

/**
 * A leitura HONESTA da colocação, e a única forma que pode ir pra tela.
 *
 * NÃO devolve ordinal ("você é o 1º de 24"). Em 01/08/2026 esse número foi
 * removido do painel depois de medido: ele sai "1º" para 17 de cada 20
 * negócios, por construção da grade, porque a medição parte do endereço do
 * próprio negócio. Era elogio automático com cara de medição.
 *
 * O que fica é verificável: em quantos pontos ao redor o negócio aparece, e em
 * quantos deles ele está entre os três primeiros — que é a dor real, porque
 * quem não está nos três não é visto.
 */
export function leituraDaColocacao(posicao) {
  if (!posicao || !posicao.measured) return null
  const pontos = (posicao.points || []).filter(p => p.ok)
  const medidos = pontos.length || posicao.measured
  const aparece = posicao.coverage || 0
  // `top3` é null quando a lista de pontos não veio — e null NÃO é zero. Com
  // zero, a tela afirmaria "em nenhum deles você está entre os 3 primeiros",
  // que é uma má notícia inventada a partir de dado ausente. É o modo de falha
  // nº 1 deste projeto vestido de interface: quem lê não tem como saber que a
  // frase nasceu de uma lista vazia.
  const top3 = pontos.length
    ? pontos.filter(p => p.rank != null && p.rank <= 3).length
    : null
  return {
    medidos,
    aparece,
    top3,
    foraDeTudo: aparece === 0,
    termo: posicao.term || null,
    medidoEm: posicao.measuredAt || null
  }
}
