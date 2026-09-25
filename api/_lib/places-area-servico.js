import { fetchWithTimeout } from "./fetch-timeout.js";

// NEGÓCIO QUE ATENDE NA CASA DO CLIENTE (25/09/2026).
//
// Eletricista, encanador, diarista, dedetizadora: no Google Meu Negócio eles
// marcam "atendo na região do cliente" e ESCONDEM o endereço. O Google chama isso
// de "pure service area business". A API antiga do Places (a que o sistema usa
// em quase tudo) finge que esses negócios não existem:
//   - o textsearch não devolve nenhum deles, nem buscando o nome exato;
//   - o place/details responde NOT_FOUND ("Place ID is no longer valid") pro
//     place_id deles, que é perfeitamente válido.
// Caso que originou: "Elite Soluções Elétricas" (Porto Alegre, 5,0 com 43
// avaliações) — o dono não achava a própria empresa na busca do cadastro.
// Só a API nova (places.googleapis.com/v1) enxerga, e só a busca com
// includePureServiceAreaBusiness=true. Este arquivo é a ponte pras duas telas
// que o cliente precisa pra entrar: a busca e os dados do painel.
//
// Sem endereço não há ponto no mapa — então o ranking por grade e a vizinhança
// de concorrentes NÃO funcionam pra esses negócios, e não há como fazer
// funcionar: não existe "perto de onde" quando o negócio não tem onde.

const BASE = "https://places.googleapis.com/v1";

// Busca SÓ os negócios de área de serviço que batem com a consulta, no formato
// do textsearch antigo, pra entrar na mesma lista do searchbiz.
// rating/userRatingCount puxam o SKU Enterprise (um pouco mais caro que o Pro),
// e ficam mesmo assim: sem endereço, NOTA + Nº DE AVALIAÇÕES é a única coisa que
// separa dois homônimos na lista (no caso de origem havia duas "Elite Soluções
// Elétricas" sem endereço: 43 avaliações em POA, 5 no interior de SP). Escolher
// o place_id errado é pior que a diferença de preço — ver o caso de 18/09.
export async function buscarAreaDeServico(q, API_KEY) {
  const r = await fetchWithTimeout(`${BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.types,places.businessStatus,places.pureServiceAreaBusiness,places.rating,places.userRatingCount"
    },
    body: JSON.stringify({
      textQuery: q,
      languageCode: "pt-BR",
      regionCode: "BR",
      includePureServiceAreaBusinesses: true
    })
  }, 6000);
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
  return (d.places || [])
    .filter((p) => p.pureServiceAreaBusiness === true)
    .map((p) => ({
      place_id: p.id,
      name: p.displayName?.text || "",
      formatted_address: p.formattedAddress || "",
      types: p.types || [],
      business_status: p.businessStatus,
      rating: p.rating,
      user_ratings_total: p.userRatingCount,
      area_de_servico: true
    }));
}

// Detalhes pela API nova, devolvidos NO FORMATO do place/details antigo — quem
// chama só troca a fonte, não a leitura. Usado apenas quando o antigo respondeu
// NOT_FOUND (não em erro qualquer: soluço do Google não pode virar chamada dobrada).
export async function detalhesPelaApiNova(placeId, API_KEY, { comAvaliacoes = false } = {}) {
  const campos = [
    "displayName", "rating", "userRatingCount", "formattedAddress",
    "nationalPhoneNumber", "internationalPhoneNumber", "googleMapsUri", "types", "photos"
  ];
  if (comAvaliacoes) campos.push("reviews");
  const r = await fetchWithTimeout(
    `${BASE}/places/${encodeURIComponent(placeId)}?languageCode=pt-BR`,
    { headers: { "X-Goog-Api-Key": API_KEY, "X-Goog-FieldMask": campos.join(",") } },
    6000
  );
  if (!r.ok) return null;
  const p = await r.json();
  if (!p?.displayName) return null;
  return {
    name: p.displayName.text,
    rating: p.rating,
    user_ratings_total: p.userRatingCount,
    formatted_address: p.formattedAddress || null,
    formatted_phone_number: p.nationalPhoneNumber || null,
    international_phone_number: p.internationalPhoneNumber || null,
    url: p.googleMapsUri || null,
    types: p.types || [],
    // Foto na API nova é um "name" (places/…/photos/…), não photo_reference.
    photo_name: p.photos?.[0]?.name || null,
    reviews: (p.reviews || []).map((v) => ({
      author_name: v.authorAttribution?.displayName,
      rating: v.rating,
      text: v.text?.text || v.originalText?.text || "",
      relative_time_description: v.relativePublishTimeDescription || "",
      time: v.publishTime ? Math.floor(new Date(v.publishTime).getTime() / 1000) : undefined
    })),
    area_de_servico: true
  };
}

// URL da foto pra um photo_name da API nova (a key não vai pro cache, igual ao antigo).
export function urlFotoApiNova(photoName, API_KEY, largura = 200) {
  return `${BASE}/${photoName}/media?maxWidthPx=${largura}&key=${API_KEY}`;
}
