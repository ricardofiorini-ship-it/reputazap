// ============================================================
// StarTouch — Cron: snapshot semanal de concorrentes
// ============================================================
// Schedule: Vercel Cron — segunda-feira 04:00 UTC (vercel.json)
//
// Itera todos os businesses com place_id, busca concorrentes via
// Google Places (helper compartilhado) e grava 1 snapshot por
// business por dia em `competitor_snapshots`.
//
// Idempotência: UNIQUE(business_id, snapshot_date) — re-rodar no
// mesmo dia não duplica.
//
// Auth: Bearer ${CRON_SECRET}. Vercel Cron envia automaticamente
// via `Authorization: Bearer ${CRON_SECRET}` quando configurado.
// Permite chamada manual pra debug.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { fetchRankingByTerm } from "../_lib/competitors.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CRON_SECRET = process.env.CRON_SECRET;

// Pausa entre chamadas pra não estourar rate limit do Google
const SLEEP_MS_BETWEEN = 200;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Verifica auth do cron (Bearer secret OU Vercel cron header)
function checkAuth(req) {
  // Vercel Cron envia o header x-vercel-cron quando dispara
  const isVercelCron = req.headers["x-vercel-cron"] === "1";
  if (isVercelCron) return true;

  if (!CRON_SECRET) {
    console.warn("[cron/snapshot] CRON_SECRET não configurado — rejeitando");
    return false;
  }
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${CRON_SECRET}`;
}

export default async function handler(req, res) {
  // Métricas pra retornar no fim
  const stats = {
    started_at: new Date().toISOString(),
    processed: 0,
    snapshots_created: 0,
    skipped_already_exists: 0,
    errors: [],
    took_ms: 0
  };
  const t0 = Date.now();

  // 1. Auth
  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Não autorizado. Use Bearer ${CRON_SECRET}." });
  }

  // 2. Busca todos os businesses com place_id
  const { data: businesses, error: bizErr } = await supabase
    .from("businesses")
    .select("id, place_id, name, category_override")
    .not("place_id", "is", null);

  if (bizErr) {
    console.error("[cron/snapshot] erro ao listar businesses:", bizErr);
    return res.status(500).json({ error: bizErr.message });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // 3. Itera business por business
  for (const biz of businesses || []) {
    stats.processed++;
    try {
      // Skip se já tem snapshot hoje (idempotência)
      const { data: existing } = await supabase
        .from("competitor_snapshots")
        .select("id")
        .eq("business_id", biz.id)
        .eq("snapshot_date", today)
        .maybeSingle();

      if (existing) {
        stats.skipped_already_exists++;
        continue;
      }

      // Busca dados frescos do Google — ordem real do Google (mesmo motor
      // do diagnóstico e do app), pra os números baterem em todo lugar.
      const snap = await fetchRankingByTerm({
        placeId: biz.place_id,
        keyword: biz.category_override || "",
        radius: 3000
      });

      // Insere snapshot
      const { error: insErr } = await supabase
        .from("competitor_snapshots")
        .insert({
          business_id: biz.id,
          snapshot_date: today,
          my_rating: snap.me?.rating ?? null,
          my_reviews: snap.me?.reviews ?? null,
          my_rank: snap.myRank ?? null,
          total_competitors: snap.total ?? 0,
          category: snap.category,
          radius_meters: snap.radius,
          competitors: snap.enough ? snap.top : [snap.me].filter(Boolean),
          raw_response: null
        });

      if (insErr) {
        stats.errors.push({ business_id: biz.id, name: biz.name, error: insErr.message });
        console.error("[cron/snapshot] erro ao inserir snapshot:", biz.id, insErr);
      } else {
        stats.snapshots_created++;
      }

      // Rate limit local
      await sleep(SLEEP_MS_BETWEEN);

    } catch (e) {
      stats.errors.push({
        business_id: biz.id,
        name: biz.name,
        error: e.message || String(e)
      });
      console.error("[cron/snapshot] erro processando biz:", biz.id, e);
    }
  }

  stats.took_ms = Date.now() - t0;
  console.log("[cron/snapshot] concluído:", JSON.stringify(stats));
  return res.status(200).json(stats);
}
