import { fetchWithTimeout } from "./fetch-timeout.js";

// LINK DO GOOGLE MAPS COLADO NA BUSCA (21/10/2026).
//
// A busca por nome depende do Google ACHAR o negócio — e ficha nova, com 1 ou 2
// avaliações, numa cidade menor, o Google simplesmente não devolve. Caso que
// originou: "Studio Gabi Siston Braz" (Rio Grande-RS, 1 avaliação). Só pelo
// nome, nem a busca nem o autocomplete do Google a encontram; vinham estúdios
// de São Paulo. A dona não conseguia ativar o próprio dispositivo, e não era o
// primeiro caso.
//
// O link do perfil é o caminho que NÃO depende de ranking: a pessoa abre o
// próprio negócio no Maps → Compartilhar → Copiar link, cola no campo, e o link
// já diz QUAL ficha é. Formatos aceitos:
//   - maps.app.goo.gl/…, goo.gl/maps/…, share.google/…  (curtos: seguimos o redirect)
//   - google.com/maps/place/<Nome>/@lat,lng…/data=…!1s0x…:0x<cid>…!3d<lat>!4d<lng>
//   - maps.google.com/?cid=<cid>
//   - qualquer um com place_id / query_place_id na URL
//
// Segurança: o servidor só segue redirect pra hosts do Google (lista abaixo).
// Sem isso, colar um link qualquer faria o NOSSO servidor visitar o endereço
// que a pessoa quisesse.

const HOSTS_OK = /(^|\.)(google\.[a-z.]+|goo\.gl|share\.google|app\.goo\.gl)$/i;
const BASE = "https://places.googleapis.com/v1";

export function pareceLinkDoMaps(q) {
  const s = (q || "").trim();
  if (/\s/.test(s)) return false;
  return /^(https?:\/\/)?([a-z0-9-]+\.)*(google\.[a-z.]+|goo\.gl|share\.google)\//i.test(s);
}

// Segue os redirects UM A UM, conferindo o host a cada salto.
async function urlFinal(link) {
  let url = /^https?:\/\//i.test(link) ? link : `https://${link}`;
  for (let i = 0; i < 6; i++) {
    const u = new URL(url);
    if (!HOSTS_OK.test(u.hostname)) throw new Error(`host fora do Google: ${u.hostname}`);
    // Só os curtos precisam de visita; o link longo já tem tudo.
    if (!/^(maps\.app\.goo\.gl|goo\.gl|share\.google|app\.goo\.gl)$/i.test(u.hostname)) return url;
    const r = await fetchWithTimeout(url, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0" } }, 5000);
    const loc = r.headers.get("location");
    if (!loc || r.status < 300 || r.status >= 400) return url;
    url = new URL(loc, url).toString();
  }
  return url;
}

// Tira do link tudo o que identifica a ficha.
export function lerLink(url) {
  const dec = (() => { try { return decodeURIComponent(url); } catch { return url; } })();
  const u = (() => { try { return new URL(url); } catch { return null; } })();
  const out = {};
  const pid = u?.searchParams.get("query_place_id") || u?.searchParams.get("place_id")
    || (dec.match(/!19s(ChIJ[\w-]+)/) || [])[1] || (dec.match(/\b(ChIJ[\w-]{20,})/) || [])[1];
  if (pid) out.place_id = pid;
  const cidParam = u?.searchParams.get("cid");
  if (cidParam && /^\d+$/.test(cidParam)) out.cid = cidParam;
  const hex = dec.match(/!1s0x[0-9a-f]+:0x([0-9a-f]+)/i) || dec.match(/ftid=0x[0-9a-f]+:0x([0-9a-f]+)/i);
  if (hex && !out.cid) out.cid = BigInt("0x" + hex[1]).toString();
  const nome = dec.match(/\/maps\/place\/([^/@?]+)/);
  if (nome) out.nome = nome[1].replace(/\+/g, " ").trim();
  const d34 = dec.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const arroba = dec.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const c = d34 || arroba;
  if (c) out.loc = { lat: +c[1], lng: +c[2] };
  return out;
}

const CAMPOS = "id,displayName,formattedAddress,rating,userRatingCount,googleMapsUri,pureServiceAreaBusiness";

function noFormato(p) {
  return {
    place_id: p.id,
    name: p.displayName?.text || "",
    address: p.formattedAddress || (p.pureServiceAreaBusiness ? "Atende na região do cliente" : ""),
    rating: p.rating || 0,
    total: p.userRatingCount || 0
  };
}

async function porPlaceId(placeId, API_KEY) {
  const r = await fetchWithTimeout(`${BASE}/places/${encodeURIComponent(placeId)}?languageCode=pt-BR`,
    { headers: { "X-Goog-Api-Key": API_KEY, "X-Goog-FieldMask": CAMPOS } }, 6000);
  if (!r.ok) return null;
  const p = await r.json();
  return p?.id ? noFormato(p) : null;
}

const cidDe = (p) => (String(p.googleMapsUri || "").match(/cid=(\d+)/) || [])[1];

// Nome + ponto do link → busca colada no ponto; o cid (quando veio) confere
// que é a MESMA ficha, não o vizinho de nome parecido.
async function porNomeEPonto({ nome, loc, cid }, API_KEY) {
  const r = await fetchWithTimeout(`${BASE}/places:searchText`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": API_KEY, "X-Goog-FieldMask": CAMPOS.split(",").map((c) => "places." + c).join(",") },
    body: JSON.stringify({
      textQuery: nome, languageCode: "pt-BR", regionCode: "BR", includePureServiceAreaBusinesses: true,
      ...(loc ? { locationBias: { circle: { center: { latitude: loc.lat, longitude: loc.lng }, radius: 500 } } } : {})
    })
  }, 6000);
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
  const lista = d.places || [];
  // Com cid, ou bate EXATO ou nada: devolver o primeiro da lista entregaria o
  // vizinho de nome parecido (testado: "Gabi Studio | Estética", na mesma rua)
  // — place_id errado, o pior erro possível aqui (caso de 18/09). Sem match,
  // quem chama tenta pelo cid na API antiga.
  if (cid) {
    const exato = lista.find((p) => cidDe(p) === cid);
    return exato ? noFormato(exato) : null;
  }
  return lista[0] ? noFormato(lista[0]) : null;
}

// Só o cid (link do tipo maps.google.com/?cid=): a API antiga aceita cid direto.
async function porCid(cid, API_KEY) {
  const r = await fetchWithTimeout(
    `https://maps.googleapis.com/maps/api/place/details/json?cid=${cid}&fields=place_id&language=pt-BR&key=${API_KEY}`, {}, 6000);
  const d = await r.json();
  const pid = d?.result?.place_id;
  if (!pid) { console.warn(`[places-link] cid ${cid} sem place_id (status ${d?.status})`); return null; }
  return porPlaceId(pid, API_KEY);
}

// Devolve a lista no formato do searchbiz (0 ou 1 item). Falha GRITA no log:
// link que não resolve calado é o mesmo "não achei" que isto existe pra matar.
export async function negocioDoLink(link, API_KEY) {
  const final = await urlFinal(link.trim());
  const info = lerLink(final);
  let achado = null;
  if (info.place_id) achado = await porPlaceId(info.place_id, API_KEY);
  if (!achado && info.nome) achado = await porNomeEPonto(info, API_KEY);
  if (!achado && info.cid) achado = await porCid(info.cid, API_KEY);
  if (!achado) console.warn(`[places-link] não resolveu: ${link} → ${final.slice(0, 200)} ${JSON.stringify(info)}`);
  return achado ? [achado] : [];
}
