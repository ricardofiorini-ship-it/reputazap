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
import { fetchWithTimeout } from "./_lib/fetch-timeout.js";

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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const action = req.query.action;

  try {
    if (action === "stats")        return await handleStats(req, res);
    if (action === "list-clients") return await handleListClients(req, res);
    if (action === "delete-user")  return await handleDeleteUser(req, res, admin);
    if (action === "prospects")    return await handleProspects(req, res);
    return res.status(400).json({ error: "Ação desconhecida. Use ?action=stats, list-clients, delete-user ou prospects" });
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

  // Pega todas as placas (incluindo last_tapped_at pra calcular ultimo toque)
  const { data: plates } = await supabase
    .from("plates")
    .select("business_id, status, code, product_type, total_taps, last_tapped_at, activated_at, channel_name");
  const platesByBiz = {};
  (plates || []).forEach(p => {
    if (!platesByBiz[p.business_id]) platesByBiz[p.business_id] = [];
    platesByBiz[p.business_id].push(p);
  });

  // Pega TODOS os snapshots de cada business (pra ter nota inicial + atual)
  // Ordenado DESC: o primeiro de cada business e o mais novo; o ultimo e o mais antigo
  const { data: snapshots } = await supabase
    .from("competitor_snapshots")
    .select("business_id, snapshot_date, competitors")
    .order("snapshot_date", { ascending: false });
  const latestSnapByBiz = {};
  const firstSnapByBiz = {};
  (snapshots || []).forEach(s => {
    if (!latestSnapByBiz[s.business_id]) latestSnapByBiz[s.business_id] = s;
    firstSnapByBiz[s.business_id] = s; // ultima iteracao = snapshot mais antigo
  });

  // Monta os clientes
  const clients = users
    .map(u => {
      const meta = u.user_metadata || {};
      const biz = bizByUser[u.id];
      const bizPlates = biz ? (platesByBiz[biz.id] || []) : [];
      const activePlates = bizPlates.filter(p => p.status === "active");
      const totalTaps = bizPlates.reduce((s, p) => s + (p.total_taps || 0), 0);

      // Ultimo toque (max de last_tapped_at em todas as placas do negocio)
      const lastTapAt = bizPlates.reduce((max, p) => {
        if (!p.last_tapped_at) return max;
        const t = new Date(p.last_tapped_at).getTime();
        return t > max ? t : max;
      }, 0);

      // Helper pra extrair nota+reviews do snapshot procurando o proprio negocio
      const extractMyRating = (snap) => {
        if (!snap || !Array.isArray(snap.competitors)) return null;
        const me = snap.competitors.find(c => c.place_id === biz?.place_id || c.isYou);
        if (!me) return null;
        return {
          rating: me.rating || null,
          reviews: me.reviews || me.user_ratings_total || null
        };
      };

      // Nota inicial (primeiro snapshot) + atual (ultimo snapshot)
      let initialRating = null;
      let initialReviews = null;
      let initialSnapDate = null;
      let googleRating = null;
      let googleReviews = null;
      if (biz) {
        const latest = extractMyRating(latestSnapByBiz[biz.id]);
        if (latest) {
          googleRating = latest.rating;
          googleReviews = latest.reviews;
        }
        const first = extractMyRating(firstSnapByBiz[biz.id]);
        if (first) {
          initialRating = first.rating;
          initialReviews = first.reviews;
          initialSnapDate = firstSnapByBiz[biz.id].snapshot_date;
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
          lastTapAt: lastTapAt ? new Date(lastTapAt).toISOString() : null,
          list: bizPlates.map(p => ({
            code: p.code,
            status: p.status,
            product_type: p.product_type,
            channel_name: p.channel_name,
            total_taps: p.total_taps,
            last_tapped_at: p.last_tapped_at,
            activated_at: p.activated_at
          }))
        },
        // Google: nota atual + inicial (do primeiro e ultimo snapshot)
        google: googleRating != null ? {
          rating: googleRating,
          reviews: googleReviews,
          snapshot_date: latestSnapByBiz[biz?.id]?.snapshot_date || null,
          initial_rating: initialRating,
          initial_reviews: initialReviews,
          initial_snapshot_date: initialSnapDate
        } : null
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return res.json({ ok: true, clients, count: clients.length });
}

// ── DELETE USER (cascade) ────────────────────────────────────
// Apaga: auth.users + businesses + feedbacks + competitor_snapshots
//        + email_log + alert_preferences (se existir)
// Placas: devolve pro estoque (status='in_stock', business_id=null)
//         em vez de deletar — assim recupera código pra outro cliente.
//
// Protecao: bloqueia se user_id = self (Ricardo nao deleta ele mesmo)
async function handleDeleteUser(req, res, admin) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Use POST ou DELETE" });
  }

  const userId = req.query.user_id || req.body?.user_id;
  if (!userId) return res.status(400).json({ error: "user_id obrigatório" });

  // Protecao: nao deletar o proprio admin
  if (userId === admin.id) {
    return res.status(400).json({ error: "Não pode deletar sua própria conta admin" });
  }

  const summary = {
    user_id: userId,
    deleted: {
      auth_user: false,
      businesses: 0,
      feedbacks: 0,
      snapshots: 0,
      email_logs: 0,
      alert_preferences: 0
    },
    plates_returned_to_stock: 0,
    warnings: []
  };

  try {
    // 1. Acha os businesses do user
    const { data: bizs } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("user_id", userId);
    const bizIds = (bizs || []).map(b => b.id);

    // 2. Devolve placas pro estoque (mantém código + histórico de taps, perde vínculo)
    if (bizIds.length) {
      const { data: returnedPlates, error: platesErr } = await supabase
        .from("plates")
        .update({
          business_id: null,
          status: "in_stock",
          channel_name: null,
          activated_at: null
        })
        .in("business_id", bizIds)
        .select("id");
      if (platesErr) summary.warnings.push("plates: " + platesErr.message);
      else summary.plates_returned_to_stock = (returnedPlates || []).length;

      // 3. Apaga feedbacks dos businesses
      const { count: fbCount, error: fbErr } = await supabase
        .from("feedbacks")
        .delete({ count: "exact" })
        .in("business_id", bizIds);
      if (fbErr) summary.warnings.push("feedbacks: " + fbErr.message);
      else summary.deleted.feedbacks = fbCount || 0;

      // 4. Apaga snapshots dos businesses
      const { count: snapCount, error: snapErr } = await supabase
        .from("competitor_snapshots")
        .delete({ count: "exact" })
        .in("business_id", bizIds);
      if (snapErr) summary.warnings.push("snapshots: " + snapErr.message);
      else summary.deleted.snapshots = snapCount || 0;

      // 5. Apaga os businesses
      const { count: bizCount, error: bizDelErr } = await supabase
        .from("businesses")
        .delete({ count: "exact" })
        .eq("user_id", userId);
      if (bizDelErr) summary.warnings.push("businesses: " + bizDelErr.message);
      else summary.deleted.businesses = bizCount || 0;
    }

    // 6. Apaga email_log do user (se a tabela existir)
    try {
      const { count: emailCount } = await supabase
        .from("email_log")
        .delete({ count: "exact" })
        .eq("user_id", userId);
      summary.deleted.email_logs = emailCount || 0;
    } catch (e) {
      summary.warnings.push("email_log: " + e.message);
    }

    // 7. Apaga alert_preferences do user (se a tabela existir)
    try {
      const { count: alertCount } = await supabase
        .from("alert_preferences")
        .delete({ count: "exact" })
        .eq("user_id", userId);
      summary.deleted.alert_preferences = alertCount || 0;
    } catch (e) {
      summary.warnings.push("alert_preferences: " + e.message);
    }

    // 8. Por fim, deleta o user em auth.users
    const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
    if (authErr) {
      return res.status(500).json({
        error: "Dados removidos mas auth.user não deletou: " + authErr.message,
        summary
      });
    }
    summary.deleted.auth_user = true;

    console.log("[admin.delete-user]", JSON.stringify(summary));
    return res.json({ ok: true, summary });
  } catch (err) {
    console.error("[admin.delete-user] erro:", err);
    return res.status(500).json({ error: err.message, summary });
  }
}

// ── PROSPECTS: gera lista de alvos (negócios por termo + região) ──────
// CEP de 8 dígitos vira cidade/UF via ViaCEP pra ancorar a busca no Brasil.
async function resolveLoc(loc) {
  const digits = (loc || "").replace(/\D/g, "");
  if (digits.length === 8) {
    try {
      const v = await fetch(`https://viacep.com.br/ws/${digits}/json/`).then(r => r.json());
      if (v && !v.erro) return [v.localidade, v.uf].filter(Boolean).join(" ");
    } catch {}
  }
  return loc || "";
}

async function handleProspects(req, res) {
  const API_KEY = process.env.PLACES_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "PLACES_API_KEY ausente" });

  const q = (req.query.q || "").trim();
  const loc = (req.query.loc || "").trim();
  if (q.length < 2) return res.status(400).json({ error: "Informe o termo de busca (q)" });

  const locExpanded = await resolveLoc(loc);
  const query = [q, locExpanded].filter(Boolean).join(" ");

  // Text Search com paginação (até 2 páginas ≈ 40 resultados).
  // next_page_token só fica válido ~2s depois — aguardamos antes da 2ª página.
  const collected = [];
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=pt-BR&region=br&key=${API_KEY}`;
  for (let page = 0; page < 2; page++) {
    const data = await fetchWithTimeout(url, {}, 8000).then(r => r.json());
    for (const p of (data.results || [])) {
      if (p.business_status && p.business_status !== "OPERATIONAL") continue;
      if (typeof p.rating !== "number") continue;
      collected.push(p);
    }
    if (!data.next_page_token) break;
    await new Promise(r => setTimeout(r, 2200));
    url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${data.next_page_token}&key=${API_KEY}`;
  }

  // Dedup + monta prospects com link de diagnóstico pronto
  const seen = new Set();
  const prospects = [];
  for (const p of collected) {
    if (seen.has(p.place_id)) continue;
    seen.add(p.place_id);
    const rating = p.rating || 0;
    const reviews = p.user_ratings_total || 0;
    // A ordem do Google PARA ESTE TERMO é o ranking: posição = ordem na lista,
    // e quem está logo acima é o item anterior. Permite montar a mensagem
    // customizada sem chamadas extras.
    const rank = prospects.length + 1;
    const ahead = prospects.length ? prospects[prospects.length - 1] : null;
    prospects.push({
      place_id: p.place_id,
      name: p.name,
      address: p.formatted_address || "",
      rating,
      reviews,
      rank,
      aheadName: ahead ? ahead.name : null,
      aheadRating: ahead ? ahead.rating : null,
      reviewsToNext: ahead ? Math.max(0, ahead.reviews - reviews) : 0,
      // "Alvo quente": bom produto (nota >= 4.0) mas coletando pouco
      isTarget: rating >= 4.0 && reviews >= 3 && reviews <= 150,
      diagnostico: `/diagnostico?place_id=${encodeURIComponent(p.place_id)}&keyword=${encodeURIComponent(q)}`
    });
  }

  return res.json({ ok: true, term: q, location: locExpanded, total: prospects.length, prospects });
}
