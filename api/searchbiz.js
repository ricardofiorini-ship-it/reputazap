import { fetchWithTimeout } from "./_lib/fetch-timeout.js";

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

// Score de relevancia de NOME (prioridade #1). Mede quantos tokens do nome
// digitado aparecem no nome do candidato e penaliza palavras extras (nome mais
// "limpo"/proximo do buscado pontua mais). Assim "Mambo" fica acima de "Chef
// Mambo Parrilla", e "St. Marche" (que nao casa no nome) fica pra baixo — mesmo
// que esteja mais perto do CEP. O CEP so desempata DEPOIS, entre nomes iguais.
function nameScore(candidateName, queryName) {
  const qToks = tokenize(queryName);
  if (!qToks.length) return 0;
  const cToks = new Set(tokenize(candidateName));
  let hit = 0;
  for (const t of qToks) if (cToks.has(t)) hit++;
  const coverage = hit / qToks.length;         // fracao do nome buscado que casou
  const extra = Math.max(0, cToks.size - hit);  // palavras a mais no candidato
  return coverage * 100 - extra * 2;
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

  const API_KEY = process.env.PLACES_API_KEY;
  const cepDigits = (cep || "").replace(/\D/g, "");
  // Nome pra ranquear por relevancia. Se o front nao mandar `name`, usa o `q`.
  const nameQuery = (name || q || "").trim();

  try {
    // 1. Text Search com NOME + TIPO (o `q` ja vem montado assim). A relevancia
    //    do proprio Google prioriza nome/tipo — e' a base da lista de candidatos.
    const textRes = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&language=pt-BR&region=br&key=${API_KEY}`,
      {}, 8000
    );
    const tData = await textRes.json();
    let raw = tData.results || [];

    // 2. Trava de Brasil + remove lojas fechadas (Google mantem fechadas no indice).
    raw = raw.filter((p) => inBrazil(p.geometry?.location));
    raw = raw.filter((p) => !p.business_status || p.business_status === "OPERATIONAL");

    if (!raw.length) {
      return res.json({ results: [] });
    }

    // 3. CEP → coordenadas (so pra DESEMPATE por proximidade). Se o CEP for
    //    invalido/irresolvivel, origin fica null e a lista sai so por relevancia
    //    de nome — sem inventar um ponto errado.
    let origin = null;
    if (cepDigits.length === 8) {
      origin = await geocodeCep(cepDigits, API_KEY);
    }

    // 4. Com CEP valido, descarta o que esta ABSURDAMENTE longe (> 150km). Um
    //    homonimo em outra cidade/estado (ex: "Bar Imperatriz" no Rio, 369km, pro
    //    CEP de SP) nunca e' o negocio do usuario — ele digitou o proprio CEP.
    //    Sem isso, um xara distante com nome identico furava a fila. So corta
    //    quando temos o ponto do CEP (senao nao da pra medir).
    const MAX_DIST_M = 150000;
    let scored = raw.map((p) => ({
      p,
      _score: nameScore(p.name, nameQuery),
      _dist: origin ? haversine(origin, p.geometry?.location) : null,
    }));
    if (origin) {
      const near = scored.filter((s) => s._dist <= MAX_DIST_M);
      // So corta se sobrar algum perto. Se TUDO estiver longe (ex: negocio unico
      // distante do CEP digitado), mantem a lista pra nao dar "nada encontrado".
      if (near.length) scored = near;
    }

    // 5. Ordena pela PRIORIDADE pedida: NOME (score) primeiro; entre nomes de
    //    mesmo score, a UNIDADE mais proxima do CEP em cima (desempate). Sem CEP,
    //    mantem a ordem de relevancia do Google dentro do mesmo score.
    scored.sort((a, b) =>
      (b._score - a._score) ||
      ((a._dist ?? Infinity) - (b._dist ?? Infinity))
    );

    const limit = origin ? 8 : 20;
    const results = scored.slice(0, limit).map(({ p, _dist }) => ({
      place_id: p.place_id,
      name: p.name,
      address: p.formatted_address || p.vicinity || "",
      rating: p.rating || 0,
      total: p.user_ratings_total || 0,
      ...(typeof _dist === "number" && isFinite(_dist)
        ? { distance_meters: Math.round(_dist) }
        : {})
    }));

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
