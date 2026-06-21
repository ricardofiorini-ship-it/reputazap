// ============================================================
// StarTouch — Cron: snapshot semanal de concorrentes
// ============================================================
// ⏸️ PAUSADO (2026-06-21): removido do "crons" do vercel.json enquanto as
// features Pro (Concorrentes/Relatórios) estão escondidas. Pra REATIVAR,
// re-adicione no vercel.json:
//   { "path": "/api/cron/snapshot-competitors", "schedule": "0 4 * * 1" }
// E alinhe o raio aqui (hoje 3000) com o do painel (1000) antes de religar.
//
// Schedule (quando ativo): Vercel Cron — segunda-feira 04:00 UTC (vercel.json)
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
import { sendTransactionalEmail } from "../_lib/email-sender.js";
import { weeklyReportEmail } from "../_lib/email-templates.js";

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
    reports_sent: 0,
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
    .select("id, place_id, name, category_override, user_id, plan")
    .not("place_id", "is", null);

  if (bizErr) {
    console.error("[cron/snapshot] erro ao listar businesses:", bizErr);
    return res.status(500).json({ error: bizErr.message });
  }

  // Emails dos donos + preferências (pro resumo semanal, só Pro)
  const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map((usersList?.users || []).map(u => [u.id, u.email]));
  const userIds = [...new Set((businesses || []).map(b => b.user_id))];
  const { data: prefsRows } = await supabase
    .from("alert_preferences")
    .select("user_id, email_enabled, email_to")
    .in("user_id", userIds);
  const prefsById = new Map((prefsRows || []).map(p => [p.user_id, p]));

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

        // ── RESUMO SEMANAL (Pro) — compara com o snapshot anterior ──────
        // Cobre "te ultrapassou", "nota caiu" e o digest, num email só por semana.
        try {
          if (biz.plan === "pro" && snap.enough && snap.myRank) {
            const prefs = prefsById.get(biz.user_id);
            const to = (prefs?.email_to || "").trim() || emailById.get(biz.user_id);
            const emailOff = prefs && prefs.email_enabled === false;

            if (to && !emailOff) {
              // Snapshot anterior (mais recente antes de hoje)
              const { data: prevRows } = await supabase
                .from("competitor_snapshots")
                .select("my_rating, my_reviews, my_rank, snapshot_date")
                .eq("business_id", biz.id)
                .lt("snapshot_date", today)
                .order("snapshot_date", { ascending: false })
                .limit(1);
              const prev = prevRows?.[0];

              // Só envia a partir do 2º snapshot (precisa de comparação)
              if (prev) {
                const ratingDelta = Number(((snap.me?.rating || 0) - (prev.my_rating || 0)).toFixed(1));
                const reviewsDelta = (snap.me?.reviews || 0) - (prev.my_reviews || 0);
                // convenção: rankDelta positivo = SUBIU (número da posição diminuiu)
                const rankDelta = (prev.my_rank && snap.myRank) ? (prev.my_rank - snap.myRank) : 0;
                const aheadName = snap.myRank > 1 ? (snap.top?.[snap.myRank - 2]?.name || null) : null;

                const tmpl = weeklyReportEmail({
                  bizName: biz.name,
                  ratingNow: snap.me?.rating || 0,
                  ratingDelta,
                  reviewsDelta,
                  rankNow: snap.myRank,
                  rankDelta,
                  total: snap.total,
                  aheadName
                });
                const r = await sendTransactionalEmail({
                  userId: biz.user_id,
                  emailType: "weekly_report",
                  to,
                  subject: tmpl.subject,
                  html: tmpl.html,
                  metadata: { snapshot_date: today, rank: snap.myRank },
                  dedupeByMetadata: { key: "snapshot_date", value: today }
                });
                if (r?.sent) stats.reports_sent++;
              }
            }
          }
        } catch (e) {
          console.error("[cron/snapshot] erro no resumo semanal:", biz.id, e);
        }
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
