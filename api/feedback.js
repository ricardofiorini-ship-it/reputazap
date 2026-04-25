import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { place_id, text } = req.body;
  if (!place_id || !text) return res.status(400).json({ error: "Campos obrigatórios" });

  try {
    await supabase.from("feedbacks").insert({ place_id, text });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
