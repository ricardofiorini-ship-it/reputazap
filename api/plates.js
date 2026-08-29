// ============================================================
// StarTouch — API de placas (dispatcher por ?action=)
// Actions admin: create-batch | list-batches | list-stock
// Actions cliente: activate (ETAPA 7) | my-businesses | my-plates | rename-plate
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { MOTIVO_SERVIDO } from "./_lib/plan.js";
import { generateBatchCodes } from "./_lib/plates.js";
import { sendInBackground } from "./_lib/email-sender.js";
import { firstDeviceEmail, additionalDeviceEmail, adminDeviceActivatedEmail } from "./_lib/email-templates.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// MVP: admin gating por email hardcoded (evoluir pra is_admin depois)
const ADMIN_EMAIL = "ricardo.fiorini@gmail.com";

const VALID_TYPES = ["placa_balcao", "placa_mesa", "pulseira_nfc", "cartao_nfc"];

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

  // Desfaz o lote recém-criado se um passo seguinte falhar (evita lote órfão
  // sem placas sujando o painel de produção). Best-effort: loga se a limpeza
  // em si falhar, mas o erro original é o que importa pro admin.
  async function rollbackBatch() {
    const { error: delErr } = await supabase
      .from("production_batches")
      .delete()
      .eq("id", batch.id);
    if (delErr) console.error("[plates.create-batch] falha ao desfazer lote órfão:", delErr.message);
  }

  // 2. gera N códigos únicos
  let codes;
  try {
    codes = await generateBatchCodes(supabase, qty);
  } catch (e) {
    await rollbackBatch();
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
  if (platesErr) {
    await rollbackBatch();
    return res.status(500).json({ error: "Erro ao criar placas: " + platesErr.message });
  }

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
    .select("id, code, product_type, status, source, channel_name, total_taps, created_at, activated_at, batch_id, production_batches(batch_name)")
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
  if (plate.status === "disabled") return res.status(400).json({ error: "Esse dispositivo está desabilitado" });

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
      return res.status(400).json({ error: "Esse dispositivo já está ativado no seu negócio" });
    }
    if (currentOwnerId && currentOwnerId !== user.id) {
      return res.status(403).json({ error: "Esse dispositivo já foi ativado por outro usuário. Se você comprou recentemente, fale com a gente." });
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

  // Emails de ativação (cliente + admin) — aguardados antes do res.json
  // (serverless da Vercel corta promises órfãs)
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

    const emailPromises = [];

    if (totalCount === 1) {
      // Primeiro dispositivo
      const tmpl = firstDeviceEmail({
        userName,
        bizName: bizFull?.name,
        code: normalized,
        channelName: channel_name
      });
      emailPromises.push(sendInBackground({
        userId: user.id,
        emailType: "first_device",
        to: user.email,
        subject: tmpl.subject,
        html: tmpl.html,
        metadata: { plate_id: plate.id, code: normalized, channel_name }
      }));
    } else if (totalCount > 1) {
      // Dispositivo adicional (recorrente, sem idempotência por user — só por plate_id)
      const tmpl = additionalDeviceEmail({
        userName,
        bizName: bizFull?.name,
        code: normalized,
        channelName: channel_name,
        totalCount
      });
      emailPromises.push(sendInBackground({
        userId: user.id,
        emailType: "another_device",
        to: user.email,
        subject: tmpl.subject,
        html: tmpl.html,
        metadata: { plate_id: plate.id, code: normalized, channel_name, total: totalCount }
      }));
    }

    // Notificação admin (pra Ricardo) — 1x por dispositivo (dedupe por plate_id)
    const adminTo = process.env.ADMIN_NOTIFICATIONS_EMAIL;
    if (adminTo) {
      const adminTmpl = adminDeviceActivatedEmail({
        clientName: userName,
        clientEmail: user.email,
        bizName: bizFull?.name,
        code: normalized,
        channelName: channel_name,
        productType: plate.product_type,
        totalDevices: totalCount
      });
      emailPromises.push(sendInBackground({
        userId: user.id,
        emailType: "admin_device_activated",
        to: adminTo,
        subject: adminTmpl.subject,
        html: adminTmpl.html,
        metadata: { plate_id: plate.id, code: normalized, client_email: user.email, biz_id: business_id },
        dedupeByMetadata: { key: "plate_id", value: plate.id }
      }));
    }

    await Promise.allSettled(emailPromises);
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

  const BASE_COLS = "id, code, product_type, status, channel_name, total_taps, last_tapped_at, activated_at";
  const RESET_COLS = ", counter_reset_at, counter_reset_taps";
  // O que o dispositivo SERVE. Sem isto a tela mostrava "Google Direto" fixo
  // no código — verdade por coincidência hoje, mentira no minuto em que
  // alguém ligar um menu.
  const SERVE_COLS = ", experience_id, experience_enabled, served_mode, served_reason";

  let { data, error } = await supabase
    .from("plates")
    .select(BASE_COLS + RESET_COLS + SERVE_COLS)
    .in("business_id", bizIds)
    .order("activated_at", { ascending: false });

  // As colunas do marco zero chegaram depois (ALTER em schema-plate-taps.sql).
  // Enquanto o ALTER não roda, pedir por elas derrubaria a LISTA INTEIRA de
  // dispositivos — o cliente perderia a tela por causa de um recurso novo.
  // Sem elas, a lista volta completa; só o botão de zerar fica de fora.
  // Queda em degraus: colunas novas chegam por migração, e pedir por uma que
  // ainda não existe derrubaria a LISTA INTEIRA de dispositivos. Perder um
  // recurso novo é aceitável; perder a tela não é.
  if (error) {
    console.error("[plates] select com experiencia falhou, tentando sem:", error.message || error);
    ({ data, error } = await supabase
      .from("plates")
      .select(BASE_COLS + RESET_COLS)
      .in("business_id", bizIds)
      .order("activated_at", { ascending: false }));
  }
  if (error) {
    console.error("[plates] select com marco zero falhou, caindo pro basico:", error.message || error);
    ({ data, error } = await supabase
      .from("plates")
      .select(BASE_COLS)
      .in("business_id", bizIds)
      .order("activated_at", { ascending: false }));
  }

  if (error) return res.status(500).json({ error: error.message });

  // O NOME da experiência e a FRASE do motivo saem daqui, não da tela: o texto
  // que explica o rebaixamento mora junto da regra que o decide (plan.js), pra
  // os dois nunca saírem de sincronia.
  const plates = data || [];
  const expIds = [...new Set(plates.map((p) => p.experience_id).filter(Boolean))];
  let porExp = new Map();
  if (expIds.length) {
    const { data: exps } = await supabase
      .from("experiences").select("id, name, archived_at").in("id", expIds);
    porExp = new Map((exps || []).map((e) => [e.id, e]));
  }
  for (const p of plates) {
    const e = p.experience_id ? porExp.get(p.experience_id) : null;
    p.experience_name = e?.name || null;
    p.experience_archived = !!e?.archived_at;
    p.served_label = MOTIVO_SERVIDO[p.served_reason] || null;
  }

  return res.json({ ok: true, plates });
}

// ── CLIENTE: zerar a contagem de um dispositivo (marco zero) ─
// É o parcial do hodômetro, não a borracha: guarda QUANDO zerou e QUANTO o
// contador marcava. Nada é apagado — nem a linha do log, nem o total. Por isso
// desfazer existe e é seguro. Apagar toque de verdade é operação de admin,
// pra limpar teste, e não mora aqui.
async function handleResetCounter(req, res, user) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const { plate_id, undo } = req.body || {};
  if (!plate_id || !UUID_RE.test(String(plate_id))) {
    return res.status(400).json({ error: "plate_id inválido" });
  }

  const { data: plate, error: plateErr } = await supabase
    .from("plates")
    .select("id, business_id, total_taps")
    .eq("id", plate_id)
    .maybeSingle();
  if (plateErr) return res.status(500).json({ error: plateErr.message });
  if (!plate) return res.status(404).json({ error: "Dispositivo não encontrado" });
  if (!plate.business_id) return res.status(400).json({ error: "Esse dispositivo ainda não foi ativado" });

  // DONO: a rota roda com SERVICE_KEY e passa por cima do RLS, então a posse
  // é conferida na mão — igual ao renomear.
  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", plate.business_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (bizErr) return res.status(500).json({ error: bizErr.message });
  if (!biz) return res.status(403).json({ error: "Esse dispositivo não é seu" });

  const patch = undo
    ? { counter_reset_at: null, counter_reset_taps: 0 }
    : { counter_reset_at: new Date().toISOString(), counter_reset_taps: plate.total_taps || 0 };

  const { data: updated, error: updErr } = await supabase
    .from("plates")
    .update(patch)
    .eq("id", plate.id)
    .select("id, code, total_taps, counter_reset_at, counter_reset_taps")
    .single();
  // Erro aqui quase sempre é o ALTER que não rodou. Diz isso em vez de "erro interno".
  if (updErr) {
    console.error("[plates] marco zero falhou:", updErr.message || updErr);
    return res.status(500).json({ error: "Não deu pra zerar agora. Se o problema persistir, o banco ainda não tem as colunas do marco zero." });
  }

  return res.json({ ok: true, plate: updated });
}

// ── CLIENTE: histórico de toques por data ───────────────────
// `plates.total_taps` é um contador: sabe QUANTOS toques, nunca QUANDO.
// Esta action lê o log `plate_taps` e responde a pergunta que o cliente faz
// de verdade: "quantos toques nos últimos 7/30/90 dias, e em qual placa".
//
// Duas honestidades embutidas na resposta:
//   • `available: false` quando a tabela de log ainda não existe — a tela
//     avisa em vez de mostrar "0 toques", que pareceria placa parada.
//   • `measuring_since`: o log começou num dia específico. Pedir "90 dias"
//     de um log com 5 dias de vida não pode parecer queda de movimento.
const TAP_WINDOWS = [7, 30, 90];
const TAP_ROW_CAP = 20000;
const TAP_MAX_RANGE_DAYS = 366;   // período livre: teto pra não varrer o banco inteiro

// Dia em que o log toque-a-toque entrou no ar. Antes disso só existe o contador
// acumulado — sem data, sem como reconstruir. A tela precisa dizer isso na cara
// do cliente; por isso a data viaja na resposta em vez de ficar escrita no front.
const TAP_LOG_START = "2026-08-15";

// O dia do cliente é o dia do Brasil, não o UTC do servidor: um toque às 21h
// de SP é 00h UTC do dia seguinte e cairia no dia errado do gráfico.
// (Sem horário de verão no Brasil desde 2019, o deslocamento fixo basta.)
const BR_OFFSET_MS = 3 * 60 * 60 * 1000;
function brDay(iso) {
  return new Date(new Date(iso).getTime() - BR_OFFSET_MS).toISOString().slice(0, 10);
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;

// Converte um dia brasileiro (YYYY-MM-DD) no instante UTC em que ele começa.
function brDayStartIso(day) {
  return new Date(new Date(`${day}T00:00:00.000Z`).getTime() + BR_OFFSET_MS).toISOString();
}
function addDays(day, n) {
  return new Date(new Date(`${day}T00:00:00.000Z`).getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

// Resolve o período pedido: ou um atalho (`days=7|30|90`) ou datas livres
// (`from`/`to`, YYYY-MM-DD). Devolve sempre o par de dias brasileiros.
function resolveTapPeriod(query, todayBr) {
  const from = String(query.from || "");
  const to = String(query.to || "");

  if (DAY_RE.test(from) && DAY_RE.test(to)) {
    // Datas invertidas são engano de digitação, não erro do cliente: destroca.
    let a = from <= to ? from : to;
    let b = from <= to ? to : from;
    // Futuro não tem toque pra mostrar; corta no dia de hoje.
    if (b > todayBr) b = todayBr;
    if (a > b) a = b;
    // Teto de tamanho: preserva a ponta mais recente, que é a que interessa.
    const span = Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / DAY_MS) + 1;
    if (span > TAP_MAX_RANGE_DAYS) a = addDays(b, -(TAP_MAX_RANGE_DAYS - 1));
    return { fromDay: a, toDay: b, custom: true };
  }

  const asked = parseInt(query.days, 10);
  const days = TAP_WINDOWS.includes(asked) ? asked : 30;
  return { fromDay: addDays(todayBr, -(days - 1)), toDay: todayBr, custom: false, days };
}

async function handleTapsHistory(req, res, user) {
  // Janela alinhada ao dia brasileiro: "últimos 7 dias" inclui hoje inteiro
  // + os 6 anteriores, não as últimas 168 horas corridas.
  const todayBr = brDay(new Date().toISOString());
  const period = resolveTapPeriod(req.query, todayBr);
  const { fromDay, toDay } = period;
  const days = Math.round((new Date(`${toDay}T00:00:00Z`) - new Date(`${fromDay}T00:00:00Z`)) / DAY_MS) + 1;
  const base = {
    days, from_day: fromDay, to_day: toDay, custom: !!period.custom,
    log_start: TAP_LOG_START
  };

  const { data: bizs, error: bizErr } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id);
  if (bizErr) return res.status(500).json({ error: bizErr.message });
  const bizIds = (bizs || []).map((b) => b.id);
  if (!bizIds.length) {
    return res.json({ ...base, ok: true, available: true, total: 0, by_plate: {}, by_day: [], by_medium: {}, measuring_since: null });
  }

  const fromIso = brDayStartIso(fromDay);
  const toIso = brDayStartIso(addDays(toDay, 1));   // exclusivo: pega o dia final inteiro

  const { data: rows, error } = await supabase
    .from("plate_taps")
    .select("plate_id, tapped_at, medium")
    .in("business_id", bizIds)
    .gte("tapped_at", fromIso)
    .lt("tapped_at", toIso)
    .order("tapped_at", { ascending: true })
    .limit(TAP_ROW_CAP);

  // Tabela ainda não criada no Supabase (o SQL de schema-plate-taps.sql não
  // rodou). Isso é "não sei", não "zero" — a tela precisa saber a diferença.
  if (error) {
    console.error("[plates] histórico de toques indisponível:", error.message || error);
    return res.json({ ...base, ok: true, available: false, total: 0, by_plate: {}, by_day: [], by_medium: {}, measuring_since: null });
  }

  const byPlate = {};
  const byMedium = {};
  const byDayMap = {};
  for (const r of rows || []) {
    byPlate[r.plate_id] = (byPlate[r.plate_id] || 0) + 1;
    const m = r.medium || "nfc";
    byMedium[m] = (byMedium[m] || 0) + 1;
    const d = brDay(r.tapped_at);
    byDayMap[d] = (byDayMap[d] || 0) + 1;
  }

  // Série com TODOS os dias da janela, inclusive os zerados — senão o gráfico
  // encosta os dias movimentados um no outro e some com o buraco.
  const byDay = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(fromDay, i);
    byDay.push({ day: d, taps: byDayMap[d] || 0 });
  }

  // Período anterior de MESMO tamanho, colado no início deste. "42 toques" não
  // diz nada sozinho; "42, contra 31 no período anterior" diz. Só conta linhas
  // (head+count), sem trazer dado nenhum — é barato.
  // Só compara se o período anterior estiver inteiro depois do início do log:
  // comparar com uma época sem registro daria "caiu 100%", que é mentira.
  let prevTotal = null;
  const prevToDay = addDays(fromDay, -1);
  const prevFromDay = addDays(fromDay, -days);
  if (prevFromDay >= TAP_LOG_START) {
    const { count, error: prevErr } = await supabase
      .from("plate_taps")
      .select("id", { count: "exact", head: true })
      .in("business_id", bizIds)
      .gte("tapped_at", brDayStartIso(prevFromDay))
      .lt("tapped_at", brDayStartIso(fromDay));
    if (!prevErr) prevTotal = count || 0;
  }

  // Desde quando existe log pra ESTE cliente (1ª linha registrada, de qualquer época).
  let measuringSince = null;
  const { data: firstRow } = await supabase
    .from("plate_taps")
    .select("tapped_at")
    .in("business_id", bizIds)
    .order("tapped_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (firstRow?.tapped_at) measuringSince = firstRow.tapped_at;

  return res.json({
    ...base,
    ok: true,
    available: true,
    from: fromIso,
    measuring_since: measuringSince,
    prev_total: prevTotal,
    prev_from_day: prevTotal === null ? null : prevFromDay,
    prev_to_day: prevTotal === null ? null : prevToDay,
    total: (rows || []).length,
    by_plate: byPlate,
    by_medium: byMedium,
    by_day: byDay,
    capped: (rows || []).length >= TAP_ROW_CAP
  });
}

// ── CLIENTE: renomear o apelido de um dispositivo ───────────
// Até 30/jul o apelido só podia ser escrito UMA vez, na ativação — quem errava
// (ou mudava a placa de lugar) ficava preso ao nome antigo. Aqui só o
// `channel_name` muda: código, vínculo, status e contagem de toques não são
// tocados — o apelido é etiqueta, não identidade da placa.
const MAX_NICK = 40;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handleRenamePlate(req, res, user) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const { plate_id, channel_name } = req.body || {};
  // Guarda o formato antes de ir no banco: id fora do padrão UUID faria o
  // Postgres estourar (22P02) e virar um 500 sem sentido pro cliente.
  if (!plate_id || !UUID_RE.test(String(plate_id))) {
    return res.status(400).json({ error: "plate_id inválido" });
  }

  // Apelido vazio volta pro nome padrão do produto — é opcional, igual na ativação.
  const raw = channel_name == null ? "" : String(channel_name).trim();
  if (raw.length > MAX_NICK) {
    return res.status(400).json({ error: `O apelido pode ter no máximo ${MAX_NICK} caracteres` });
  }
  const nick = raw || null;

  const { data: plate, error: plateErr } = await supabase
    .from("plates")
    .select("id, business_id")
    .eq("id", plate_id)
    .maybeSingle();
  if (plateErr) return res.status(500).json({ error: plateErr.message });
  if (!plate) return res.status(404).json({ error: "Dispositivo não encontrado" });
  if (!plate.business_id) return res.status(400).json({ error: "Esse dispositivo ainda não foi ativado" });

  // DONO: a placa precisa estar num negócio DESTE usuário. Sem essa checagem,
  // qualquer logado renomearia placa alheia — a rota roda com SERVICE_KEY e
  // passa por cima do RLS.
  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", plate.business_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (bizErr) return res.status(500).json({ error: bizErr.message });
  if (!biz) return res.status(403).json({ error: "Esse dispositivo não é seu" });

  const { data: updated, error: updErr } = await supabase
    .from("plates")
    .update({ channel_name: nick })
    .eq("id", plate.id)
    .select("id, code, channel_name")
    .single();
  if (updErr) return res.status(500).json({ error: updErr.message });

  return res.json({ ok: true, plate: updated });
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
      case "rename-plate":   return await handleRenamePlate(req, res, auth.user);
      case "taps-history":   return await handleTapsHistory(req, res, auth.user);
      case "reset-counter":  return await handleResetCounter(req, res, auth.user);
      default:
        return res.status(400).json({ error: "Unknown action. Use ?action=create-batch|list-batches|list-stock|activate|my-businesses|my-plates|rename-plate|taps-history|reset-counter" });
    }
  } catch (err) {
    console.error("[plates] erro não tratado:", err);
    if (!res.headersSent) return res.status(500).json({ error: err?.message || "Erro interno" });
  }
}
