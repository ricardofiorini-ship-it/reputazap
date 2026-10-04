// Aposentado em 03/10/2026. Era um endpoint de depuração, público e sem limite,
// que consultava o Google Places (Find Place) a cada acesso com uma busca fixa.
// Ninguém no site o chamava — mas qualquer robô podia transformá-lo em conta.
export default function handler(req, res) {
  res.status(410).json({ error: "Endpoint desativado" });
}
