// ============================================================
// StarTouch — API de placas (dispatcher por ?action=)
// Actions admin: create-batch | list-batches | list-stock
// Action cliente: activate (ETAPA 7)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { generateBatchCodes } from "./_lib/plates.js";
import { sendInBackground } from "./_lib/email-sender.js";
import { firstDeviceEmail, additionalDeviceEmail } from "./_lib/email-templates.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// MVP: admin gating por email hardcoded (evoluir pra is_admin depois)
const ADMIN_EMAIL = "ricardo.fiorini@gmail.com";

const VALID_TYPES = ["placa_balcao", "placa_mesa", "pulseira_nfc", "adesivo_nfc"];

async function authUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return { error: "Token obrigatório", status: 401 };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { error: "Token inválido", status: 401 };
  return { user: data.user };
}

function isAdmin(user) {
  return user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// ── ADMIN: criar lote (batch + N placas in_stock) ──────────
async function handleCreateBatch(req, res, user) {
  if (!isAdmin(user)) return res.status(403).json({ error: "Acesso restrito ao admin" });
  const { batch_name, product_type, quantity, supplier, unit_cost } = req.body || {};
  if (!batch_name || !product_type || !quantity) {
    return res.status(400).json({ error: "batch_name, product_type e quantity são obrigatórios" });
  }
  if (!VALID_TYPES.includes(product_type)) {
    return res.status(400).json({ error: "product_type inválido" });
  }
  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 1 || qty > 5000) {
    return res.status(400).json({ error: "quantity inválida (1 a 5000)" });
  }

  const unitCost = unit_cost ? parseFloat(unit_cost) : null;

  // 1. cria o lote
  const { data: batch, error: batchErr } = await supabase
    .from("production_batches")
    .insert({
      batch_name,
      product_type,
      quantity_planned: qty,
      supplier: supplier || null,
      unit_cost: unitCost,
      total_cost: unitCost ? Number((unitCost * qty).toFixed(2)) : null,
      status: "planning"
    })
    .select()
    .single();
  if (batchErr) return res.status(500).json({ error: "Erro ao criar lote: " + batchErr.message });

  // 2. gera N códigos únicos
  let codes;
  try {
    codes = await generateBatchCodes(supabase, qty);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  // 3. insere N placas in_stock vinculadas ao lote
  const rows = codes.map((code) => ({
    code,
    product_type,
    batch_id: batch.id,
    status: "in_stock",
    source: "site"
  }));
  const { error: platesErr } = await supabase.from("plates").insert(rows);
  if (platesErr) return res.status(500).json({ error: "Erro ao criar placas: " + platesErr.message });

  return res.json({ ok: true, batch, codes });
}

// ── ADMIN: listar lotes ─────────────────────────────────────
async function handleListBatches(req, res, user) {
  if (!isAdmin(user)) return res.status(403).json({ error: "Acesso restrito ao admin" });
  const { data, error } = await supabase
    .from("production_batches")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, batches: data || [] });
}

// ── ADMIN: estoque (lista + resumo por tipo/status) ─────────
async function handleListStock(req, res, user) {
  if (!isAdmin(user)) return res.status(403).json({ error: "Acesso restrito ao admin" });
  const { data, error } = await supabase
    .from("plates")
    .select("id, code, product_type, status, source, channel_name, total_taps, created_at, activated_at, batch_id")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) return res.status(500).json({ error: error.message });

  const summary = {};
  for (const p of data || []) {
    if (!summary[p.product_type]) {
      summary[p.product_type] = { in_stock: 0, assigned: 0, sent: 0, active: 0, disabled: 0 };
    }
    if (summary[p.product_type][p.status] !== undefined) summary[p.product_type][p.status]++;
  }
  return res.json({ ok: true, plates: data || [], summary });
}

// ── CLIENTE: ativar placa (vincula a um negócio do usuário) ─
async function handleActivate(req, res, user) {
  const { code, business_id, channel_name } = req.body || {};
  if (!code || !business_id) {
    return res.status(400).json({ error: "code e business_id são obrigatórios" });
  }
  const normalized = String(code).trim().toUpperCase();

  // Busca a placa (inclui business_id atual pra detectar "ativa mas orfã")
  const { data: plate, error: plateErr } = await supabase
    .from("plates")
    .select("id, code, status, business_id")
    .eq("code", normalized)
    .maybeSingle();
  if (plateErr) return res.status(500).json({ error: plateErr.message });
  if (!plate) return res.status(404).json({ error: "Código não encontrado" });
  if (plate.status === "disabled") return res.status(400).json({ error: "Essa placa está desabilitada" });

  // Se já está ativa, valida se o business atual realmente pertence a alguém ainda existente.
  // Caso comum: user re-cadastrou negócio (UNIQUE user_id sobrescreve o registro com novo UUID),
  // a placa fica apontando pra UUID órfã. Nesse caso permitimos transferir a placa pro negócio novo.
  if (plate.status === "active") {
    let currentOwnerId = null;
    if (plate.business_id) {
      const { data: currentBiz } = await supabase
        .from("businesses")
        .select("id, user_id")
        .eq("id", plate.business_id)
        .maybeSingle();
      currentOwnerId = currentBiz?.user_id || null;
    }
    if (currentOwnerId === user.id) {
      return res.status(400).json({ error: "Essa placa já está ativada no seu negócio" });
    }
    if (currentOwnerId && currentOwnerId !== user.id) {
      return res.status(403).json({ error: "Essa placa já foi ativada por outro usuário. Se você comprou recentemente, fale com a gente." });
    }
    // Senão: dono original sumiu (placa órfã) → permite ativar
    console.log("[plates.activate] re-ativando placa orfã", { code: normalized, oldBizId: plate.business_id, newUserId: user.id });
  }

  // Verifica que o novo negócio pertence ao usuário
  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", business_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (bizErr) return res.status(500).json({ error: bizErr.message });
  if (!biz) return res.status(403).json({ error: "Negócio não pertence a você" });

  // Ativa (vincula ou re-vincula)
  const { data: updated, error: updErr } = await supabase
    .from("plates")
    .update({
      business_id,
      channel_name: channel_name || null,
      status: "active",
      activated_at: new Date().toISOString()
    })
    .eq("id", plate.id)
    .select()
    .single();
  if (updErr) return res.status(500).json({ error: updErr.message });

  // Email de ativação (primeiro ou adicional)
  try {
    const { data: bizFull } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", business_id)
      .maybeSingle();
    const { data: activePlates } = await supabase
      .from("plates")
      .select("id")
      .eq("business_id", business_id)
      .eq("status", "active");
    const totalCount = (activePlates || []).length;
    const userMeta = user.user_metadata || {};
    const userName = userMeta.name || userMeta.full_name || (user.email || "").split("@")[0] || "";

    if (totalCount === 1) {
      // Primeiro dispositivo
      const tmpl = firstDeviceEmail({
        userName,
        bizName: bizFull?.name,
        code: normalized,
        channelName: channel_name
      });
      sendInBackground({
        userId: user.id,
        emailType: "first_device",
        to: user.email,
        subject: tmpl.subject,
        html: tmpl.html,
        metadata: { plate_id: plate.id, code: normalized, channel_name }
      });
    } else if (totalCount > 1) {
      // Dispositivo adicional (recorrente, sem idempotência por user — só por plate_id)
      const tmpl = additionalDeviceEmail({
        userName,
        bizName: bizFull?.name,
        code: normalized,
        channelName: channel_name,
        totalCount
      });
      sendInBackground({
        userId: user.id,
        emailType: "another_device",
        to: user.email,
        subject: tmpl.subject,
        html: tmpl.html,
        metadata: { plate_id: plate.id, code: normalized, channel_name, total: totalCount }
      });
    }
  } catch (e) {
    console.error("[plates.activate] erro no email transacional:", e);
  }

  return res.json({ ok: true, plate: updated });
}

// ── CLIENTE: negócios do usuário (pro dropdown de ativação) ─
async function handleMyBusinesses(req, res, user) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, place_id, address")
    .eq("user_id", user.id)
    .order("name", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, businesses: data || [] });
}

// ── CLIENTE: placas do usuário (pro painel /app/placas) ─────
async function handleMyPlates(req, res, user) {
  const { data: bizs, error: bizErr } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id);
  if (bizErr) return res.status(500).json({ error: bizErr.message });
  const bizIds = (bizs || []).map((b) => b.id);
  if (!bizIds.length) return res.json({ ok: true, plates: [] });

  const { data, error } = await supabase
    .from("plates")
    .select("id, code, product_type, status, channel_name, total_taps, last_tapped_at, activated_at")
    .in("business_id", bizIds)
    .order("activated_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, plates: data || [] });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action || req.query.a;
  try {
    const auth = await authUser(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });

    switch (action) {
      case "create-batch":   return await handleCreateBatch(req, res, auth.user);
      case "list-batches":   return await handleListBatches(req, res, auth.user);
      case "list-stock":     return await handleListStock(req, res, auth.user);
      case "activate":       return await handleActivate(req, res, auth.user);
      case "my-businesses":  return await handleMyBusinesses(req, res, auth.user);
      case "my-plates":      return await handleMyPlates(req, res, auth.user);
      default:
        return res.status(400).json({ error: "Unknown action. Use ?action=create-batch|list-batches|list-stock|activate|my-businesses|my-plates" });
    }
  } catch (err) {
    console.error("[plates] erro não tratado:", err);
    if (!res.headersSent) return res.status(500).json({ error: err?.message || "Erro interno" });
  }
}
