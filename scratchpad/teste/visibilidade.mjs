// Testa api/_lib/visibilidade.js com uma GRADE REAL, medida no Google em
// 15/09/2026 (Brascatta pizzaria e restaurante Alto da Lapa, termo "pizzaria").
// Fixture em grade-real.json. Exemplo inventado passa em qualquer coisa; este
// quebra se a funcao errar num caso que existe.
//
// Posicoes reais do cliente nos 5 pontos: centro 3 · N 2 · S 7 · L 8 · O 13
import fs from "node:fs";
import {
  metricasDoCliente, confrontoDireto, principaisConcorrentes,
  ordenaPorVisibilidade, comparacaoControlada, diffDeScans, COMPARAVEL_MINIMO,
} from "../../api/_lib/visibilidade.js";

const F = JSON.parse(fs.readFileSync(new URL("./grade-real.json", import.meta.url), "utf8"));
const OBS = F.observations;

let ok = 0; const falhas = [];
function checa(nome, cond, detalhe) {
  if (cond) { ok++; console.log("  OK   " + nome); }
  else { falhas.push(nome); console.log("  FALHA " + nome + (detalhe !== undefined ? " -> " + detalhe : "")); }
}

console.log("\n0. Controle positivo: a fixture tem dado de verdade");
{
  checa("5 pontos, todos medidos", OBS.length === 5 && OBS.every(o => o.ok), OBS.length);
  checa("cada ponto trouxe lista nao vazia", OBS.every(o => o.results.length > 0));
  checa("as listas trazem distancia", OBS.every(o => o.results.every(r => typeof r.distance_m === "number")));
  checa("as posicoes do cliente sao as medidas (3,2,7,8,13)",
    JSON.stringify(OBS.map(o => o.client_position)) === "[3,2,7,8,13]",
    JSON.stringify(OBS.map(o => o.client_position)));
}

console.log("\n1. Metricas do cliente — conferidas a mao");
{
  const m = metricasDoCliente(OBS);
  checa("measured_points = 5", m.measured_points === 5, m.measured_points);
  checa("top3 = 0,40 (so 3 e 2 estao no top 3)", m.top3_coverage === 0.4, m.top3_coverage);
  checa("top10 = 0,80 (13 fica de fora)", m.top10_coverage === 0.8, m.top10_coverage);
  checa("top20 = 1,00", m.top20_coverage === 1, m.top20_coverage);
  checa("not_found = 0", m.not_found_count === 0, m.not_found_count);
  checa("mediana de [2,3,7,8,13] = 7", m.median_position_when_visible === 7, m.median_position_when_visible);
  checa("media = 6,6", m.average_position_when_visible === 6.6, m.average_position_when_visible);
  // Amarra com o numero antigo: com cobertura cheia, a media nova TEM que bater
  // com o `avg` que a grade ja calculava. Se divergir, uma das duas esta errada.
  checa("bate com o `avg` legado (cobertura cheia)",
    m.average_position_when_visible === F.legado.avg, `${m.average_position_when_visible} vs ${F.legado.avg}`);
}

console.log("\n2. Confronto direto — invariantes que nao podem quebrar");
{
  const c = confrontoDireto(OBS, F.placeId);
  checa("achou concorrentes", c.length > 5, c.length);
  checa("o proprio cliente nao entra na lista", !c.some(x => x.place_id === F.placeId));
  checa("acima + abaixo = co-ocorrencias, em TODOS",
    c.every(x => x.times_above_client + x.times_below_client === x.co_occurrences_with_client));
  checa("co-ocorrencias nunca passam das aparicoes",
    c.every(x => x.co_occurrences_with_client <= x.appearance_count));
  checa("aparicoes nunca passam dos pontos medidos", c.every(x => x.appearance_count <= 5));
  checa("sem co-ocorrencia, win rate e null (nao 0)",
    c.filter(x => !x.co_occurrences_with_client).every(x => x.head_to_head_win_rate === null));
  checa("com co-ocorrencia, win rate entre 0 e 1",
    c.filter(x => x.co_occurrences_with_client).every(x => x.head_to_head_win_rate >= 0 && x.head_to_head_win_rate <= 1));
  // Controle: a fixture precisa ter disputa de verdade, senao os invariantes
  // acima passam por vacuidade.
  checa("ha ao menos um concorrente que ficou acima do cliente",
    c.some(x => x.times_above_client > 0));
}

console.log("\n3. Principais concorrentes");
{
  const c = confrontoDireto(OBS, F.placeId);
  const p = principaisConcorrentes(c, 5);
  checa("no maximo 5", p.length <= 5, p.length);
  checa("todos ficaram acima ao menos uma vez", p.every(x => x.times_above_client > 0));
  checa("vem em ordem decrescente de times_above_client",
    p.every((x, i) => i === 0 || p[i - 1].times_above_client >= x.times_above_client));
  checa("quem nunca ficou acima fica de fora",
    !p.some(x => x.times_above_client === 0));
}

console.log("\n4. Ordenacao por visibilidade — sem score, sem pesos");
{
  const lista = [
    { place_id: "a", top10_coverage: 0.4, median_position_when_visible: 2, appearance_count: 5 },
    { place_id: "b", top10_coverage: 1.0, median_position_when_visible: 9, appearance_count: 5 },
    { place_id: "c", top10_coverage: 1.0, median_position_when_visible: 3, appearance_count: 5 },
    { place_id: "d", top10_coverage: 1.0, median_position_when_visible: 3, appearance_count: 2 },
  ];
  const r = ordenaPorVisibilidade(lista).map(x => x.place_id).join("");
  // Ordem correta, conferida a mao: c (cob 1,0 · med 3 · 5 aparicoes),
  // d (1,0 · 3 · 2 aparicoes), b (1,0 · med 9), a (cob 0,4).
  // A primeira versao deste teste esperava "cbda" — erro meu na conta, nao da
  // funcao. Fica o registro: o teste pegou o autor, que e pra isso que serve.
  checa("cobertura manda; empate desempata por mediana; depois por aparicoes", r === "cdba", r);
  checa("nao muta o array original", lista[0].place_id === "a");
  const semDado = ordenaPorVisibilidade([{ place_id: "x" }, { place_id: "y", top10_coverage: 0.1 }]);
  checa("quem nao tem cobertura vai pro fim, nao pro topo", semDado[0].place_id === "y", semDado[0].place_id);
}

console.log("\n5. Comparacao controlada por distancia");
{
  const c = confrontoDireto(OBS, F.placeId);
  const rival = principaisConcorrentes(c, 1)[0];
  const cc = comparacaoControlada(OBS, F.placeId, rival.place_id, { toleranciaM: 250 });
  checa("vitorias somam os pontos comparaveis",
    cc.client_wins + cc.competitor_wins === cc.comparable_points,
    JSON.stringify(cc));
  checa("comparaveis <= pontos medidos", cc.comparable_points <= 5, cc.comparable_points);
  const largo = comparacaoControlada(OBS, F.placeId, rival.place_id, { toleranciaM: 100000 });
  checa("tolerancia enorme nunca compara MENOS que a estreita",
    largo.comparable_points >= cc.comparable_points, `${largo.comparable_points} vs ${cc.comparable_points}`);
  const zero = comparacaoControlada(OBS, F.placeId, rival.place_id, { toleranciaM: -1 });
  checa("tolerancia negativa nao compara nada", zero.comparable_points === 0);
  checa("o corte de exibicao e 2", COMPARAVEL_MINIMO === 2);
  const inexistente = comparacaoControlada(OBS, F.placeId, "nao-existe", {});
  checa("rival inexistente devolve zeros, nao quebra", inexistente.comparable_points === 0);
}

console.log("\n6. \"Nao medimos\" nunca pode virar \"nao aparece\"");
{
  const vazio = metricasDoCliente([]);
  checa("lista vazia: coberturas null, NAO 0",
    vazio.top10_coverage === null && vazio.top3_coverage === null, JSON.stringify(vazio));
  checa("lista vazia: measured_points = 0", vazio.measured_points === 0);
  const soFalha = metricasDoCliente([{ point_id: "N", ok: false, client_position: null, results: [] }]);
  checa("so pontos falhos: null tambem", soFalha.top10_coverage === null, soFalha.top10_coverage);
  checa("null/undefined nao quebram",
    metricasDoCliente(null).measured_points === 0 && metricasDoCliente(undefined).measured_points === 0);
  // Ausencia REAL (o Google respondeu e o negocio nao estava) e coisa
  // diferente: aí conta como cobertura zero naquele ponto, e aparece no
  // not_found_count.
  const comAusencia = metricasDoCliente([
    { point_id: "A", ok: true, client_position: 2, results: [] },
    { point_id: "B", ok: true, client_position: null, results: [] },
    { point_id: "C", ok: false, client_position: null, results: [] },
  ]);
  checa("ponto falho sai do denominador (2 medidos, nao 3)", comAusencia.measured_points === 2, comAusencia.measured_points);
  checa("ausencia real conta: top3 = 0,5", comAusencia.top3_coverage === 0.5, comAusencia.top3_coverage);
  checa("not_found conta so a ausencia real", comAusencia.not_found_count === 1, comAusencia.not_found_count);
  checa("mediana ignora a ausencia", comAusencia.median_position_when_visible === 2, comAusencia.median_position_when_visible);
  checa("ausencia NAO virou 21 na media", comAusencia.average_position_when_visible === 2, comAusencia.average_position_when_visible);
}

console.log("\n7. Cliente ausente do ponto nao da vitoria de graca ao concorrente");
{
  const obs = [{ point_id: "A", ok: true, client_position: null,
    results: [{ place_id: "riv", position: 1, distance_m: 100 }] }];
  const c = confrontoDireto(obs, "eu");
  const riv = c.find(x => x.place_id === "riv");
  checa("apareceu 1 vez", riv.appearance_count === 1);
  checa("mas nao houve disputa: co-ocorrencia 0", riv.co_occurrences_with_client === 0);
  checa("e nao contou como 'ficou acima'", riv.times_above_client === 0);
  checa("win rate null", riv.head_to_head_win_rate === null);
}

console.log("\n8. Diferenca entre scans");
{
  const d = diffDeScans({ top10_coverage: 0.8, median_position_when_visible: 7 },
                        { top10_coverage: 0.44, median_position_when_visible: 9 });
  checa("cobertura subiu 0,36", d.top10_coverage === 0.36, d.top10_coverage);
  checa("mediana caiu 2 (melhorou)", d.median_position_when_visible === -2, d.median_position_when_visible);
  const semAnterior = diffDeScans({ top10_coverage: 0.8 }, null);
  checa("sem scan anterior devolve null, nao 0 (a tela leria 0 como 'nao mudou')",
    semAnterior.top10_coverage === null, semAnterior.top10_coverage);
}

console.log("\n" + "=".repeat(60));
console.log(ok + " verificacoes OK, " + falhas.length + " falhas");
if (falhas.length) { falhas.forEach(f => console.log("  x " + f)); process.exit(1); }
