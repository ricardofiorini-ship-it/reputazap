// ============================================================
// StarTouch — Ranking competitivo
// ============================================================
// Estratégia (a partir da Fase 1 do roadmap backend):
//   1. Default: serve último snapshot do banco (rápido, sem custo)
//      + calcula weekGrowth e history a partir dos últimos 12 snapshots
//   2. Sem snapshot ainda? Cai pro fetch live do Google (compat retro)
//   3. ?fresh=1 (admin only) força call Google ignorando cache
//
// Paywall: nome dos concorrentes só pra plano pro/admin (locking no
// backend, não dá pra burlar via inspetor).
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { fetchRankingByTerm, applyNameLocking } from "./_lib/competitors.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_EMAIL = "ricardo.fiorini@gmail.com";

async function authUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return { error: "Token obrigatório", status: 401 };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { error: "Token inválido", status: 401 };
  return { user: data.user };
}

const isAdmin = (user) => user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

// Calcula weekGrowth e history (sparkline 12 semanas) a partir dos
// snapshots históricos de um business. Retorna Map<place_id, {weekGrowth, history}>.
async function enrichWithHistory(businessId) {
  const enrichment = new Map();

  // Pega últimos 12 snapshots (até 12 semanas, em ordem cronológica desc)
  const { data: snaps } = await supabase
    .from("competitor_snapshots")
    .select("snapshot_date, competitors")
    .eq("business_id", businessId)
    .order("snapshot_date", { ascending: false })
    .limit(12);

  if (!snaps || snaps.length < 2) return enrichment;

  // Para cada place_id que aparece nos snapshots, monta histórico
  // de reviews ao longo do tempo (mais antigo → mais recente)
  const chronological = [...snaps].reverse(); // ASC

  // Coleta todos place_ids únicos
  const allPlaceIds = new Set();
  for (const s of chronological) {
    for (const c of s.competitors || []) {
      if (c?.place_id) allPlaceIds.add(c.place_id);
    }
  }

  for (const pid of allPlaceIds) {
    const history = chronological.map(s => {
      const c = (s.competitors || []).find(x => x.place_id === pid);
      return c ? c.reviews : null;
    }).filter(v => v !== null);

    if (history.length < 2) continue;

    // weekGrowth = reviews mais recente - reviews da semana anterior
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    const weekGrowth = latest - previous;

    enrichment.set(pid, { weekGrowth, history });
  }

  return enrichment;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Sem cache HTTP — snapshot já é "cache" no banco
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  // 1. Auth
  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const user = auth.user;

  // 2. Negócio do usuário
  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select("id, place_id, name, plan, category_override")
    .eq("user_id", user.id)
    .maybeSingle();

  if (bizErr || !biz?.place_id) {
    return res.status(404).json({ error: "Nenhum negócio com Google vinculado" });
  }

  const radius = Math.min(parseInt(req.query.radius, 10) || 3000, 25000);
  const keyword = (req.query.keyword || biz.category_override || "").trim();
  const paid = biz.plan === "pro" || isAdmin(user);

  try {
    // Ranking pela ORDEM REAL do Google (mesmo motor do diagnóstico) — ao vivo,
    // pra o número do app bater com o que o cliente viu no diagnóstico.
    const snap = await fetchRankingByTerm({ placeId: biz.place_id, keyword, radius });

    // Sem concorrentes suficientes OU negócio não aparece pra esse termo:
    // UI honesta (esconde ranking).
    if (!snap.enough || !snap.inResults) {
      return res.json({
        enough: false,
        total: snap.total,
        category: snap.category,
        radius: snap.radius,
        me: snap.me
      });
    }

    // Enriquece top com weekGrowth + history (a partir dos snapshots)
    const enrichment = await enrichWithHistory(biz.id);
    const enrichedTop = snap.top.map(c => {
      const extra = enrichment.get(c.place_id);
      return {
        ...c,
        weekGrowth: extra?.weekGrowth ?? null,
        history: extra?.history ?? null
      };
    });

    // Paywall de nome (free → null)
    const topLocked = applyNameLocking(enrichedTop, paid);

    // Data do último snapshot só pra exibir "última atualização" (histórico)
    let snapshotDate = null;
    const { data: last } = await supabase
      .from("competitor_snapshots")
      .select("snapshot_date")
      .eq("business_id", biz.id)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) snapshotDate = last.snapshot_date;

    return res.json({
      enough: true,
      total: snap.total,
      category: snap.category,
      radius: snap.radius,
      me: snap.me,
      rank_google: snap.myRank,
      ahead: snap.ahead,
      names_locked: !paid,
      top: topLocked,
      snapshot_date: snapshotDate,
      from_snapshot: false
    });
  } catch (err) {
    console.error("[competitors] erro:", err);
    return res.status(500).json({ error: err.message });
  }
}
