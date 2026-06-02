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
