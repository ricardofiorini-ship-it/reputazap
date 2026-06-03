// ============================================================
// /api/admin — endpoint protegido para o admin (Ricardo) ver
// dados agregados dos clientes
//
// Auth: JWT do Supabase. Email do user precisa estar na lista
// ADMIN_EMAILS abaixo. Hoje só ricardo.fiorini@gmail.com.
//
// Ações:
//   ?action=stats         GET — números gerais (total clientes,
//                         placas ativas, ativações últimas 7 dias)
//   ?action=list-clients  GET — lista de clientes com dados
//                         agregados (nome, email, whats, plano,
//                         placas ativas, criado_em, ultimo_login)
// ============================================================

import { createClient } from "@supabase/supabase-js";

// Lista de emails autorizados como admin (hardcoded)
const ADMIN_EMAILS = new Set([
  "ricardo.fiorini@gmail.com"
]);

// Service key — só backend, NUNCA expor
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Cliente Supabase só pra validar JWT do admin
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Valida JWT do header Authorization. Retorna user se for admin,
 * ou null se não for autorizado.
 */
async function requireAdmin(req, res) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Token ausente" });
    return null;
  }
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: "Token inválido" });
    return null;
  }
  const email = (data.user.email || "").toLowerCase();
  if (!ADMIN_EMAILS.has(email)) {
    res.status(403).json({ error: "Acesso negado — só admins" });
    return null;
  }
  return data.user;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const action = req.query.action;

  try {
    if (action === "stats")        return await handleStats(req, res);
    if (action === "list-clients") return await handleListClients(req, res);
    return res.status(400).json({ error: "Ação desconhecida. Use ?action=stats ou ?action=list-clients" });
  } catch (err) {
    console.error("[admin] erro:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ── STATS: números gerais do sistema ─────────────────────────
async function handleStats(req, res) {
  // Total de users (auth.users)
  const { data: usersList, error: usersErr } = await supabase.auth.admin.listUsers({
    page: 1, perPage: 1000
  });
  if (usersErr) return res.status(500).json({ error: usersErr.message });
  const totalClients = usersList?.users?.length || 0;

  // Total de negócios
  const { count: totalBusinesses } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true });

  // Negócios por plano
  const { data: plansData } = await supabase
    .from("businesses")
    .select("plan");
  const planCounts = (plansData || []).reduce((acc, b) => {
    const p = b.plan || "free";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  // Total de placas e por status
  const { data: platesData } = await supabase
    .from("plates")
    .select("status");
  const plateCounts = (platesData || []).reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, {});

  // Ativações últimas 7 dias
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: activations7d } = await supabase
    .from("plates")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .gte("activated_at", since);

  // Cadastros últimos 7 dias (filtro no array — auth admin não tem filtro de data)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const signups7d = (usersList?.users || []).filter(u => {
    return new Date(u.created_at).getTime() >= sevenDaysAgo;
  }).length;

  // Total de feedbacks (avaliações da peneira Pro)
  const { count: totalFeedbacks } = await supabase
    .from("feedbacks")
    .select("*", { count: "exact", head: true });

  return res.json({
    ok: true,
    stats: {
      totalClients,
      signups7d,
      totalBusinesses,
      planCounts,
      plateCounts,
      activations7d,
      totalFeedbacks
    }
  });
}

// ── LIST CLIENTS: tabela completa pra revisão ────────────────
async function handleListClients(req, res) {
  // Pega todos os users
  const { data: usersList, error: usersErr } = await supabase.auth.admin.listUsers({
    page: 1, perPage: 1000
  });
  if (usersErr) return res.status(500).json({ error: usersErr.message });
  const users = usersList?.users || [];

  // Pega todos os businesses (1 por user)
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, user_id, name, place_id, plan, created_at, address");
  const bizByUser = {};
  (businesses || []).forEach(b => { bizByUser[b.user_id] = b; });

  // Pega todas as placas e conta ativas por business_id
  const { data: plates } = await supabase
    .from("plates")
    .select("business_id, status, code, product_type, total_taps, activated_at, channel_name");
  const platesByBiz = {};
  (plates || []).forEach(p => {
    if (!platesByBiz[p.business_id]) platesByBiz[p.business_id] = [];
    platesByBiz[p.business_id].push(p);
  });

  // Pega último snapshot de cada business (pra ter nota Google)
  const { data: snapshots } = await supabase
    .from("competitor_snapshots")
    .select("business_id, snapshot_date, competitors")
    .order("snapshot_date", { ascending: false });
  const latestSnapByBiz = {};
  (snapshots || []).forEach(s => {
    if (!latestSnapByBiz[s.business_id]) latestSnapByBiz[s.business_id] = s;
  });

  // Monta os clientes
  const clients = users
    .map(u => {
      const meta = u.user_metadata || {};
      const biz = bizByUser[u.id];
      const bizPlates = biz ? (platesByBiz[biz.id] || []) : [];
      const activePlates = bizPlates.filter(p => p.status === "active");
      const totalTaps = bizPlates.reduce((s, p) => s + (p.total_taps || 0), 0);

      // Tenta achar a nota Google do snapshot (procura o próprio negócio na lista de concorrentes)
      let googleRating = null;
      let googleReviews = null;
      if (biz) {
        const snap = latestSnapByBiz[biz.id];
        if (snap && Array.isArray(snap.competitors)) {
          const me = snap.competitors.find(c => c.place_id === biz.place_id || c.isYou);
          if (me) {
            googleRating = me.rating || null;
            googleReviews = me.reviews || me.user_ratings_total || null;
          }
        }
      }

      return {
        user_id: u.id,
        email: u.email,
        name: meta.name || meta.full_name || (u.email || "").split("@")[0] || "",
        phone: meta.phone || null,
        provider: u.app_metadata?.provider || "email",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        // Negócio
        business: biz ? {
          id: biz.id,
          name: biz.name,
          place_id: biz.place_id,
          address: biz.address,
          plan: biz.plan || "free",
          created_at: biz.created_at
        } : null,
        // Placas
        plates: {
          total: bizPlates.length,
          active: activePlates.length,
          totalTaps,
          list: bizPlates.map(p => ({
            code: p.code,
            status: p.status,
            product_type: p.product_type,
            channel_name: p.channel_name,
            total_taps: p.total_taps,
            activated_at: p.activated_at
          }))
        },
        // Google (do snapshot semanal)
        google: googleRating != null ? {
          rating: googleRating,
          reviews: googleReviews,
          snapshot_date: latestSnapByBiz[biz?.id]?.snapshot_date || null
        } : null
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return res.json({ ok: true, clients, count: clients.length });
}
