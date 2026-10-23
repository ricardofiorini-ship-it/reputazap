// ============================================================
// DIVULGUE E GANHE — API (23/10/2026). Regras em _lib/indicacao.js.
// ============================================================
//   GET  ?action=minha          (cliente logado) código, link, PIX e vendas
//   POST ?action=pix            (cliente logado) grava chave PIX + titular
//   GET  ?action=admin          (admin) comissões por indicador
//   POST ?action=marcar-paga    (admin) marca comissões como pagas
//   POST ?action=cancelar       (admin) tira uma venda da comissão
//
// O indicador vê DATA e VALOR de cada venda — nunca quem comprou. É o que a
// Política 1.12 promete ao comprador.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  codigoDoUsuario, linkDoCodigo, comissaoCentavos, baseDaComissao, situacao, liberaEm,
  mapaDeIndicadores, COMISSAO_PCT, CARENCIA_DIAS, MINIMO_PAGAMENTO_CENTAVOS
} from "./_lib/indicacao.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ADMIN_EMAILS = new Set(["ricardo.fiorini@gmail.com"]);

async function usuario(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data?.user || null;
}

async function lerCorpo(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}

/** Pedidos PAGOS com indicação. Pagina: o Supabase corta em 1000, calado. */
async function pedidosIndicados(codigo = null) {
  const linhas = [];
  for (let de = 0; de < 100000; de += 1000) {
    let q = supabase.from("orders")
      .select("external_reference, email, user_id, items, shipping, total_cents, status, paid_at, created_at, mp_payment_id")
      .eq("status", "paid")
      .not("shipping->indicacao->>codigo", "is", null)
      .order("paid_at", { ascending: false })
      .range(de, de + 999);
    if (codigo) q = q.eq("shipping->indicacao->>codigo", codigo);
    const { data, error } = await q;
    if (error) throw new Error("pedidos: " + error.message);
    linhas.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return linhas;
}

function resumoDaVenda(o, indicador) {
  return {
    data: o.paid_at || o.created_at,
    produtos_centavos: baseDaComissao(o),
    comissao_centavos: comissaoCentavos(o),
    situacao: situacao(o, indicador),
    libera_em: liberaEm(o),
    paga_em: o.shipping?.indicacao?.pago_em || null
  };
}

function somaPor(vendas, sit) {
  return vendas.filter((v) => v.situacao === sit).reduce((s, v) => s + v.comissao_centavos, 0);
}

async function handleMinha(req, res, user) {
  const codigo = codigoDoUsuario(user.id);
  const pedidos = await pedidosIndicados(codigo);
  const vendas = pedidos.map((o) => resumoDaVenda(o, user));
  return res.json({
    codigo, link: linkDoCodigo(codigo),
    regras: { pct: COMISSAO_PCT, carencia_dias: CARENCIA_DIAS, minimo_centavos: MINIMO_PAGAMENTO_CENTAVOS },
    pix: user.user_metadata?.indica_pix || null,
    vendas,
    totais: {
      aguardando: somaPor(vendas, "aguardando"),
      liberada: somaPor(vendas, "liberada"),
      paga: somaPor(vendas, "paga")
    }
  });
}

async function handlePix(req, res, user) {
  const b = await lerCorpo(req);
  const chave = String(b.chave || "").trim().slice(0, 140);
  const titular = String(b.titular || "").trim().slice(0, 120);
  if (!chave || !titular) return res.status(400).json({ error: "Informe a chave PIX e o nome do titular." });
  if (!b.aceite) return res.status(400).json({ error: "É preciso aceitar as regras do programa." });
  const meta = { ...(user.user_metadata || {}),
    indica_pix: { chave, titular, atualizado_em: new Date().toISOString() },
    indica_aceite_em: user.user_metadata?.indica_aceite_em || new Date().toISOString() };
  const { error } = await supabase.auth.admin.updateUserById(user.id, { user_metadata: meta });
  if (error) return res.status(500).json({ error: "Não consegui salvar agora. Tente de novo." });
  return res.json({ ok: true, pix: meta.indica_pix });
}

// Estorno feito no painel do Stripe não muda o status do pedido de kit (o
// webhook só trata estorno da Trybo). Então o admin confere AO VIVO antes de
// pagar: comissão de venda estornada sai como "cancelada".
async function estornado(stripe, o) {
  const pi = String(o.mp_payment_id || "");
  if (!stripe || !pi.startsWith("pi_")) return false;
  try {
    const p = await stripe.paymentIntents.retrieve(pi, { expand: ["latest_charge"] });
    return Number(p.latest_charge?.amount_refunded || 0) > 0;
  } catch (e) {
    console.warn(`[indicacao] não consegui conferir estorno de ${o.external_reference}: ${e?.message}`);
    return false;
  }
}

async function handleAdmin(req, res) {
  const [pedidos, mapa] = await Promise.all([pedidosIndicados(), mapaDeIndicadores(supabase)]);
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
  const grupos = new Map();
  for (const o of pedidos) {
    const codigo = o.shipping.indicacao.codigo;
    const ind = mapa.get(codigo) || null;
    const v = { ref: o.external_reference, ...resumoDaVenda(o, ind) };
    if ((v.situacao === "aguardando" || v.situacao === "liberada") && await estornado(stripe, o)) {
      v.situacao = "cancelada"; v.estornada = true;
    }
    if (!grupos.has(codigo)) {
      grupos.set(codigo, {
        codigo,
        indicador: ind ? { nome: ind.user_metadata?.name || ind.user_metadata?.full_name || "", email: ind.email } : null,
        pix: ind?.user_metadata?.indica_pix || null,
        vendas: []
      });
    }
    grupos.get(codigo).vendas.push(v);
  }
  const lista = [...grupos.values()].map((g) => ({
    ...g,
    totais: { aguardando: somaPor(g.vendas, "aguardando"), liberada: somaPor(g.vendas, "liberada"), paga: somaPor(g.vendas, "paga") }
  })).sort((a, b) => b.totais.liberada - a.totais.liberada);
  return res.json({ minimo_centavos: MINIMO_PAGAMENTO_CENTAVOS, indicadores: lista });
}

async function marcar(req, res, campo) {
  const b = await lerCorpo(req);
  const refs = (Array.isArray(b.refs) ? b.refs : []).map(String).slice(0, 500);
  if (!refs.length) return res.status(400).json({ error: "Nenhuma venda informada." });
  const quando = new Date().toISOString();
  let feitas = 0;
  for (const ref of refs) {
    const { data: o } = await supabase.from("orders").select("shipping").eq("external_reference", ref).maybeSingle();
    if (!o?.shipping?.indicacao) continue;
    const ind = { ...o.shipping.indicacao, [campo]: quando };
    const { error } = await supabase.from("orders").update({ shipping: { ...o.shipping, indicacao: ind } }).eq("external_reference", ref);
    if (!error) feitas++;
    else console.error(`[indicacao] não marquei ${campo} em ${ref}: ${error.message}`);
  }
  return res.json({ ok: true, marcadas: feitas, de: refs.length });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = String(req.query.action || "");
  const user = await usuario(req);
  if (!user) return res.status(401).json({ error: "Entre na sua conta." });

  try {
    if (action === "minha" && req.method === "GET") return await handleMinha(req, res, user);
    if (action === "pix" && req.method === "POST") return await handlePix(req, res, user);

    if (!ADMIN_EMAILS.has(String(user.email || "").toLowerCase())) return res.status(403).json({ error: "Só admin." });
    if (action === "admin" && req.method === "GET") return await handleAdmin(req, res);
    if (action === "marcar-paga" && req.method === "POST") return await marcar(req, res, "pago_em");
    if (action === "cancelar" && req.method === "POST") return await marcar(req, res, "cancelada");
    return res.status(400).json({ error: "Ação desconhecida." });
  } catch (e) {
    console.error("[indicacao] erro:", e?.message || e);
    return res.status(500).json({ error: "Erro ao carregar. Tente de novo." });
  }
}

