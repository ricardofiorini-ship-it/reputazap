// ============================================================
// StarTouch — Métricas de visibilidade local (V2)
// ============================================================
// FUNÇÕES PURAS. Recebem `observations` (a saída da grade, uma entrada por
// ponto medido) e devolvem números. Sem rede, sem banco, sem React — é o que
// permite testá-las contra casos reais em vez de exemplos inventados.
//
// POR QUE ESTE ARQUIVO EXISTE (15/09/2026)
// ----------------------------------------
// Até aqui a grade resumia cinco medições num número só: a posição média com
// cada ausência contando como 21ª. Três problemas, todos medidos:
//
//   1. O número misturava DUAS perguntas — "em que lugar você aparece" e "em
//      quantos lugares você aparece". Quem some de um ponto e é 1º nos outros
//      recebia a mesma nota de quem é 8º em todos.
//   2. Ele não tinha régua. "8º lugar" não diz se é bom; medindo nove
//      pizzarias vizinhas, a mediana da vizinhança era 5,4 e a melhor 1,6.
//   3. Ele dizia mais sobre o ENDEREÇO do que sobre o negócio: a pizzaria com
//      13 avaliações tirou 1,6 e a com 2.811 tirou 7,4.
//
// A troca é medir cobertura (em quanto da área você aparece bem) e confronto
// direto (quem aparece junto com você e fica acima), que são fatos contáveis,
// em vez de uma fórmula com uma penalidade escolhida a dedo.
//
// REGRA QUE ATRAVESSA O ARQUIVO INTEIRO: ausência NUNCA vira posição 21, e
// "não medimos" NUNCA vira "não aparece". Ponto que o Google não respondeu sai
// da conta; com zero pontos medidos as métricas são `null`, não `0` — senão
// uma falha da API vira má notícia sobre o cliente, que é o modo de falha nº 1
// deste projeto.
// ============================================================

/** Só os pontos que o Google de fato respondeu. Denominador de tudo. */
function medidos(observations) {
  return (Array.isArray(observations) ? observations : []).filter((o) => o && o.ok);
}

function mediana(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10;
}

function media(nums) {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

const dentroDoTopo = (pos, n) => pos != null && pos >= 1 && pos <= n;

// ------------------------------------------------------------
// Métricas do cliente
// ------------------------------------------------------------
/**
 * @param {Array} observations  saída da grade: [{ point_id, ok, client_position, results, ... }]
 * @returns {{ measured_points:number, top3_coverage:number|null, top10_coverage:number|null,
 *   top20_coverage:number|null, not_found_count:number|null,
 *   median_position_when_visible:number|null, average_position_when_visible:number|null }}
 */
export function metricasDoCliente(observations) {
  const pts = medidos(observations);
  // Zero pontos medidos = NÃO SABEMOS. Devolver 0 de cobertura aqui seria
  // afirmar que o negócio não aparece em lugar nenhum — uma falha do Places
  // virando acusação contra o cliente.
  if (!pts.length) {
    return {
      measured_points: 0,
      top3_coverage: null, top10_coverage: null, top20_coverage: null,
      not_found_count: null,
      median_position_when_visible: null, average_position_when_visible: null,
    };
  }
  const n = pts.length;
  const visiveis = pts.map((o) => o.client_position).filter((p) => p != null);
  const cobertura = (topo) =>
    Math.round((pts.filter((o) => dentroDoTopo(o.client_position, topo)).length / n) * 100) / 100;
  return {
    measured_points: n,
    top3_coverage: cobertura(3),
    top10_coverage: cobertura(10),
    top20_coverage: cobertura(20),
    not_found_count: pts.filter((o) => o.client_position == null).length,
    median_position_when_visible: mediana(visiveis),
    average_position_when_visible: media(visiveis),
  };
}

// ------------------------------------------------------------
// Confronto direto
// ------------------------------------------------------------
/**
 * Concorrente relevante deixa de ser "quem está perto" e passa a ser quem
 * APARECE NAS MESMAS BUSCAS e fica acima. Quem nunca co-ocorre com o cliente
 * não disputa nada com ele, por mais perto que a loja fique.
 *
 * `head_to_head_win_rate` é do ponto de vista do CONCORRENTE: 0,75 quer dizer
 * que ele ficou acima do cliente em 75% das vezes em que os dois apareceram
 * juntos. Sem co-ocorrência é `null`, nunca 0 — não ter disputado não é perder.
 *
 * @param {Array} observations
 * @param {string} placeId  o negócio do cliente
 * @param {Map|Object} [catalogo]  place_id -> { name, address, rating, reviews }
 */
export function confrontoDireto(observations, placeId, catalogo = null) {
  const pts = medidos(observations);
  const info = (id) => {
    if (!catalogo) return {};
    return (catalogo instanceof Map ? catalogo.get(id) : catalogo[id]) || {};
  };
  const acc = new Map();
  for (const o of pts) {
    const posDe = new Map((o.results || []).map((r) => [r.place_id, r.position]));
    const minha = o.client_position;
    for (const r of o.results || []) {
      if (r.place_id === placeId) continue;
      const c = acc.get(r.place_id) || {
        place_id: r.place_id, appearance_count: 0, co_occurrences_with_client: 0,
        times_above_client: 0, times_below_client: 0, posicoes: [], top10: 0,
      };
      c.appearance_count += 1;
      c.posicoes.push(r.position);
      if (dentroDoTopo(r.position, 10)) c.top10 += 1;
      // Co-ocorrência exige o cliente PRESENTE naquele ponto. Se ele sumiu
      // dali, o concorrente não "ganhou" — não houve disputa observável.
      if (minha != null && posDe.has(r.place_id)) {
        c.co_occurrences_with_client += 1;
        if (r.position < minha) c.times_above_client += 1;
        else c.times_below_client += 1;
      }
      acc.set(r.place_id, c);
    }
  }
  const n = pts.length;
  return [...acc.values()].map((c) => {
    const { posicoes, top10, ...resto } = c;
    return {
      ...resto,
      ...info(c.place_id),
      median_position_when_visible: mediana(posicoes),
      top10_coverage: n ? Math.round((top10 / n) * 100) / 100 : null,
      head_to_head_win_rate: c.co_occurrences_with_client
        ? Math.round((c.times_above_client / c.co_occurrences_with_client) * 100) / 100
        : null,
    };
  });
}

/** Os que mais aparecem acima do cliente. Desempate: quem disputou mais vezes. */
export function principaisConcorrentes(lista, limite = 5) {
  return [...(lista || [])]
    .filter((c) => c.times_above_client > 0)
    .sort((a, b) =>
      b.times_above_client - a.times_above_client ||
      b.co_occurrences_with_client - a.co_occurrences_with_client ||
      (a.median_position_when_visible ?? 99) - (b.median_position_when_visible ?? 99))
    .slice(0, limite);
}

// ------------------------------------------------------------
// Ordenação por visibilidade — sem score, sem pesos
// ------------------------------------------------------------
/**
 * "5ª mais visível nesta área" sem inventar fórmula: ordenação lexicográfica
 * sobre dois fatos contáveis.
 *
 *   1. top10_coverage               desc — em quanto da área você aparece bem
 *   2. median_position_when_visible asc  — e, quando aparece, quão bem
 *   3. appearance_count             desc — desempate final
 *
 * A ausência entra sozinha: quem some simplesmente não soma cobertura. Não há
 * penalidade escolhida a dedo, que era o defeito do `score` antigo.
 *
 * ATENÇÃO AO RÓTULO: a grade é centrada no cliente, então ele compete em
 * território dele. Isto é "mais visível NESTA ÁREA ANALISADA" — nunca "na sua
 * região" e nunca "no Google". É a mesma armadilha do "1º de N" de agosto, que
 * dava primeiro lugar a 17 de 20 negócios.
 */
export function ordenaPorVisibilidade(lista) {
  return [...(lista || [])].sort((a, b) =>
    (b.top10_coverage ?? -1) - (a.top10_coverage ?? -1) ||
    (a.median_position_when_visible ?? 999) - (b.median_position_when_visible ?? 999) ||
    (b.appearance_count ?? 0) - (a.appearance_count ?? 0));
}

// ------------------------------------------------------------
// Comparação controlada por distância
// ------------------------------------------------------------
/**
 * Distância entra AQUI e em nenhum outro lugar: como filtro de casos em que a
 * vantagem geográfica é pequena, nunca como nota.
 *
 * Proximity Lift, Distance Rank e Win Rate foram testados em 12 grades de 12
 * categorias (15/09/2026) e deram correlação média de +0,00 e −0,07 com a nota,
 * com sinais pulando de +0,51 a −0,69. São ruído. Não reintroduzir.
 *
 * O resultado é DIAGNÓSTICO, não causa: mostra nota e volume lado a lado nos
 * pontos comparáveis e para por aí.
 */
export function comparacaoControlada(observations, placeId, rivalId, { toleranciaM = 250 } = {}) {
  const pts = medidos(observations);
  let comparable_points = 0, client_wins = 0, competitor_wins = 0;
  for (const o of pts) {
    const meu = (o.results || []).find((r) => r.place_id === placeId);
    const dele = (o.results || []).find((r) => r.place_id === rivalId);
    if (!meu || !dele || meu.distance_m == null || dele.distance_m == null) continue;
    if (Math.abs(meu.distance_m - dele.distance_m) > toleranciaM) continue;
    comparable_points += 1;
    if (meu.position < dele.position) client_wins += 1; else competitor_wins += 1;
  }
  return { place_id: rivalId, comparable_points, client_wins, competitor_wins, toleranciaM };
}

/**
 * Um bloco com menos de 2 pontos comparáveis não sustenta frase nenhuma — um
 * ponto é anedota. A tela usa isto pra decidir se mostra o bloco.
 */
export const COMPARAVEL_MINIMO = 2;

// ------------------------------------------------------------
// Histórico
// ------------------------------------------------------------
/**
 * A pergunta comercial é "estou melhorando ou piorando?". Devolve a variação
 * campo a campo; `null` onde um dos lados não tem o dado (não inventa zero, que
 * a tela leria como "não mudou").
 */
export function diffDeScans(atual, anterior) {
  const campos = ["top3_coverage", "top10_coverage", "top20_coverage",
    "not_found_count", "median_position_when_visible", "average_position_when_visible"];
  const out = {};
  for (const c of campos) {
    const a = atual?.[c], b = anterior?.[c];
    out[c] = (typeof a === "number" && typeof b === "number")
      ? Math.round((a - b) * 100) / 100
      : null;
  }
  return out;
}
