// ============================================================
// StarTouch — API de placas (dispatcher por ?action=)
// Actions admin: create-batch | list-batches | list-stock
// Action cliente: activate (ETAPA 7)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { generateBatchCodes } from "./_lib/plates.js";

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
      case "create-batch": return await handleCreateBatch(req, res, auth.user);
      case "list-batches": return await handleListBatches(req, res, auth.user);
      case "list-stock":   return await handleListStock(req, res, auth.user);
      // case "activate": ETAPA 7
      default:
        return res.status(400).json({ error: "Unknown action. Use ?action=create-batch|list-batches|list-stock" });
    }
  } catch (err) {
    console.error("[plates] erro não tratado:", err);
    if (!res.headersSent) return res.status(500).json({ error: err?.message || "Erro interno" });
  }
}
