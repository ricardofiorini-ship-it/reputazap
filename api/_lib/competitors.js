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

// Categorias que dizem o PAPEL do negócio na cadeia produtiva, não o que o
// cliente digita no Google. Caso real: "A Loja da Limpeza" (Av. São Camilo) está
// cadastrada no Meu Negócio como `manufacturer` → "Fabricante". É a categoria
// oficial dela, e ainda assim ninguém busca "fabricante" pra comprar detergente.
// Categoria oficial é autoritativa sobre O QUE o negócio é, não sobre COMO o
// cliente procura por ele. Estas só entram como último recurso.
const STRUCTURAL_TYPES = new Set([
  "manufacturer", "supplier", "wholesaler", "distributor", "corporate_office",
  "general_contractor", "contractor", "service", "company", "consultant"
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
  clothing: "loja de roupas", optician: "ótica", hardware: "loja de ferragens",
  home_goods_store: "loja de utilidades", store: "loja", general_store: "loja",
  // Tipos finos da Places API (New) — ela devolve uma taxonomia bem mais rica
  // que a antiga (italian_restaurant, sushi_restaurant…).
  italian_restaurant: "restaurante italiano", pizza_restaurant: "pizzaria",
  sushi_restaurant: "restaurante de sushi", japanese_restaurant: "restaurante japonês",
  brazilian_restaurant: "restaurante", chinese_restaurant: "restaurante chinês",
  mexican_restaurant: "restaurante mexicano", seafood_restaurant: "restaurante de frutos do mar",
  steak_house: "churrascaria", hamburger_restaurant: "hamburgueria",
  sandwich_shop: "lanchonete", ice_cream_shop: "sorveteria",
  coffee_shop: "cafeteria", barber_shop: "barbearia", nail_salon: "manicure",
  fitness_center: "academia", pet_shop: "petshop"
};
// Tradução TOLERANTE: tipo desconhecido vira texto legível. Usada pelo motor de
// ranking, onde um termo torto ainda é melhor que termo nenhum (sem termo não
// há busca).
export function typeToTerm(rawType) {
  if (!rawType) return "";
  return TYPE_TO_TERM[rawType] || rawType.replace(/_/g, " ");
}
// Tradução ESTRITA: tipo desconhecido é DESCARTADO. Usada pelos chips do
// formulário. Sem isso a Places API (New), que devolve tipos muito mais finos,
// vaza inglês cru pro rosto do cliente — "adventure sports center" numa loja de
// bicicletas, "service" num salão. Chip a menos > chip errado em inglês.
function typeToTermStrict(rawType) {
  return (rawType && TYPE_TO_TERM[rawType]) || "";
}

// ── Filtro de categoria/intenção (compartilhado) ──────────────
// O tipo do Google é grosseiro (marca "loja de bicicleta" e "aluguel de
// bicicleta" como bicycle_store). Combinamos: (1) mesmo tipo primário
// específico + (2) guard por nome que tira intenção diferente (aluguel,
// locação) quando o negócio do cliente NÃO é desse tipo.
const DIFFERENT_INTENT_WORDS = [
  "aluguel", "aluguer", "locacao", "locação", "locadora", "rental",
  "bike tour", "passeio", "tour "
];
function normalizeName(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function nameHasIntent(name) {
  const n = normalizeName(name);
  return DIFFERENT_INTENT_WORDS.some(w => n.includes(normalizeName(w)));
}
function primarySpecificType(types) {
  return (types || []).find(t => !GENERIC_TYPES.has(t) && !BROAD_TYPES.has(t)) || null;
}
// Retorna uma função keep(candidate) — true se o candidato compete de verdade.
function makeCategoryFilter(meR, placeId) {
  const clientType = primarySpecificType(meR.types);
  const clientHasIntent = nameHasIntent(meR.name);
  return function keep(p) {
    if (p.place_id === placeId) return true; // o próprio negócio sempre entra
    if (clientType) {
      const pt = primarySpecificType(p.types);
      if (pt && pt !== clientType) return false; // categoria primária diferente
    }
    // Cliente é loja/venda mas o candidato é aluguel/serviço → fora.
    if (!clientHasIntent && nameHasIntent(p.name)) return false;
    return true;
  };
}

// Garante o próprio negócio na lista: o Google nem sempre retorna a própria
// empresa na busca (raio/relevância), e aí ela sumia do próprio ranking. Se
// faltar, insere pela prominência aproximada (rating × log(avaliações)).
function ensureMe(ordered, me) {
  if (!me?.place_id) return ordered;
  if (ordered.some(p => p.place_id === me.place_id)) return ordered;
  const g = (p) => (p.rating || 0) * Math.log10((p.reviews || 0) + 1);
  const meEntry = { ...me, types: me.types || [] };
  const out = ordered.slice();
  let i = out.findIndex(p => g(p) < g(meEntry));
  if (i < 0) i = out.length;
  out.splice(i, 0, meEntry);
  return out;
}

// Limpa o termo de busca se o usuário colou o NOME do negócio junto (ex:
// "Cicloarte loja de bicicletas"). Sem isso, o Google buscaria pelo nome e
// retornaria só o próprio negócio — ranking furado. Estratégia: se o termo
// contém o nome, extrai a categoria conhecida; senão remove as palavras do
// nome; se sobrar nada, retorna "" (cai pra detecção por tipo do Google).
function sanitizeKeyword(keyword, businessName) {
  const kw = (keyword || "").trim();
  if (!kw) return "";
  // 1. Categoria conhecida dentro do termo? Pega "produtos de limpeza" em
  //    "SAIF produtos de limpeza" sem mexer no resto. Resolve a maioria.
  const detected = detectFromName(kw);
  if (detected) return detected;
  // 2. Remove o NOME do negócio só quando ele aparece inteiro e contíguo no
  //    termo (ex: "Cicloarte loja de bicicletas" → "loja de bicicletas").
  //    Conservador de propósito: não fatia palavra a palavra (evitaria tirar
  //    "limpeza" de um nome tipo "Loja da Limpeza").
  const nameNorm = normalizeName(businessName).trim();
  const kwNorm = normalizeName(kw);
  if (nameNorm.length >= 3 && kwNorm.includes(nameNorm)) {
    const cleaned = kwNorm.split(nameNorm).join(" ").replace(/\s+/g, " ").trim();
    return cleaned.length >= 3 ? cleaned : "";
  }
  return kw; // sem certeza → respeita o que o usuário digitou
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
  ["trattoria","restaurante italiano"],["osteria","restaurante italiano"],["cantina italiana","restaurante italiano"],
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
export async function fetchRankingByTerm({ placeId, keyword, radius, cep }) {
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

  // 2. Termo (o que o cliente digita) — limpo do nome do negócio se vier colado
  const term = resolveTerm(keyword, meR);
  if (!term) {
    return { enough: false, total: 0, category: null, radius: safeRadius, me, myRank: null, inResults: false, ahead: null, top: [] };
  }

  // Âncora: centro do CEP (igual às lentes de visibilidade). Sem CEP, ponto do negócio.
  const cepCoordR = await geocodeCep(cep);
  const aLat = cepCoordR?.lat ?? lat;
  const aLng = cepCoordR?.lng ?? lng;

  // 3. Text Search do termo ancorado no local — ordem do Google
  const tsUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(term)}&location=${aLat},${aLng}&radius=${safeRadius}&language=pt-BR&region=br&key=${API_KEY}`;
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
      lng: p.geometry?.location?.lng ?? null,
      types: p.types || []
    });
  }

  // Filtro de categoria/intenção (mesma regra das lentes). Só aplica se sobrar
  // >=2, pra não zerar em categoria mal-classificada.
  const keepR = makeCategoryFilter(meR, placeId);
  const fR = ordered.filter(keepR);
  if (fR.length >= 2) { ordered.length = 0; ordered.push(...fR); }
  // NÃO injeta o próprio negócio: a posição só existe se o Places o retornar de
  // fato pra {termo}+região. Sem isso, inResults=false (não classificado).

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

// Resolve o termo (keyword limpo > detecção pelo nome > tipo traduzido).
function resolveTerm(keyword, meR) {
  let term = sanitizeKeyword(keyword, meR.name);
  if (!term) term = detectFromName(meR.name);
  if (!term) {
    const types = meR.types || [];
    const specific = types.filter(t => !GENERIC_TYPES.has(t) && !BROAD_TYPES.has(t));
    const broad = types.filter(t => !GENERIC_TYPES.has(t) && BROAD_TYPES.has(t));
    term = typeToTerm(specific[0] || broad[0] || "");
  }
  return term;
}

// Geocodifica um CEP brasileiro → coordenadas do CENTRO do CEP (o que o Google
// usa quando você busca "termo + CEP"). Sem CEP válido, retorna null.
async function geocodeCep(cep) {
  const digits = (cep || "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${digits}&components=country:BR&key=${API_KEY}`;
    const r = await (await fetchWithTimeout(url, {}, 6000)).json();
    const loc = r.results?.[0]?.geometry?.location;
    if (loc && typeof loc.lat === "number") return { lat: loc.lat, lng: loc.lng };
  } catch {}
  return null;
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
      lng: p.geometry?.location?.lng ?? null,
      types: p.types || []
    });
  }
  return ordered;
}

// Lentes padrão: mesma busca (CEP/região × termo), ancorada no centro do CEP.
export const VISIBILITY_LENSES = [
  { key: "perto",  label: "Bem perto de você", radius: 1000 },
  { key: "regiao", label: "Na sua região",     radius: 3000 },
];

export async function fetchVisibilityLenses({ placeId, keyword, cep }) {
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

  // Âncora: centro do CEP (igual à busca manual "termo + CEP" no Google).
  // Sem CEP válido, cai pro ponto do próprio negócio.
  const cepCoord = await geocodeCep(cep);
  const aLat = cepCoord?.lat ?? lat;
  const aLng = cepCoord?.lng ?? lng;
  const anchoredAtCep = !!cepCoord;

  // Filtro de categoria/intenção (tipo primário igual + guard de nome).
  const keep = makeCategoryFilter(meR, placeId);

  // 2. Roda cada lente (ordem real do Google) — em paralelo
  const lenses = await Promise.all(VISIBILITY_LENSES.map(async (L) => {
    let raw = [];
    try { raw = await runTextSearch(term, aLat, aLng, L.radius); } catch { raw = []; }

    // Filtra (só aplica se sobrar >=2). NÃO injeta o próprio negócio: a posição
    // só existe se o Places REALMENTE o retornar pra essa categoria+região. Se o
    // Google não classifica o negócio nesse termo, ele fica "não classificado"
    // (inResults=false) — o ranking dos concorrentes segue visível.
    let ordered = raw;
    let filtered = false;
    const f = raw.filter(keep);
    if (f.length >= 2) { ordered = f; filtered = true; }

    const idx = ordered.findIndex(p => p.place_id === placeId);
    const top = ordered.slice(0, 10).map(p => ({ ...p, is_me: p.place_id === placeId }));
    return {
      key: L.key,
      label: L.label,
      radiusKm: L.radius / 1000,
      total: ordered.length,
      rank: idx >= 0 ? idx + 1 : null,
      inResults: idx >= 0,
      filtered,
      top
    };
  }));

  return { term, me, lenses, anchoredAtCep, category: primarySpecificType(meR.types) };
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

// ============================================================
// SEMENTE DO NEGÓCIO (nome + tipos + categoria principal)
// ============================================================
// A API antiga (place/details) só devolve tipos GROSSOS: o Pecorino sai como
// "restaurant", sem sinal de ser italiano. A API nova (places.googleapis.com/v1)
// devolve `primaryTypeDisplayName` — a categoria principal que o dono cadastrou
// no Meu Negócio, já em pt-BR ("Restaurante italiano").
//
// Isso não é cosmético: o termo fino MUDA o ranking. Medido no Pecorino V.
// Leopoldina — #10 em "restaurante", #2 em "restaurante italiano". Com a API
// antiga o chip padrão era sempre a pior versão da vida do dono.
//
// Custo: a nova SUBSTITUI a chamada antiga (não soma). Ambas caem no mesmo SKU
// (Place Details Pro, US$17/1k, 5k grátis/mês) porque `displayName` já é Pro.
// Se a nova falhar (API desligada, quota, timeout), cai pra antiga sozinha.
export async function fetchPlaceSeed(placeId) {
  const key = process.env.PLACES_API_KEY;
  if (!placeId || !key) return null;
  try {
    const r = await fetchWithTimeout(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=pt-BR`,
      { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "displayName,primaryType,primaryTypeDisplayName,types" } },
      6000
    );
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j?.error?.status || `HTTP ${r.status}`);
    return {
      name: j.displayName?.text || null,
      types: j.types || [],
      primaryType: j.primaryType || null,
      primaryDisplay: j.primaryTypeDisplayName?.text || null,
    };
  } catch (err) {
    console.warn("[places-new] fallback pra API antiga:", err.message);
    try {
      const r = await fetchWithTimeout(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}` +
          `&fields=name,types&language=pt-BR&key=${key}`,
        {}, 6000
      );
      const det = (await r.json()).result;
      if (!det) return null;
      return { name: det.name || null, types: det.types || [], primaryType: null, primaryDisplay: null };
    } catch {
      return null;
    }
  }
}

// Sugere 1-3 termos de busca — semente pros chips do formulário (o dono
// confirma / edita / adiciona o dele).
//
// Ordem: (1) categoria PRINCIPAL do Meu Negócio, quando a API nova responde —
// é a fonte autoritativa, não um palpite nosso; (2) nicho detectado no nome
// (pega o que a categoria não pega: "Pizzaria Napolitana" → o dono cadastrou só
// "Pizzaria"); (3) tipos grossos traduzidos, como rede de segurança.
//
// TYPE_PRIORITY é o desempate ARTESANAL de quando não temos a categoria
// principal (API nova fora do ar). Com ela, não adivinhamos: a Bella Paulista
// devolve 5 tipos na antiga (bakery, cafe, restaurant, storage, store) e a nova
// simplesmente diz "Padaria".
const TYPE_PRIORITY = {
  pizza_restaurant: 4, restaurant: 3, meal_takeaway: 2, meal_delivery: 2,
  cafe: 2, bakery: 3, bar: 1,
};
export function suggestTerms(name, types, primaryDisplay, primaryType) {
  const out = [];
  // Dedup ignora caixa, acento e plural: "Loja de bicicleta" (categoria do
  // Google) e "loja de bicicletas" (nosso dicionário) são o mesmo chip. NÃO
  // funde sinônimos de verdade — "drogaria" e "farmácia" seguem separados, e
  // devem: rendem rankings diferentes no Google.
  const dedupKey = (t) => normalizeName(t).split(/\s+/).map((w) => w.replace(/s$/, "")).join(" ");
  const push = (t) => {
    const term = (t || "").toString().trim();
    if (term && !out.some((o) => dedupKey(o) === dedupKey(term))) out.push(term);
  };
  // Categoria principal do Meu Negócio vem primeiro — a menos que o Google tenha
  // classificado o negócio num rótulo vazio de sentido ("establishment") ou de
  // papel na cadeia ("Fabricante"). Nesses casos o nome sabe mais que o cadastro.
  // O guard é no TIPO (código), não no texto pt-BR.
  const primaryVazio = GENERIC_TYPES.has(primaryType) || BROAD_TYPES.has(primaryType);
  const primaryEstrutural = STRUCTURAL_TYPES.has(primaryType);
  if (primaryDisplay && !primaryVazio && !primaryEstrutural) push(primaryDisplay);
  push(detectFromName(name));
  const specific = (types || []).filter(
    (t) => !GENERIC_TYPES.has(t) && !BROAD_TYPES.has(t) && !STRUCTURAL_TYPES.has(t)
  );
  const sorted = [...specific].sort((a, b) => (TYPE_PRIORITY[b] || 0) - (TYPE_PRIORITY[a] || 0));
  for (const t of sorted) {
    push(typeToTermStrict(t));
    if (out.length >= 3) break;
  }
  // Fallback: sem tipo específico (ex: "loja de utilidades"), usa o tipo amplo
  // traduzido — melhor uma semente fraca que chip nenhum (o dono edita depois).
  if (!out.length) {
    const broad = (types || []).filter((t) => !GENERIC_TYPES.has(t) && BROAD_TYPES.has(t));
    for (const t of broad) {
      push(typeToTermStrict(t));
      if (out.length >= 2) break;
    }
  }
  // Último recurso: nada sobrou. Aí até "Fabricante" vale mais que chip nenhum —
  // sem termo não há grade, e o painel abriria vazio. O dono corrige no campo.
  if (!out.length) push(primaryDisplay);
  return out.slice(0, 3);
}

// ============================================================
// RANKING POR AMOSTRAGEM EM GRADE (Passo 0 — spike de validação)
// ============================================================
// Mede a posição REAL do place_id em 5 pontos ao redor do negócio (centro + 4
// cardeais a ~1km), por termo de busca. O Google ranqueia por distância de QUEM
// busca — 1 ponto só (centroide do CEP) não representa isso. A grade aproxima a
// "visão média da região".
// Regras: coords vêm do place_id (não do CEP); ordem RAW do Google pro termo
// naquele ponto (sem filtro de categoria — é o que o cliente vê); NUNCA insere o
// negócio artificialmente (ausência é registrada como null).
// ============================================================

// Desloca um ponto lat/lng por N metros ao norte/leste (negativo = sul/oeste).
function offsetMeters(lat, lng, northM, eastM) {
  const dLat = northM / 111320;
  const dLng = eastM / (111320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}
function gridPoints(lat, lng, spacingM) {
  return [
    { dir: "centro", lat, lng },
    { dir: "N", ...offsetMeters(lat, lng, spacingM, 0) },
    { dir: "S", ...offsetMeters(lat, lng, -spacingM, 0) },
    { dir: "L", ...offsetMeters(lat, lng, 0, spacingM) },
    { dir: "O", ...offsetMeters(lat, lng, 0, -spacingM) },
  ];
}

/**
 * Roda o ranking por grade pra um negócio.
 * @param {string} placeId
 * @param {string[]} terms          1–3 termos de busca
 * @param {number} [spacingM=1000]  distância dos 4 pontos cardeais (m)
 * @param {number} [radius=1000]    raio (bias) do Text Search em cada ponto (m).
 *   VALIDADO no Passo 0: raio ≈ espaçamento é o ponto ótimo. Raio >=2000 em área
 *   densa faz o negócio sumir (teto de 20 do Google puxa concorrentes prominentes);
 *   raio < espaçamento faz os pontos cardeais "não alcançarem" o negócio.
 * @returns {Promise<Object>} { placeId, name, center, spacingM, radius, terms:[
 *   { term, points:[{dir,rank|null,total,top[]}], avg, coverage, competitors[] } ] }
 */
export async function fetchGridRanking({ placeId, terms, spacingM = 1000, radius = 1000 }) {
  if (!placeId) throw new Error("placeId obrigatório");
  if (!API_KEY) throw new Error("PLACES_API_KEY ausente no ambiente");
  const termList = (Array.isArray(terms) ? terms : [terms])
    .map((t) => (t || "").toString().trim()).filter(Boolean).slice(0, 3);
  if (!termList.length) throw new Error("informe ao menos 1 termo");

  // Coords exatas + nome do negócio (substitui o centroide do CEP).
  const detUrl =
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}` +
    `&fields=name,geometry,types&language=pt-BR&key=${API_KEY}`;
  const det = (await (await fetchWithTimeout(detUrl, {}, 6000)).json()).result;
  if (!det?.geometry?.location) throw new Error("negócio sem coordenadas no Google");
  const { lat, lng } = det.geometry.location;
  const points = gridPoints(lat, lng, spacingM);

  // Cada termo: os 5 pontos em paralelo (Text Search com bias no ponto).
  const termsOut = await Promise.all(termList.map(async (term) => {
    const pts = await Promise.all(points.map(async (pt) => {
      let ordered = [];
      try { ordered = await runTextSearch(term, pt.lat, pt.lng, radius); } catch { ordered = []; }
      const idx = ordered.findIndex((p) => p.place_id === placeId);
      return {
        dir: pt.dir,
        rank: idx >= 0 ? idx + 1 : null,   // null = ausente (NUNCA inserido)
        total: ordered.length,
        list: ordered.slice(0, 20),        // lista ordenada do ponto (pra agregar)
      };
    }));
    const present = pts.filter((p) => p.rank != null).map((p) => p.rank);
    const avg = present.length ? Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10 : null;

    // RANKING REGIONAL AGREGADO: une o topo dos 5 pontos e ordena por um score
    // que PENALIZA ausência — quem aparece em mais pontos, em boas posições,
    // ranqueia melhor. Sem isso, um negócio que aparece 1x em #1 furava a fila
    // de quem está sempre em #3. A LISTA e a posição do dono vêm da MESMA
    // medição do Hero (o "#N" do topo bate com a lista).
    const PENALTY = 21;               // "além do top 20" pros pontos onde o negócio some
    const nPts = pts.length || 5;
    const agg = new Map();            // place_id -> { name, rating, reviews, positions[] }
    for (const p of pts) (p.list || []).forEach((biz, i) => {
      const cur = agg.get(biz.place_id) || { place_id: biz.place_id, name: biz.name, rating: biz.rating, reviews: biz.reviews, positions: [] };
      cur.positions.push(i + 1);
      agg.set(biz.place_id, cur);
    });
    const rankingArr = [...agg.values()]
      .map((c) => {
        const sum = c.positions.reduce((a, b) => a + b, 0);
        const score = (sum + PENALTY * (nPts - c.positions.length)) / nPts;
        return {
          place_id: c.place_id, name: c.name, rating: c.rating, reviews: c.reviews,
          _score: score, points: c.positions.length, is_me: c.place_id === placeId,
          // DOIS números, de propósito:
          // `avg`   = média crua dos pontos em que aparece (some quando ausente).
          // `score` = média contando cada ausência como 21ª. É o que ORDENA.
          // Só o `score` pode ir na tela ao lado do ordinal: mostrar `avg` numa
          // lista ordenada por `score` produz "5º com 9,4 acima de 6º com 7,0"
          // (quem some em 1 ponto tem avg boa e posição ruim) — parece bug.
          avg: Math.round((sum / c.positions.length) * 10) / 10,
          score: Math.round(score * 10) / 10,
        };
      })
      .sort((a, b) => a._score - b._score);
    const myIdx = rankingArr.findIndex((c) => c.is_me);
    const rank = myIdx >= 0 ? myIdx + 1 : null;   // posição ORDINAL do dono na região
    // `score` do dono: MESMA conta que ordena a lista. O Hero mostra este número
    // (e não `avg`), senão o topo diz 3,2 e a linha do dono na lista diz outra
    // coisa quando ele some de algum ponto.
    const score = myIdx >= 0 ? rankingArr[myIdx].score : null;
    const strip = ({ _score, place_id, ...r }) => r;
    let ranking = rankingArr.slice(0, 12).map(strip);
    if (myIdx >= 12) ranking.push(strip(rankingArr[myIdx]));   // garante o dono na lista

    return { term, points: pts.map(({ dir, rank, total }) => ({ dir, rank, total })), avg, score, coverage: present.length, rank, total: rankingArr.length, ranking };
  }));

  return { placeId, name: det.name, center: { lat, lng }, spacingM, radius, terms: termsOut };
}
