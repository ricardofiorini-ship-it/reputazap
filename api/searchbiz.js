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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { q, cep } = req.query;
  if (!q) return res.status(400).json({ error: "Query obrigatória" });

  const API_KEY = process.env.PLACES_API_KEY;
  const cepDigits = (cep || "").replace(/\D/g, "");

  try {
    // 1. Se veio CEP, geocoda pra ancorar a busca no ponto do cliente. Essa
    //    coordenada guia tanto a busca (Nearby Search) quanto a ordenacao final.
    let origin = null;
    if (cepDigits.length === 8) {
      try {
        const geoRes = await fetchWithTimeout(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${cepDigits}&components=country:BR&language=pt-BR&key=${API_KEY}`,
          {}, 5000
        );
        const geo = await geoRes.json();
        const loc = geo.results?.[0]?.geometry?.location;
        if (loc) origin = { lat: loc.lat, lng: loc.lng };
      } catch (e) {
        console.warn("[searchbiz] geocoding falhou, seguindo sem ancora de CEP:", e.message);
      }
    }

    let raw = [];

    // 2. COM ponto do CEP: usa Nearby Search com rankby=distance. Diferente da
    //    Text Search (onde location/radius e' so uma preferencia fraca que o
    //    nome da cidade no texto atropela), o Nearby ANCORA de verdade no ponto
    //    e devolve os lugares que casam com o nome JA ORDENADOS pela distancia
    //    real — a unidade mais proxima primeiro. E' o que o Google Maps faz
    //    quando voce busca uma rede perto de um lugar. Resolve o caso "rede com
    //    varias unidades" de forma confiavel (a loja perto entra na lista, em
    //    vez de so as mais "famosas" da cidade).
    if (origin) {
      const nearbyUrl =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${encodeURIComponent(q)}` +
        `&location=${origin.lat},${origin.lng}&rankby=distance&language=pt-BR&key=${API_KEY}`;
      try {
        const nRes = await fetchWithTimeout(nearbyUrl, {}, 8000);
        const nData = await nRes.json();
        raw = nData.results || [];
      } catch (e) {
        console.warn("[searchbiz] nearby search falhou, caindo pro text search:", e.message);
      }
    }

    // 3. SEM CEP (ou Nearby vazio) → Text Search ampla (ate 20 lugares). Cobre
    //    busca por cidade/nome digitados no texto e serve de rede de seguranca.
    if (!raw.length) {
      const textRes = await fetchWithTimeout(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&language=pt-BR&region=br&key=${API_KEY}`,
        {}, 8000
      );
      const tData = await textRes.json();
      raw = tData.results || [];
    }

    if (!raw.length) {
      return res.json({ results: [] });
    }

    // Filtra lojas fechadas/temporariamente fechadas — Google mantem no indice
    // mesmo apos o dono fechar; mostrar essas dava resultado confuso pro usuario.
    raw = raw.filter(p => !p.business_status || p.business_status === "OPERATIONAL");

    if (!raw.length) {
      return res.json({ results: [] });
    }

    // 4. Ordena pela proximidade ao CEP. O Nearby ja vem em ordem de distancia,
    //    mas recalcular aqui garante consistencia (inclusive no fallback) e
    //    permite devolver a distancia em metros pra UI.
    let ordered = raw;
    if (origin) {
      ordered = raw
        .map(p => ({ ...p, _dist: haversine(origin, p.geometry?.location) }))
        .sort((a, b) => a._dist - b._dist);
    }

    // Com ancora de CEP, corta nos 5 mais proximos; sem CEP, mostra ate 20.
    const limit = origin ? 5 : 20;
    const results = ordered.slice(0, limit).map(p => ({
      place_id: p.place_id,
      name: p.name,
      // Nearby Search devolve `vicinity` (endereco curto); Text Search devolve
      // `formatted_address`. Usa o que existir.
      address: p.formatted_address || p.vicinity || "",
      rating: p.rating || 0,
      total: p.user_ratings_total || 0,
      ...(typeof p._dist === "number" && isFinite(p._dist)
        ? { distance_meters: Math.round(p._dist) }
        : {})
    }));

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
