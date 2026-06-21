import { fetchWithTimeout } from "./fetch-timeout.js";

// ============================================================
// StarTouch — Helper de busca de concorrentes (compartilhado)
// ============================================================
// Reusado por:
//   - api/competitors.js (endpoint live)
//   - api/cron/snapshot-competitors.js (cron semanal)
//
// Retorna o ranking BRUTO (sem paywall, sem locking). Quem chama
// decide o que fazer (locking de nome no endpoint; inserção no
// banco no cron).
// ============================================================

const API_KEY = process.env.PLACES_API_KEY;

// Tipos genéricos do Google que não servem como "categoria" de busca
const GENERIC_TYPES = new Set([
  "point_of_interest", "establishment", "premise", "geocode",
  "political", "store_storage"
]);

// Tipos amplos demais pra comparar — só servem de fallback
const BROAD_TYPES = new Set([
  "store", "food", "health", "finance", "general_contractor",
  "home_goods_store", "shopping_mall"
]);

// Tradução tipo do Google → termo natural em PT-BR. Sem isso, o fallback
// faria um Text Search da string técnica (ex: "bicycle_store"), furando o
// ranking. O ideal é o dono informar o termo (category_override); isto é a
// rede de segurança pra quem ainda não informou.
const TYPE_TO_TERM = {
  bakery: "padaria", restaurant: "restaurante", bar: "bar", cafe: "cafeteria",
  meal_takeaway: "lanchonete", meal_delivery: "lanchonete", pharmacy: "farmácia",
  drugstore: "farmácia", supermarket: "mercado", grocery_or_supermarket: "mercado",
  convenience_store: "mercado", beauty_salon: "salão de beleza", hair_care: "barbearia",
  spa: "spa", gym: "academia", pet_store: "petshop", veterinary_care: "veterinário",
  bicycle_store: "loja de bicicletas", clothing_store: "loja de roupas",
  shoe_store: "loja de calçados", furniture_store: "loja de móveis",
  hardware_store: "loja de ferragens", electronics_store: "loja de eletrônicos",
  book_store: "livraria", florist: "floricultura", jewelry_store: "joalheria",
  liquor_store: "adega", car_repair: "oficina mecânica", car_dealer: "concessionária",
  car_wash: "lava-rápido", dentist: "dentista", doctor: "clínica médica",
  hospital: "hospital", physiotherapist: "fisioterapia", lodging: "hotel",
  gas_station: "posto de gasolina", laundry: "lavanderia", bicycle: "loja de bicicletas",
  clothing: "loja de roupas", optician: "ótica", hardware: "loja de ferragens"
};
function typeToTerm(rawType) {
  if (!rawType) return "";
  return TYPE_TO_TERM[rawType] || rawType.replace(/_/g, " ");
}

/**
 * Busca concorrentes do negócio dado.
 *
 * @param {Object} opts
 * @param {string} opts.placeId      - place_id do Google do negócio
 * @param {string} [opts.keyword]    - categoria customizada (sobrepõe a do Google)
 * @param {number} [opts.radius]     - raio em metros (default 3000, máx 25000)
 * @returns {Promise<Object>}        - { enough, total, category, radius, me, myRank, ahead, top, raw }
 *
 * Shape do retorno:
 * {
 *   enough: true,
 *   total: 12,
 *   category: "cafeteria",
 *   radius: 3000,
 *   me: { place_id, name, rating, reviews, lat, lng },
 *   myRank: 3,
 *   ahead: { reviews, rating } | null,
 *   top: [
 *     { place_id, name, rating, reviews, lat, lng, is_me: false },
 *     ...
 *   ],
 *   raw: { details, nearby }  // pra debug e re-cálculo histórico
 * }
 *
 * Se total < 2 retorna { enough: false, ... me }.
 */
export async function fetchCompetitorsSnapshot({ placeId, keyword, radius }) {
  if (!placeId) throw new Error("placeId obrigatório");
  if (!API_KEY) throw new Error("PLACES_API_KEY ausente no ambiente");

  const safeRadius = Math.min(parseInt(radius, 10) || 3000, 25000);
  const cleanKeyword = (keyword || "").trim();

  // 1. Detalhes do negócio: localização + categoria + nota
  const detRes = await fetchWithTimeout(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,geometry,types&language=pt-BR&key=${API_KEY}`,
    {}, 6000
  );
  const det = await detRes.json();
  const me = det.result;
  if (!me?.geometry?.location) {
    throw new Error("Localização do negócio não encontrada no Google");
  }
  const { lat, lng } = me.geometry.location;

  // Categoria de comparação: prioriza tipo específico, fallback pra amplo
  const myTypes = me.types || [];
  const specific = myTypes.filter(t => !GENERIC_TYPES.has(t) && !BROAD_TYPES.has(t));
  const broad = myTypes.filter(t => !GENERIC_TYPES.has(t) && BROAD_TYPES.has(t));
  const matchType = specific[0] || broad[0] || null;

  // 2. Nearby Search por perto
  const useKeyword = cleanKeyword.length >= 2;
  let nearbyUrl =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${safeRadius}&language=pt-BR&key=${API_KEY}`;
  let comparisonLabel;
  if (useKeyword) {
    nearbyUrl += `&keyword=${encodeURIComponent(cleanKeyword)}`;
    comparisonLabel = cleanKeyword;
  } else if (matchType) {
    nearbyUrl += `&type=${matchType}`;
    comparisonLabel = matchType;
  } else {
    comparisonLabel = null;
  }

  const nearRes = await fetchWithTimeout(nearbyUrl, {}, 6000);
  const near = await nearRes.json();
  const rawResults = near.results || [];

  // Filtro: com keyword confiamos no Google; sem keyword, só compartilha tipo
  const sameCategory = (p) => useKeyword || !matchType || (p.types || []).includes(matchType);

  // 3. Monta lista de concorrentes — agora INCLUINDO lat/lng (pro mapa)
  const byId = new Map();
  for (const p of rawResults) {
    if (typeof p.rating !== "number") continue;
    if (!sameCategory(p)) continue;
    byId.set(p.place_id, {
      place_id: p.place_id,
      name: p.name,
      rating: p.rating,
      reviews: p.user_ratings_total || 0,
      lat: p.geometry?.location?.lat ?? null,
      lng: p.geometry?.location?.lng ?? null
    });
  }
  // Garante o próprio negócio na lista (dados oficiais)
  byId.set(placeId, {
    place_id: placeId,
    name: me.name,
    rating: typeof me.rating === "number" ? me.rating : 0,
    reviews: me.user_ratings_total || 0,
    lat,
    lng
  });

  const list = Array.from(byId.values());
  const total = list.length;

  const meEntry = byId.get(placeId);

  if (total < 2) {
    return {
      enough: false,
      total,
      category: comparisonLabel,
      radius: safeRadius,
      me: meEntry,
      raw: { details: det, nearby: near }
    };
  }

  // 4. Score que aproxima a "prominence" do Google
  // (rating × log10(reviews + 1) — volume domina, nota modula)
  const gscore = (p) => (p.rating || 0) * Math.log10((p.reviews || 0) + 1);
  const byGoogle = [...list].sort(
    (a, b) => gscore(b) - gscore(a) || b.reviews - a.reviews
  );

  const myRank = byGoogle.findIndex(p => p.place_id === placeId) + 1;

  // Concorrente uma posição acima (pra cálculo de "falta X pra ultrapassar")
  const aheadEntry = myRank > 1 ? byGoogle[myRank - 2] : null;
  const ahead = aheadEntry
    ? { reviews: aheadEntry.reviews, rating: aheadEntry.rating }
    : null;

  // 5. Top 5 com lat/lng e is_me. SEM locking aqui (cron precisa do nome real).
  const top = byGoogle.slice(0, 5).map(p => ({
    ...p,
    is_me: p.place_id === placeId
  }));

  return {
    enough: true,
    total,
    category: comparisonLabel,
    radius: safeRadius,
    me: meEntry,
    myRank,
    ahead,
    top,
    raw: { details: det, nearby: near }
  };
}

// ============================================================
// Detecção de termo pelo NOME (termo mais específico vence) —
// compartilhada entre diagnóstico e ranking do app.
// ============================================================
const KEYWORD_DICT = [
  ["padaria artesanal","padaria artesanal"],
  ["cervejaria artesanal","cervejaria artesanal"],["cerveja artesanal","cervejaria artesanal"],
  ["sorveteria artesanal","sorveteria artesanal"],
  ["hamburgueria artesanal","hamburgueria artesanal"],
  ["pizzaria napolitana","pizzaria napolitana"],["pizza napolitana","pizzaria napolitana"],
  ["comida japonesa","restaurante japonês"],["comida árabe","restaurante árabe"],["comida arabe","restaurante árabe"],
  ["comida italiana","restaurante italiano"],
  // Cozinhas específicas no nome ("Restaurante Árabe", "Comida Japonesa"...) —
  // vencem o genérico "restaurante" e fazem o negócio ranquear no nicho certo.
  ["restaurante árabe","restaurante árabe"],["restaurante arabe","restaurante árabe"],
  ["restaurante japonês","restaurante japonês"],["restaurante japones","restaurante japonês"],
  ["restaurante italiano","restaurante italiano"],
  ["restaurante mexicano","restaurante mexicano"],
  ["restaurante chinês","restaurante chinês"],["restaurante chines","restaurante chinês"],
  ["restaurante vegetariano","restaurante vegetariano"],["restaurante vegano","restaurante vegano"],
  ["comida caseira","comida caseira"],["marmitaria","marmitaria"],["marmita","marmitaria"],
  // Varejo comum cujo nicho não vem do tipo do Google (genérico "store")
  ["produtos de limpeza","produtos de limpeza"],["material de limpeza","produtos de limpeza"],["loja de limpeza","produtos de limpeza"],["limpeza","produtos de limpeza"],
  ["material de construção","material de construção"],["materiais de construção","material de construção"],
  ["papelaria","papelaria"],["floricultura","floricultura"],["ótica","ótica"],["otica","ótica"],
  ["loja de roupas","loja de roupas"],["loja de calçados","loja de calçados"],["loja de calcados","loja de calçados"],
  ["pizzaria","pizzaria"],["pizza","pizzaria"],
  ["hamburgueria","hamburgueria"],["burger","hamburgueria"],["burguer","hamburgueria"],["smash","hamburgueria"],
  ["panificadora","padaria"],["padaria","padaria"],
  ["confeitaria","confeitaria"],["doceria","confeitaria"],
  ["cafeteria","cafeteria"],["coffee","cafeteria"],["café","cafeteria"],
  ["açaiteria","açaí"],["açaí","açaí"],["acai","açaí"],
  ["barbearia","barbearia"],["barber","barbearia"],
  ["salão de beleza","salão de beleza"],["salão","salão de beleza"],["salao","salão de beleza"],["estética","estética"],["estetica","estética"],
  ["pet shop","petshop"],["petshop","petshop"],
  ["farmácia","farmácia"],["farmacia","farmácia"],["drogaria","farmácia"],
  ["lanchonete","lanchonete"],
  ["sushi","restaurante japonês"],["temaki","restaurante japonês"],
  ["churrascaria","churrascaria"],["churrasco","churrascaria"],
  ["gelateria","gelateria"],["sorveteria","sorveteria"],
  ["academia","academia"],["crossfit","academia"],
  ["hortifruti","hortifruti"],["mercearia","mercado"],["mercado","mercado"],
  ["pastelaria","pastelaria"],["esfiharia","esfiharia"],
  ["rodízio","restaurante"],["rodizio","restaurante"],["restaurante","restaurante"],
  ["clínica odontológica","clínica odontológica"],["odonto","clínica odontológica"],["dentista","clínica odontológica"],["clínica","clínica"],["clinica","clínica"]
];
export function detectFromName(name) {
  const n = (name || "").toLowerCase();
  let best = "", bestLen = 0;
  for (const [tok, term] of KEYWORD_DICT) {
    if (n.includes(tok) && tok.length > bestLen) { best = term; bestLen = tok.length; }
  }
  return best;
}

/**
 * Ranqueia como o GOOGLE de verdade: Text Search do termo (o que o cliente
 * digita) ancorado no local, lendo a ORDEM do Google — SEM re-ranquear.
 * Usado pelo diagnóstico E pelo app (mesmo número nos dois).
 *
 * Termo: keyword explícito > detectado no nome > tipo do Google.
 *
 * Retorno (compatível com fetchCompetitorsSnapshot p/ o cron):
 * { enough, total, category, radius, me, myRank, inResults, ahead, top }
 *   - top: lista na ORDEM do Google, cada item { place_id, name, rating,
 *     reviews, lat, lng, is_me }
 *   - ahead: { reviews, rating, name } | null  (quem está 1 posição acima)
 */
export async function fetchRankingByTerm({ placeId, keyword, radius }) {
  if (!placeId) throw new Error("placeId obrigatório");
  if (!API_KEY) throw new Error("PLACES_API_KEY ausente no ambiente");
  const safeRadius = Math.min(parseInt(radius, 10) || 3000, 25000);

  // 1. Detalhes do negócio
  const detRes = await fetchWithTimeout(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,geometry,types&language=pt-BR&key=${API_KEY}`,
    {}, 6000
  );
  const det = await detRes.json();
  const meR = det.result;
  if (!meR?.geometry?.location) throw new Error("Localização do negócio não encontrada no Google");
  const { lat, lng } = meR.geometry.location;
  const myRating = typeof meR.rating === "number" ? meR.rating : 0;
  const myReviews = meR.user_ratings_total || 0;
  const me = { place_id: placeId, name: meR.name, rating: myRating, reviews: myReviews, lat, lng };

  // 2. Termo (o que o cliente digita)
  let term = (keyword || "").trim();
  if (!term) term = detectFromName(meR.name);
  if (!term) {
    const types = meR.types || [];
    const specific = types.filter(t => !GENERIC_TYPES.has(t) && !BROAD_TYPES.has(t));
    const broad = types.filter(t => !GENERIC_TYPES.has(t) && BROAD_TYPES.has(t));
    // Traduz o tipo do Google pra termo natural (bicycle_store → "loja de bicicletas")
    term = typeToTerm(specific[0] || broad[0] || "");
  }
  if (!term) {
    return { enough: false, total: 0, category: null, radius: safeRadius, me, myRank: null, inResults: false, ahead: null, top: [] };
  }

  // 3. Text Search do termo ancorado no local — ordem do Google
  const tsUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(term)}&location=${lat},${lng}&radius=${safeRadius}&language=pt-BR&region=br&key=${API_KEY}`;
  const ts = await (await fetchWithTimeout(tsUrl, {}, 8000)).json();

  const seen = new Set();
  const ordered = [];
  for (const p of (ts.results || [])) {
    if (seen.has(p.place_id)) continue;
    if (p.business_status && p.business_status !== "OPERATIONAL") continue;
    if (typeof p.rating !== "number") continue;
    seen.add(p.place_id);
    ordered.push({
      place_id: p.place_id,
      name: p.name,
      rating: p.rating,
      reviews: p.user_ratings_total || 0,
      lat: p.geometry?.location?.lat ?? null,
      lng: p.geometry?.location?.lng ?? null
    });
  }

  const total = ordered.length;
  if (total < 2) {
    return { enough: false, total, category: term, radius: safeRadius, me, myRank: null, inResults: false, ahead: null, top: [] };
  }

  const idx = ordered.findIndex(p => p.place_id === placeId);
  const inResults = idx >= 0;
  const myRank = inResults ? idx + 1 : null;
  const top = ordered.slice(0, 20).map(p => ({ ...p, is_me: p.place_id === placeId }));
  let ahead = null;
  if (inResults && idx > 0) {
    const a = ordered[idx - 1];
    ahead = { reviews: a.reviews, rating: a.rating, name: a.name };
  }

  return { enough: true, total, category: term, radius: safeRadius, me, myRank, inResults, ahead, top };
}

// ============================================================
// VISIBILIDADE MULTI-LENTE
// A MESMA busca (Text Search, ordem REAL do Google — NÃO re-ranqueia),
// rodada em raios diferentes. Mostra que a posição varia conforme o alcance
// de quem busca. Sem filtro de comparáveis e sem score próprio (de propósito):
// aqui a pergunta é "onde eu apareço de verdade", não "quem são meus pares".
// ============================================================

// Resolve o termo (keyword explícito > detecção pelo nome > tipo traduzido).
function resolveTerm(keyword, meR) {
  let term = (keyword || "").trim();
  if (!term) term = detectFromName(meR.name);
  if (!term) {
    const types = meR.types || [];
    const specific = types.filter(t => !GENERIC_TYPES.has(t) && !BROAD_TYPES.has(t));
    const broad = types.filter(t => !GENERIC_TYPES.has(t) && BROAD_TYPES.has(t));
    term = typeToTerm(specific[0] || broad[0] || "");
  }
  return term;
}

// Roda um Text Search ancorado e devolve a ORDEM do Google (sem re-ranquear).
async function runTextSearch(term, lat, lng, radius) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(term)}&location=${lat},${lng}&radius=${radius}&language=pt-BR&region=br&key=${API_KEY}`;
  const ts = await (await fetchWithTimeout(url, {}, 8000)).json();
  const seen = new Set();
  const ordered = [];
  for (const p of (ts.results || [])) {
    if (seen.has(p.place_id)) continue;
    if (p.business_status && p.business_status !== "OPERATIONAL") continue;
    if (typeof p.rating !== "number") continue;
    seen.add(p.place_id);
    ordered.push({
      place_id: p.place_id,
      name: p.name,
      rating: p.rating,
      reviews: p.user_ratings_total || 0,
      lat: p.geometry?.location?.lat ?? null,
      lng: p.geometry?.location?.lng ?? null
    });
  }
  return ordered;
}

// Lentes padrão: mesma busca (CEP/região × termo), raios regionais.
// Removido o "perto de você" (raio apertado dava resultado ruidoso).
export const VISIBILITY_LENSES = [
  { key: "regiao",   label: "Na sua região", radius: 5000 },
  { key: "ampliada", label: "Área ampliada", radius: 12000 },
];

export async function fetchVisibilityLenses({ placeId, keyword }) {
  if (!placeId) throw new Error("placeId obrigatório");
  if (!API_KEY) throw new Error("PLACES_API_KEY ausente no ambiente");

  // 1. Detalhes do negócio (uma vez)
  const detRes = await fetchWithTimeout(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,geometry,types&language=pt-BR&key=${API_KEY}`,
    {}, 6000
  );
  const det = await detRes.json();
  const meR = det.result;
  if (!meR?.geometry?.location) throw new Error("Localização do negócio não encontrada no Google");
  const { lat, lng } = meR.geometry.location;
  const me = {
    place_id: placeId,
    name: meR.name,
    rating: typeof meR.rating === "number" ? meR.rating : 0,
    reviews: meR.user_ratings_total || 0,
    lat, lng
  };

  const term = resolveTerm(keyword, meR);
  if (!term) return { term: null, me, lenses: [] };

  // 2. Roda cada lente (ordem real do Google) — em paralelo
  const lenses = await Promise.all(VISIBILITY_LENSES.map(async (L) => {
    let ordered = [];
    try { ordered = await runTextSearch(term, lat, lng, L.radius); } catch { ordered = []; }
    const idx = ordered.findIndex(p => p.place_id === placeId);
    const top = ordered.slice(0, 10).map(p => ({ ...p, is_me: p.place_id === placeId }));
    return {
      key: L.key,
      label: L.label,
      radiusKm: L.radius / 1000,
      total: ordered.length,
      rank: idx >= 0 ? idx + 1 : null,
      inResults: idx >= 0,
      top
    };
  }));

  return { term, me, lenses };
}

/**
 * Aplica paywall de nome de concorrente (oculta nomes pra free).
 * Usado SÓ pelo endpoint público; cron grava nomes reais no banco.
 */
export function applyNameLocking(top, paid) {
  if (paid) return top;
  return top.map((p, i) => {
    if (p.is_me) return p;
    return {
      place_id: `locked-${i}`,
      name: null,
      rating: p.rating,
      reviews: p.reviews,
      lat: p.lat,
      lng: p.lng,
      is_me: false
    };
  });
}
