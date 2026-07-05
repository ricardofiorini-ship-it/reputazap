// ============================================================
// StarTouch — Auditoria: camada Google (Places API)
// ============================================================
// Lê o Place Details UMA vez e transforma cada campo auditável num item
// de checklist { id, label, status, detail }. status ∈ pass | fail | na.
//
// REGRA DE OURO (herdada da FUNIL-IMPACTO-SPEC): cada ✗/✓ vem de verificação
// REAL. Só entram no checklist os campos que a Places API de fato retorna e
// que dão pra avaliar sem chutar. O que não dá pra auditar, NÃO EXIBIR —
// então não existe item aqui pra "produtos cadastrados" ou "avaliações sem
// resposta" (a Places API não devolve resposta do dono de forma confiável).
// ============================================================
import { fetchWithTimeout } from "../fetch-timeout.js";

const API_KEY = process.env.PLACES_API_KEY;

// Tipos genéricos do Google que não servem como "categoria" (mesma lista usada
// em competitors.js / bizinfo.js — mantém a leitura de categoria consistente).
const GENERIC_TYPES = new Set([
  "point_of_interest", "establishment", "premise", "geocode",
  "political", "store_storage",
]);

// Campos que precisamos do Place Details pra rodar a auditoria Google inteira.
const FIELDS = [
  "name", "rating", "user_ratings_total", "types",
  "formatted_address", "formatted_phone_number", "international_phone_number",
  "website", "url", "opening_hours", "editorial_summary",
  "business_status", "photos",
].join(",");

// Busca o Place Details cru. Lança se a key faltar ou o Google não devolver o
// negócio — quem chama decide como reportar (a auditoria Google é o alicerce da
// página, então sem ela não há o que montar).
export async function fetchPlaceDetails(placeId) {
  if (!API_KEY) throw new Error("PLACES_API_KEY ausente no ambiente");
  if (!placeId) throw new Error("place_id obrigatório");
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}&fields=${FIELDS}&language=pt-BR&key=${API_KEY}`;
  const res = await fetchWithTimeout(url, {}, 7000);
  const data = await res.json();
  if (!data.result) {
    const why = data.status ? `${data.status}${data.error_message ? ` — ${data.error_message}` : ""}` : "sem result";
    throw new Error(`Google Places não retornou o negócio (${why})`);
  }
  return data.result;
}

const item = (id, label, status, detail) => ({ id, label, status, detail });

// Primeiro tipo específico (o que serve de "categoria" pra IA/busca).
function specificCategory(types) {
  return (types || []).find((t) => !GENERIC_TYPES.has(t)) || null;
}
// Deixa o tipo do Google legível ("hair_care" → "hair care").
const humanizeType = (t) => (t || "").replace(/_/g, " ");

// Recebe o result do Place Details e devolve:
//  - business: resumo do negócio pro Bloco A
//  - items: checklist do Bloco B (parte Google)
//  - website: a URL que o Google conhece (semente pra camada de site)
export function auditGoogle(result) {
  const items = [];

  // 1) Categoria específica definida no Google.
  const category = specificCategory(result.types);
  items.push(
    category
      ? item("category", "Categoria definida no Google", "pass", `Classificado como "${humanizeType(category)}".`)
      : item("category", "Categoria definida no Google", "fail", "Sem categoria específica — o Google e as IAs não sabem o que você faz.")
  );

  // 2) Descrição do perfil (editorial_summary). Curta demais também conta como falha.
  const overview = (result.editorial_summary?.overview || "").trim();
  items.push(
    overview.length >= 30
      ? item("description", "Descrição preenchida no perfil", "pass", "O perfil tem uma descrição do negócio.")
      : item("description", "Descrição preenchida no perfil", "fail", "Sem descrição com os termos que as pessoas buscam.")
  );

  // 3) Telefone cadastrado.
  const phone = result.formatted_phone_number || result.international_phone_number || null;
  items.push(
    phone
      ? item("phone", "Telefone no perfil", "pass", `Telefone cadastrado (${phone}).`)
      : item("phone", "Telefone no perfil", "fail", "Sem telefone no perfil do Google.")
  );

  // 4) Horário de funcionamento.
  const hasHours = Array.isArray(result.opening_hours?.periods) && result.opening_hours.periods.length > 0;
  items.push(
    hasHours
      ? item("hours", "Horário de funcionamento", "pass", "Horários cadastrados no perfil.")
      : item("hours", "Horário de funcionamento", "fail", "Sem horário de funcionamento cadastrado.")
  );

  // 5) Fotos no perfil. A Places API expõe no máximo ~10 refs; tratamos "3+"
  //    como saudável e reportamos o que dá pra ver (sem prometer o total exato).
  const photoCount = Array.isArray(result.photos) ? result.photos.length : 0;
  items.push(
    photoCount >= 3
      ? item("photos", "Fotos no perfil", "pass", `Perfil com fotos publicadas (${photoCount}+).`)
      : item("photos", "Fotos no perfil", "fail", photoCount > 0
          ? `Só ${photoCount} foto(s) — perfis com fotos aparecem mais.`
          : "Sem fotos no perfil.")
  );

  // 6) Site vinculado no Google (também é a semente da auditoria de site).
  const website = (result.website || "").trim() || null;
  items.push(
    website
      ? item("website", "Site vinculado ao Google", "pass", "O perfil aponta para um site.")
      : item("website", "Site vinculado ao Google", "fail", "Nenhum site vinculado ao perfil do Google.")
  );

  const business = {
    name: result.name || null,
    category: category ? humanizeType(category) : null,
    category_type: category,
    rating: typeof result.rating === "number" ? result.rating : null,
    reviews_total: result.user_ratings_total || 0,
    address: result.formatted_address || null,
    phone,
    website,
    gmaps_url: result.url || null,
    business_status: result.business_status || null,
  };

  return { business, items, website, phone };
}
