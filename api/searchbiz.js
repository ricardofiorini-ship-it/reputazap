import { fetchWithTimeout } from "./_lib/fetch-timeout.js";
import { limitou, LIMITES } from "./_lib/rate-limit.js";
import { comCachePlaces, chaveDe, TTL } from "./_lib/places-cache.js";
import { buscarAreaDeServico } from "./_lib/places-area-servico.js";

// Haversine — distância em metros entre dois pontos lat/lng
function haversine(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return Infinity;
  const R = 6371000; // raio da Terra em metros
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Bounding box do Brasil — trava dura contra vazamento pra outro país. Qualquer
// lugar fora dessa caixa e' descartado (ja aconteceu de a busca cair numa loja
// nos EUA quando o ponto de ancoragem escorregava).
function inBrazil(loc) {
  return !!loc && loc.lat >= -34 && loc.lat <= 6 && loc.lng >= -74.5 && loc.lng <= -34;
}

// Normaliza pra comparar nomes: minusculo, sem acento, sem pontuacao.
function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function tokenize(s) {
  return norm(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
}

// Match de NOME: separa COBERTURA (fracao dos tokens do nome buscado que
// casaram) de PALAVRAS EXTRAS (tokens a mais no candidato). Quem chama ordena:
// cobertura decide o bucket ("casa com o nome?"); entre nomes que casam igual, a
// DISTANCIA do CEP decide (proximidade); palavras extras so no desempate final.
// Antes um score unico misturava os dois e a penalidade de nome comprido
// sobrepujava a distancia — uma franquia "Multicoisas - Bairro" longe, com nome
// mais curto, ganhava da unidade do bairro do usuario. Agora nao.
function nameMatch(candidateName, queryName) {
  const qToks = tokenize(queryName);
  if (!qToks.length) return { coverage: 0, extra: 99 };
  const cToks = new Set(tokenize(candidateName));
  let hit = 0;
  for (const t of qToks) if (cToks.has(t)) hit++;
  return { coverage: hit / qToks.length, extra: Math.max(0, cToks.size - hit) };
}

// Geocoda um CEP em lat/lng via Geocoding API. Aceita o CEP com OU sem hifen
// (o handler ja normaliza pra 8 digitos). Blindagem critica: pra um CEP que NAO
// existe, a Geocoding API nao da erro — devolve o CENTROIDE do Brasil com
// types:["country"] (formatted "Brasil"). Se aceitassemos isso, o desempate por
// distancia mediria tudo a partir do meio do pais. Por isso so aceita um
// resultado que seja de fato um CEP (types inclui "postal_code"). CEP invalido
// -> retorna null -> a lista sai so por relevancia de nome, sem ponto inventado.
async function geocodeCep(cepDigits, API_KEY) {
  const cepFmt = `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`;
  try {
    const r = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cepFmt)}&components=country:BR&language=pt-BR&key=${API_KEY}`,
      {}, 5000
    );
    const d = await r.json();
    const hit = (d.results || []).find((x) => (x.types || []).includes("postal_code"));
    const loc = hit?.geometry?.location;
    if (inBrazil(loc)) return { lat: loc.lat, lng: loc.lng };
  } catch (e) {
    console.warn("[searchbiz] geocode do CEP falhou:", e.message);
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { q, cep, name } = req.query;
  if (!q) return res.status(400).json({ error: "Query obrigatória" });

  // Endpoint público: cada busca gasta Geocoding + Text Search (cota finita).
  // Freio depois do 400 — requisição malformada não consome cota de ninguém.
  if (await limitou(req, res, LIMITES.searchbiz)) return;

  const API_KEY = process.env.PLACES_API_KEY;
  const cepDigits = (cep || "").replace(/\D/g, "");
  // Nome pra ranquear por relevancia. Se o front nao mandar `name`, usa o `q`.
  const nameQuery = (name || q || "").trim();

  // A busca inteira (Geocoding + Text Search + ordenacao) vira UM payload
  // guardado por 24h. Sem isto o autocomplete da tela do convidado seria
  // impagavel: cada pausa na digitacao e' uma chamada, e a mesma pessoa
  // corrigindo o nome repete a consulta anterior varias vezes.
  // A chave carrega os TRES parametros que mudam o resultado — q (nome+tipo),
  // name (o que ranqueia) e cep (a ancora). Trocar `v1` invalida tudo de uma vez.
  // v2 em 18/09/2026: o filtro de "so estabelecimento" entrou depois que estas
  // buscas ja estavam gravadas. Sem virar a versao, quem buscou um endereco nas
  // ultimas 24h continuaria recebendo o endereco — o conserto no ar e o bug na
  // tela ao mesmo tempo, que e o jeito mais rapido de dar o caso por resolvido
  // sem ele estar.
  // v3 em 25/09/2026: negocio de area de servico (endereco oculto) passou a
  // aparecer. Sem virar a versao, quem ja buscou o nome nas ultimas 24h seguiria
  // recebendo a lista sem ele.
  const chaveCache = `searchbiz:v3:${chaveDe(q)}|${chaveDe(nameQuery)}|${cepDigits}`;

  try {
    const { data } = await comCachePlaces({
      key: chaveCache,
      ttlMs: TTL.SEARCHBIZ,
      produce: () => buscar({ q, nameQuery, cepDigits, API_KEY })
    });
    // `produce` devolve null quando nao achou nada — de proposito, pra nao
    // gravar vazio (um 429 momentaneo do Google viraria 24h de "nao existe").
    res.json({ results: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// A busca de verdade — so roda quando o cache nao tem resposta fresca.
// Devolve a lista pronta, ou `null` se nao houver nada (o cache nao grava null).
async function buscar({ q, nameQuery, cepDigits, API_KEY }) {
  // 1. CEP → coordenadas PRIMEIRO: e' a ancora da busca (nao so um desempate).
  //    CEP invalido/irresolvivel → origin null (busca sem ancora, best-effort).
  let origin = null;
  if (cepDigits.length === 8) {
    origin = await geocodeCep(cepDigits, API_KEY);
  }

  // 2. Text Search ANCORADO no CEP (location+radius). SEM a ancora, o Google
  //    usa o IP do SERVIDOR (Vercel) pra decidir relevancia e devolve negocios
  //    de outra regiao — a unidade do bairro do usuario nem entrava na lista.
  let tsUrl =
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&language=pt-BR&region=br&key=${API_KEY}`;
  if (origin) tsUrl += `&location=${origin.lat},${origin.lng}&radius=25000`;
  //    Em paralelo, a API nova so pelos negocios de AREA DE SERVICO (endereco
  //    oculto — eletricista, encanador...), que o textsearch antigo nunca
  //    devolve. Ver _lib/places-area-servico.js. Falha dela nao derruba a busca,
  //    mas grita: foi calada que essa lacuna ficou meses sem ninguem ver.
  const [textRes, areaServico] = await Promise.all([
    fetchWithTimeout(tsUrl, {}, 8000),
    buscarAreaDeServico(q, API_KEY).catch((e) => {
      console.warn("[searchbiz] busca de area de servico (API nova) falhou:", e.message);
      return [];
    })
  ]);
  const tData = await textRes.json();
  let raw = tData.results || [];

  // 3. Trava de Brasil + remove lojas fechadas (Google mantem fechadas no indice).
  raw = raw.filter((p) => inBrazil(p.geometry?.location));
  raw = raw.filter((p) => !p.business_status || p.business_status === "OPERATIONAL");

  // 3b. SO ESTABELECIMENTO. O textsearch tambem devolve ENDERECO PURO
  //     (types ["street_address","subpremise"]) com exatamente a mesma cara de
  //     um negocio na lista de resultados. Em 17/09/2026 um cliente escolheu o
  //     endereco da propria loja em vez da loja: place_id de rua, e com ele o
  //     produto inteiro aponta pro vazio — nao existe avaliacao de rua, entao
  //     todo toque no dispositivo mandava o consumidor pra uma ficha onde nao
  //     da pra avaliar, e nada no sistema reclamava.
  //     Regra POSITIVA (exige "establishment") em vez de lista negra de tipos:
  //     um tipo novo de endereco que o Google invente ja nasce barrado.
  //     `types` AUSENTE nao descarta: se um dia o Google parar de mandar o
  //     campo, a busca volta a ser a de antes em vez de nao achar mais nada.
  const semTipo = (p) => !Array.isArray(p.types) || p.types.length === 0;
  const antes = raw.length;
  raw = raw.filter((p) => semTipo(p) || p.types.includes("establishment"));
  if (raw.length !== antes) {
    // Barulho de proposito: filtro que corta calado e filtro quebrado sao a
    // mesma coisa no log.
    console.warn(`[searchbiz] ${antes - raw.length} resultado(s) descartado(s) por nao ser estabelecimento (q="${q}")`);
  }

  // 3c. Junta os de area de servico. Nao passam pela trava de Brasil (nao tem
  //     ponto no mapa; o regionCode BR ja restringe) e so entram se o NOME bate
  //     ao menos pela metade — a API nova completa a lista com qualquer
  //     eletricista da cidade, e isso seria ruido no autocomplete.
  const jaTem = new Set(raw.map((p) => p.place_id));
  for (const p of areaServico) {
    if (jaTem.has(p.place_id)) continue;
    if (nameMatch(p.name, nameQuery).coverage < 0.5) continue;
    raw.push(p);
  }

  if (!raw.length) return null;   // nada achado: nao grava no cache

  // 4. Com CEP valido, descarta o que esta ABSURDAMENTE longe (> 150km). Um
  //    homonimo em outra cidade/estado nunca e' o negocio do usuario — ele
  //    digitou o proprio CEP. So corta quando ha ponto do CEP; se TUDO estiver
  //    longe, mantem a lista pra nao dar "nada encontrado".
  const MAX_DIST_M = 150000;
  let scored = raw.map((p) => {
    const nm = nameMatch(p.name, nameQuery);
    return { p, _cov: nm.coverage, _extra: nm.extra, _dist: origin ? haversine(origin, p.geometry?.location) : null };
  });
  if (origin) {
    // Area de servico nao tem ponto: nao da pra dizer que esta longe, entao fica.
    const near = scored.filter((s) => s._dist <= MAX_DIST_M || s.p.area_de_servico);
    if (near.length) scored = near;
  }

  // 5. Ordena: (1) COBERTURA do nome buscado — quem casa mais vem antes (evita
  //    que um vizinho de nome diferente ganhe). (2) Com CEP, o MAIS PERTO vence
  //    entre nomes que casam igual (proximidade decide de fato). (3) Desempate
  //    final: nome mais limpo. Sem CEP, cai direto pro nome limpo.
  scored.sort((a, b) =>
    (b._cov - a._cov) ||
    (origin ? ((a._dist ?? Infinity) - (b._dist ?? Infinity)) : 0) ||
    (a._extra - b._extra)
  );

  const limit = origin ? 8 : 20;
  const results = scored.slice(0, limit).map(({ p, _dist }) => ({
    place_id: p.place_id,
    name: p.name,
    address: p.formatted_address || p.vicinity || (p.area_de_servico ? "Atende na região do cliente" : ""),
    rating: p.rating || 0,
    total: p.user_ratings_total || 0,
    ...(typeof _dist === "number" && isFinite(_dist)
      ? { distance_meters: Math.round(_dist) }
      : {})
  }));

  return results;
}
