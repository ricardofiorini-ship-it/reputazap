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
    // 1. Se veio CEP, geocoda ANTES da busca. O ponto (lat/lng) do CEP e' usado
    //    em DOIS momentos: (a) como VIES geografico (location+radius) na propria
    //    Text Search do Google e (b) pra ordenar por proximidade depois.
    //    Sem o vies, o Google devolve as unidades mais "famosas" da cidade (por
    //    numero de reviews); a loja mais PERTO do cliente pode nem entrar na lista
    //    dos 20 candidatos — e ai nenhum reordenamento posterior consegue resgatar.
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
        console.warn("[searchbiz] geocoding falhou, seguindo sem vies geografico:", e.message);
      }
    }

    // 2. Text Search (e nao Find Place): retorna uma LISTA de lugares (ate 20 por
    //    pagina), essencial pra redes com varias unidades. Com CEP resolvido,
    //    aplica vies geografico de ~12km ao redor do CEP — forte o bastante pra
    //    trazer o cluster local da rede, mas como location/radius e' PREFERENCIA
    //    (nao filtro rigido), unidades um pouco mais longe ainda podem aparecer.
    let searchUrl =
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&language=pt-BR&region=br&key=${API_KEY}`;
    if (origin) {
      searchUrl += `&location=${origin.lat},${origin.lng}&radius=12000`;
    }
    const searchRes = await fetchWithTimeout(searchUrl, {}, 8000);
    const data = await searchRes.json();

    if (!data.results?.length) {
      return res.json({ results: [] });
    }

    // Filtra lojas fechadas/temporariamente fechadas — Google mantem no indice
    // mesmo apos o dono fechar; mostrar essas dava resultado confuso pro usuario.
    data.results = data.results.filter(p =>
      !p.business_status || p.business_status === "OPERATIONAL"
    );

    if (!data.results.length) {
      return res.json({ results: [] });
    }

    // 3. Ordena os candidatos pela proximidade ao CEP — pra redes (varias
    //    unidades), a loja mais perto do cliente fica no topo (em vez do "best
    //    match" do Google, que costuma ser a unidade com mais reviews).
    let ordered = data.results;
    if (origin) {
      ordered = data.results
        .map(p => ({ ...p, _dist: haversine(origin, p.geometry?.location) }))
        .sort((a, b) => a._dist - b._dist);
    }

    const limit = cepDigits.length === 8 ? 5 : 20;
    const results = ordered.slice(0, limit).map(p => ({
      place_id: p.place_id,
      name: p.name,
      address: p.formatted_address || "",
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
