export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const API_KEY = process.env.PLACES_API_KEY;
  const query = "SAIF A Loja da Limpeza Carapicuíba SP";

  try {
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name&key=${API_KEY}`
    );
    const data = await searchRes.json();
    const place = data.candidates?.[0];
    if (!place) return res.status(404).json({ error: "Não encontrado" });
    res.json({ place_id: place.place_id, name: place.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
