import { fetchWithTimeout } from "./fetch-timeout.js";

// SUGESTÃO ENQUANTO A PESSOA DIGITA (01/10/2026).
//
// Até aqui o autocomplete da tela do convidado (/app sem login) chamava o
// searchbiz completo a cada pausa: Text Search antigo + Text Search da API nova
// (área de serviço) — DUAS buscas pagas por pausa. Medido na fatura do Cloud de
// setembro: R$0 de busca até 09/09 (quando o autocomplete entrou), R$572 no mês,
// e ~R$45/dia depois que a cota grátis do Text Search acabou em 26/09. Quase tudo
// palavra pela metade, digitada por gente que nem chega a cadastrar.
//
// O Google tem um produto feito pra isto: o Autocomplete (New). Ele cobra por
// requisição bem menos que o Text Search (US$2,83 contra US$32 por mil, e as
// primeiras 10 mil do mês são grátis) e já enxerga negócio de área de serviço
// (includePureServiceAreaBusinesses) — uma chamada substitui as duas.
//
// O que se perde: NOTA e Nº DE AVALIAÇÕES na lista (o Autocomplete não devolve).
// O que separa dois homônimos passa a ser o endereço/cidade da segunda linha —
// que é o que a tela já mostrava primeiro desde 09/09. As outras telas de busca
// (cadastro, ativação, troca de negócio) seguem no searchbiz completo: elas
// buscam no clique, não na pausa, e o volume delas nunca pesou.
export async function sugerirNegocios(q, API_KEY) {
  const r = await fetchWithTimeout("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": API_KEY },
    body: JSON.stringify({
      input: q,
      languageCode: "pt-BR",
      includedRegionCodes: ["br"],
      includePureServiceAreaBusinesses: true
    })
  }, 6000);
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);

  const lista = (d.suggestions || [])
    .map((s) => s.placePrediction)
    .filter(Boolean);

  // SÓ ESTABELECIMENTO — mesma regra positiva do searchbiz (caso de 17/09: o
  // cliente escolheu o endereço da própria loja e o produto inteiro apontou pro
  // vazio). O Autocomplete devolve rua e cidade misturadas com negócio.
  // `types` ausente não descarta: se o Google parar de mandar o campo, a lista
  // volta a ser a de antes em vez de ficar vazia.
  const negocios = lista.filter((p) =>
    !Array.isArray(p.types) || p.types.length === 0 || p.types.includes("establishment")
  );
  if (negocios.length !== lista.length) {
    console.warn(`[sugestao] ${lista.length - negocios.length} resultado(s) descartado(s) por nao ser estabelecimento (q="${q}")`);
  }

  return negocios.map((p) => ({
    place_id: p.placeId,
    name: p.structuredFormat?.mainText?.text || p.text?.text || "",
    address: p.structuredFormat?.secondaryText?.text || "",
    // null, e não 0: a tela distingue "não sabemos" de "zero avaliações".
    rating: null,
    total: null
  }));
}
