// ============================================================
// Relatório semanal da máquina de atendimento (fase 3, 25/10/2026)
// ============================================================
// Segunda de manhã, um e-mail pro admin com os 7 dias anteriores: conversas,
// o que o robô resolveu e o que passou pra você, vendas depois de conversa,
// avisos enviados, quem pediu PARAR, cupons VOLTA usados e a pesquisa de
// opinião (nota média, NPS e os comentários). Só lê o banco.
//
// ?dry=1 devolve os números sem mandar e-mail.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { sendRawEmail } from "../_lib/email-sender.js";
import { ehPedidoParaParar } from "../_lib/whatsapp-modelos.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const PAGOS = ["paid", "em_producao", "postado", "entregue"];

// Um trecho único de cada modelo, pra contar os avisos no histórico.
const AVISOS = [
  ["Pagamento confirmado", "Recebemos o pagamento do seu pedido"],
  ["Pedido postado", "foi postado. 📦"],
  ["Ajuda pra ativar", "Seu StarTouch já chegou?"],
  ["Carrinho abandonado", "ficou pela metade"],
  ["Pesquisa de opinião", "quanto você recomendaria a StarTouch"],
];

function checkAuth(req) {
  const validos = [process.env.CRON_SECRET, process.env.BROADCAST_SECRET]
    .map((v) => (v || "").trim()).filter(Boolean);
  if (!validos.length) return false;
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  return validos.includes(bearer) || validos.includes(String(req.query.secret || "").trim());
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const reais = (c) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const tel10 = (s) => String(s || "").replace(/\D/g, "").slice(-10);

export async function numerosDaSemana(desdeIso) {
  const linhas = [];
  for (let de = 0; de < 50000; de += 1000) {
    const { data, error } = await supabase.from("whatsapp_mensagens")
      .select("wa_id, direcao, texto, criado_em").gte("criado_em", desdeIso)
      .order("criado_em", { ascending: true }).range(de, de + 999);
    if (error) throw new Error("whatsapp_mensagens: " + error.message);
    linhas.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  const n = { conversas: 0, mensagens_cliente: 0, respostas_robo: 0, respostas_voce: 0, passadas_pra_voce: 0, pediram_parar: 0, avisos: {} };
  const numeros = new Set(), primeira = new Map();
  for (const l of linhas) {
    if (l.direcao === "entrada") {
      numeros.add(l.wa_id); n.mensagens_cliente++;
      if (!primeira.has(tel10(l.wa_id))) primeira.set(tel10(l.wa_id), Date.parse(l.criado_em));
      if (ehPedidoParaParar(l.texto)) n.pediram_parar++;
    }
    if (l.direcao === "humano") n.respostas_voce++;
    if (l.direcao === "escalado") n.passadas_pra_voce++;
    if (l.direcao === "saida") {
      const aviso = AVISOS.find(([, trecho]) => (l.texto || "").includes(trecho));
      if (aviso) n.avisos[aviso[0]] = (n.avisos[aviso[0]] || 0) + 1;
      else if (!(l.texto || "").startsWith("[")) n.respostas_robo++;
    }
  }
  n.conversas = numeros.size;

  const { data: pedidos, error } = await supabase.from("orders")
    .select("external_reference, total_cents, status, shipping, created_at").gte("created_at", desdeIso)
    .in("status", PAGOS).limit(2000);
  if (error) throw new Error("orders: " + error.message);
  n.vendas_depois_de_conversa = { pedidos: 0, total_centavos: 0 };
  n.cupom_volta = { pedidos: 0, total_centavos: 0 };
  n.optin = { pedidos_pagos: 0, marcaram: 0 };
  for (const o of pedidos || []) {
    const inicio = primeira.get(tel10(o.shipping?.phone));
    if (inicio && Date.parse(o.created_at) >= inicio) {
      n.vendas_depois_de_conversa.pedidos++; n.vendas_depois_de_conversa.total_centavos += o.total_cents || 0;
    }
    if (o.shipping?.cupom_usado) { n.cupom_volta.pedidos++; n.cupom_volta.total_centavos += o.total_cents || 0; }
    if (!String(o.external_reference || "").startsWith("revenda_")) {
      n.optin.pedidos_pagos++;
      if (o.shipping?.whatsapp_optin) n.optin.marcaram++;
    }
  }

  const { data: respostas, error: e2 } = await supabase.from("orders")
    .select("external_reference, shipping").gte("shipping->nps->>respondido_em", desdeIso).limit(1000);
  if (e2) throw new Error("orders (nps): " + e2.message);
  const notas = (respostas || []).map((o) => ({ ref: o.external_reference, nome: o.shipping?.name || "", ...o.shipping.nps }))
    .filter((r) => typeof r.nota === "number");
  const prom = notas.filter((r) => r.nota >= 9).length, det = notas.filter((r) => r.nota <= 6).length;
  n.pesquisa = {
    respostas: notas.length,
    media: notas.length ? Math.round(notas.reduce((a, r) => a + r.nota, 0) / notas.length * 10) / 10 : null,
    nps: notas.length ? Math.round((prom - det) / notas.length * 100) : null,
    promotores: prom, neutros: notas.length - prom - det, detratores: det,
    respostas_detalhe: notas.sort((a, b) => a.nota - b.nota),
  };
  return n;
}

function html(n, de, ate) {
  const linha = (rotulo, valor) => `<tr><td style="padding:6px 0;color:#5F6368;">${rotulo}</td><td style="padding:6px 0;text-align:right;font-weight:700;">${valor}</td></tr>`;
  const avisos = AVISOS.map(([r]) => linha(r, n.avisos[r] || 0)).join("");
  const p = n.pesquisa;
  const comentarios = p.respostas_detalhe.map((r) => `
    <div style="border-left:3px solid ${r.nota >= 9 ? "#1E8E3E" : r.nota >= 7 ? "#F9AB00" : "#D93025"};padding:6px 10px;margin:8px 0;">
      <strong>${r.nota}</strong> · ${esc(r.nome.split(" ")[0] || "—")} · <span style="color:#5F6368;">${esc(r.ref)}</span>
      ${r.comentario ? `<div style="margin-top:4px;">${esc(r.comentario)}</div>` : ""}
    </div>`).join("");
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#202124;">
    <h2 style="margin:0 0 4px;">📲 WhatsApp — resumo da semana</h2>
    <p style="margin:0 0 16px;color:#5F6368;">${de} a ${ate}</p>
    <h3 style="margin:16px 0 4px;">Atendimento</h3>
    <table style="width:100%;border-collapse:collapse;">
      ${linha("Conversas (números diferentes)", n.conversas)}
      ${linha("Mensagens de clientes", n.mensagens_cliente)}
      ${linha("Respostas do robô", n.respostas_robo)}
      ${linha("Respostas suas", n.respostas_voce)}
      ${linha("Passadas pra você", n.passadas_pra_voce)}
    </table>
    <h3 style="margin:16px 0 4px;">Vendas</h3>
    <table style="width:100%;border-collapse:collapse;">
      ${linha("Pedidos pagos depois de uma conversa", `${n.vendas_depois_de_conversa.pedidos} · ${reais(n.vendas_depois_de_conversa.total_centavos)}`)}
      ${linha("Pedidos pagos com cupom VOLTA", `${n.cupom_volta.pedidos} · ${reais(n.cupom_volta.total_centavos)}`)}
      ${linha("Marcaram a caixinha de avisos", `${n.optin.marcaram} de ${n.optin.pedidos_pagos} pedidos pagos`)}
    </table>
    <h3 style="margin:16px 0 4px;">Avisos automáticos enviados</h3>
    <table style="width:100%;border-collapse:collapse;">${avisos}${linha("Pediram PARAR", n.pediram_parar)}</table>
    <h3 style="margin:16px 0 4px;">Pesquisa de opinião</h3>
    ${p.respostas ? `
      <table style="width:100%;border-collapse:collapse;">
        ${linha("Respostas", p.respostas)}
        ${linha("Nota média", String(p.media).replace(".", ","))}
        ${linha("NPS (promotores − detratores)", p.nps)}
        ${linha("9–10 / 7–8 / 0–6", `${p.promotores} / ${p.neutros} / ${p.detratores}`)}
      </table>${comentarios}`
      : `<p style="color:#5F6368;">Ninguém respondeu nesta semana.</p>`}
    <p style="margin-top:20px;"><a href="https://startouch.com.br/admin/whatsapp" style="color:#1A73E8;">Abrir os atendimentos</a></p>
  </div>`;
}

export default async function handler(req, res) {
  if (!checkAuth(req)) return res.status(401).json({ error: "Não autorizado" });
  const ate = new Date();
  const de = new Date(ate.getTime() - 7 * 86400000);
  const fmt = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
  let n;
  try { n = await numerosDaSemana(de.toISOString()); }
  catch (e) {
    console.error("[whatsapp-semanal] FALHOU:", e?.message || e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
  if (req.query.dry === "1") return res.json({ dry: true, de: de.toISOString(), numeros: n });

  const admin = process.env.ADMIN_NOTIFICATIONS_EMAIL;
  if (!admin) {
    console.error("[whatsapp-semanal] ADMIN_NOTIFICATIONS_EMAIL ausente — relatório não saiu");
    return res.status(500).json({ error: "ADMIN_NOTIFICATIONS_EMAIL ausente" });
  }
  const r = await sendRawEmail({ to: admin, subject: `WhatsApp: ${n.conversas} conversas, ${n.vendas_depois_de_conversa.pedidos} vendas depois de conversa`, html: html(n, fmt(de), fmt(ate)) });
  if (r?.error) {
    console.error("[whatsapp-semanal] e-mail falhou:", r.error);
    return res.status(500).json({ error: r.error });
  }
  console.log(`[whatsapp-semanal] relatório enviado (${n.conversas} conversas)`);
  return res.json({ ok: true, numeros: n });
}
