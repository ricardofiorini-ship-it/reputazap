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
import { calcularScore, PESOS } from '../../../api/_lib/score-core.js'

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

/**
 * Faixa de cor do anel.
 *
 * RECALIBRADA EM 06/09/2026. A régua herdada do painel atual era 80/55, e ela
 * pintava errado — medido, não achado:
 *
 *   4,7 · 40 avaliações · TOP 3 em toda a região · perfil completo → 79 (laranja)
 *   4,5 · 60 avaliações · 5º lugar               · perfil completo → 81 (verde)
 *
 * Ou seja: quem estava no topo saía com cor de alerta e quem estava em quinto
 * saía com cor de "está tudo bem", só por causa de 20 avaliações a mais. A
 * causa é o peso do volume, que só satura em 100 avaliações — um negócio local
 * típico tem entre 20 e 60 e perde 12 a 24 pontos aí de saída, sem ter nada de
 * errado. Com o corte em 80, o verde ficava reservado a quem é grande, não a
 * quem vai bem.
 *
 * 70/45 põe o verde onde um lojista honestamente diria "estou bem", que é a
 * única régua que importa: a cor é lida como julgamento, e julgamento
 * descalibrado destrói a confiança no número inteiro.
 *
 * ⚠️ O painel atual (`AppV2.jsx`, modal do Score) continua em 80/55. Os dois
 * mostram o MESMO número com cores diferentes até alguém alinhar — o que é
 * bem menos grave que números diferentes, mas está registrado aqui.
 */
export function faixaDoScore(score) {
  if (score >= 70) return 'bom'
  if (score >= 45) return 'medio'
  return 'baixo'
}

/**
 * O fator que mais está segurando o Score, com a frase do que fazer.
 *
 * Existe porque a explicação da mecânica ("a conta pesa quatro coisas…") não
 * ajudava ninguém: ela repetia em prosa o que as quatro barras já mostram, e
 * deixava sem resposta a única pergunta que o lojista tem diante do número —
 * "e o que eu faço com isso?".
 */
export function maiorLacuna(calc, { avaliacoes, info, posicao } = {}) {
  const reviews = avaliacoes?.total ?? info?.total ?? 0
  const lacunas = [
    {
      chave: 'nota', falta: PESOS.nota - calc.notaPts,
      frase: 'sua nota no Google: é o fator de maior peso na conta, e cada décimo conta'
    },
    {
      chave: 'volume', falta: PESOS.volume - calc.volPts,
      frase: `o número de avaliações: você tem ${reviews.toLocaleString('pt-BR')}, e a pontuação máxima considera 100`
    },
    {
      chave: 'posicao', falta: PESOS.posicao - calc.posPts,
      frase: calc.posFonte === 'fora'
        ? 'sua posição na região: você não aparece nas buscas ao redor do seu endereço'
        : calc.posFonte === 'sem-medicao'
          ? 'sua posição na região: ainda não medimos, então este fator fica no meio termo'
          : 'sua posição na região: aparecer mais acima nas buscas ao redor do seu endereço'
    },
    {
      chave: 'perfil', falta: PESOS.perfil - calc.perfilPts,
      frase: calc.faltando.length
        ? `seu perfil no Google: falta ${calc.faltando.join(' e ')}, e isso se resolve em dois minutos`
        : 'seu perfil no Google'
    }
  ].sort((a, b) => b.falta - a.falta)

  const maior = lacunas[0]
  return maior.falta >= 1 ? maior : null
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
