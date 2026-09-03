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
import { suggestTerms, fetchPlaceSeed } from "./_lib/competitors.js";
import { fetchGridRankingCached } from "./_lib/ranking-grid-cache.js";

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
    if (action === "funnel")       return await handleFunnel(req, res);
    if (action === "visitas")      return await handleVisitas(req, res);
    if (action === "grid-suggest") return await handleGridSuggest(req, res);
    if (action === "grid")         return await handleGrid(req, res);
    return res.status(400).json({ error: "Ação desconhecida. Use ?action=stats, list-clients, delete-user, prospects, funnel, visitas, grid-suggest ou grid" });
  } catch (err) {
    console.error("[admin] erro:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ── FUNNEL: funil do convidado (pessoas por passo + queda) ───
// Conta pessoas DISTINTAS (anon_id) que atingiram cada passo na janela de dias.
// signup_complete pode vir sem anon_id (logado no server) → conta por evento.
async function handleFunnel(req, res) {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("funnel_events")
    .select("anon_id, step, created_at")
    .gte("created_at", since)
    .limit(100000);
  if (error) return res.status(500).json({ error: error.message });

  // Passos na ordem do funil + rótulo amigável.
  const STEPS = [
    { key: "guest_search_view",   label: "Abriu a busca" },
    { key: "guest_search_submit", label: "Buscou um negócio" },
    { key: "guest_panel_view",    label: "Viu o painel" },
    { key: "guest_signup_click",  label: "Clicou em criar conta" },
    { key: "signup_complete",     label: "Concluiu o cadastro" },
  ];
  const sets = {}; STEPS.forEach(s => { sets[s.key] = new Set(); });
  let i = 0;
  for (const r of (data || [])) {
    if (!sets[r.step]) continue;
    // Sem anon_id (ex: signup_complete server-side) → conta cada evento.
    sets[r.step].add(r.anon_id || `evt-${i++}`);
  }

  const top = sets[STEPS[0].key].size || 0;
  let prev = null;
  const funnel = STEPS.map(s => {
    const people = sets[s.key].size;
    const pctOfTop = top ? Math.round((people / top) * 100) : 0;
    const dropFromPrev = prev != null && prev > 0 ? Math.round(((prev - people) / prev) * 100) : null;
    prev = people;
    return { key: s.key, label: s.label, people, pctOfTop, dropFromPrev };
  });

  return res.json({ days, total_events: (data || []).length, funnel });
}

// ── VISITAS: a catraca (contagem que não depende de consentimento) ──
// Lê os contadores diários de `page_hits`. Este número responde "quanta gente
// entrou"; o GA4 responde "quanta gente entrou E aceitou cookies" — e as duas
// respostas divergiram por um fator de 5 a 10 na medição de 02/09/2026.
// Ver supabase/schema-visitas.sql.
async function handleVisitas(req, res) {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  // A tabela é por dia (date), não por instante — o corte é em data.
  const desde = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("page_hits")
    .select("dia, path, source, medium, campaign, hits")
    .gte("dia", desde)
    .limit(50000);

  if (error) {
    // Tabela ausente é o caso mais provável de erro aqui, e responder um 500
    // genérico faria parecer bug de código. Diz o que fazer.
    const faltando = /relation|does not exist|schema cache/i.test(error.message || "");
    return res.status(500).json({
      error: faltando
        ? "A tabela page_hits não existe. Rode supabase/schema-visitas.sql uma vez no SQL Editor."
        : error.message,
    });
  }

  const linhas = data || [];
  const total = linhas.reduce((s, r) => s + (r.hits || 0), 0);

  // Somadores simples. Volume esperado: dezenas de linhas por dia.
  const soma = (chave) => {
    const m = new Map();
    for (const r of linhas) m.set(r[chave], (m.get(r[chave]) || 0) + (r.hits || 0));
    return [...m.entries()]
      .map(([k, v]) => ({ nome: k, hits: v, pct: total ? Math.round((v / total) * 100) : 0 }))
      .sort((a, b) => b.hits - a.hits);
  };

  // Origem legível: "ig / paid_social". É o par que diz de onde veio.
  const canais = new Map();
  for (const r of linhas) {
    const k = `${r.source} / ${r.medium}`;
    canais.set(k, (canais.get(k) || 0) + (r.hits || 0));
  }

  const porDia = soma("dia").sort((a, b) => a.nome.localeCompare(b.nome));

  return res.json({
    days,
    total,
    media_dia: porDia.length ? Math.round(total / porDia.length) : 0,
    dias_com_dado: porDia.length,
    por_dia: porDia,
    por_pagina: soma("path").slice(0, 20),
    por_canal: [...canais.entries()]
      .map(([nome, hits]) => ({ nome, hits, pct: total ? Math.round((hits / total) * 100) : 0 }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 20),
    por_campanha: soma("campaign").filter((c) => c.nome !== "(nenhuma)").slice(0, 20),
  });
}

// ── GRID: ranking por grade (comparação admin, Passo 1/3) ────
// Admin-gated: roda a grade nova sem depender da flag RANKING_GRID_ENABLED,
// pra validar endpoint + cache em negócios reais antes de virar a chave.
async function handleGridSuggest(req, res) {
  const placeId = (req.query.place_id || "").toString().trim();
  if (!placeId) return res.status(400).json({ error: "place_id obrigatório" });
  const seed = await fetchPlaceSeed(placeId);
  if (!seed) return res.status(404).json({ error: "Negócio não encontrado" });
  return res.json({
    name: seed.name,
    types: seed.types || [],
    primary_category: seed.primaryDisplay || null,
    suggestions: suggestTerms(seed.name, seed.types, seed.primaryDisplay, seed.primaryType),
  });
}
async function handleGrid(req, res) {
  const placeId = (req.query.place_id || "").toString().trim();
  let terms = (req.query.terms || "").toString().split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3);
  if (!placeId) return res.status(400).json({ error: "place_id obrigatório" });
  // Sem termo → usa o padrão da categoria do Google (1 termo, grátis).
  if (!terms.length) {
    const seed = await fetchPlaceSeed(placeId);
    terms = suggestTerms(seed?.name, seed?.types, seed?.primaryDisplay, seed?.primaryType).slice(0, 1);
    if (!terms.length) return res.status(422).json({ error: "Sem termo padrão pra este negócio — informe um termo." });
  }
  const grid = await fetchGridRankingCached({ placeId, terms });
  return res.json(grid);
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

    // ── 7b. Rastros ligados ao E-MAIL, não ao user_id (Art. 18, V) ──────────
    // Estes ficavam de fora e faziam a exclusão ser parcial: pedido do Art. 18
    // que deixa CPF e endereço no banco não é eliminação. Precisa do e-mail
    // ANTES do passo 8, que apaga o usuário do auth.
    let emailDoUser = null;
    try {
      const { data } = await supabase.auth.admin.getUserById(userId);
      emailDoUser = (data?.user?.email || "").toLowerCase() || null;
    } catch (e) {
      summary.warnings.push("email do user: " + e.message);
    }

    if (emailDoUser) {
      // orders: ANONIMIZA, não apaga. Nota fiscal é obrigação legal e a
      // Política declara 5 anos pra dado fiscal — o que sai é a identificação
      // (shipping inteiro, com CPF e endereço, MAIS a coluna `email`). Ficam
      // valor, data e status, que é o que a obrigação exige. Zerar só o
      // shipping e deixar o e-mail seria meia anonimização.
      try {
        const { count, error } = await supabase
          .from("orders")
          .update({ shipping: null, email: null }, { count: "exact" })
          .eq("email", emailDoUser);
        if (error) throw new Error(error.message);
        summary.anonymized = { orders: count || 0 };
      } catch (e) {
        summary.warnings.push("orders: " + e.message);
      }

      try {
        const { count, error } = await supabase
          .from("radar_leads").delete({ count: "exact" }).eq("email", emailDoUser);
        if (error) throw new Error(error.message);
        summary.deleted.radar_leads = count || 0;
      } catch (e) {
        summary.warnings.push("radar_leads: " + e.message);
      }

      try {
        const { count, error } = await supabase
          .from("titular_requests").delete({ count: "exact" }).eq("email", emailDoUser);
        if (error) throw new Error(error.message);
        summary.deleted.titular_requests = count || 0;
      } catch (e) {
        summary.warnings.push("titular_requests: " + e.message);
      }
    }

    // funnel_events, places_cache e rate_limits NÃO são apagados aqui, e é
    // decisão, não esquecimento: nenhum deles guarda vínculo com este usuário.
    // funnel_events tem id aleatório de navegador; places_cache é resposta do
    // Google por place_id; rate_limits é IP de quem chamou. Não há chave pra
    // achar "as linhas desta pessoa" — sair varrendo por aproximação apagaria
    // dado de terceiro. Os três são cobertos pelo PRAZO, no cron de retenção.

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
