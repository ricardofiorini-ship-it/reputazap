// ============================================================
// Pesquisa de opinião pelo WhatsApp (fase 3, 25/10/2026)
// ============================================================
// Uma vez por dia: pedido ENTREGUE há 7+ dias (ou POSTADO há 14+, pra quem
// não marca entregue no admin), com a caixinha de avisos marcada, recebe o
// modelo st_opiniao ("de 0 a 10…"). A resposta é tratada em api/whatsapp.js
// (tratarNps). Política 1.15 §3.1.
//
// Uma pergunta por pedido (shipping.nps) e no máximo uma por telefone a cada
// 90 dias — quem compra todo mês não vira alvo de pesquisa todo mês.
// Trybo e revenda ficam de fora (o texto fala de StarTouch).
//
// ?dry=1 lista quem receberia, sem mandar nada.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { enviarAviso, primeiroNome, numeroWhatsapp } from "../_lib/whatsapp-modelos.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const DIA_MS = 86400000;
const MAX_POR_RODADA = 30;

function checkAuth(req) {
  const validos = [process.env.CRON_SECRET, process.env.BROADCAST_SECRET]
    .map((v) => (v || "").trim()).filter(Boolean);
  if (!validos.length) return false;
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  return validos.includes(bearer) || validos.includes(String(req.query.secret || "").trim());
}

export default async function handler(req, res) {
  if (!checkAuth(req)) return res.status(401).json({ error: "Não autorizado" });
  const dry = req.query.dry === "1";
  const agora = Date.now();
  const iso = (dias) => new Date(agora - dias * DIA_MS).toISOString();
  const s = { dry, candidatos: 0, enviados: 0, pulados: {}, erros: [], destinatarios: [] };
  const pula = (motivo) => { s.pulados[motivo] = (s.pulados[motivo] || 0) + 1; };

  const campos = "id, external_reference, status, shipping, delivered_at, shipped_at";
  const [entregues, postados, perguntados] = await Promise.all([
    supabase.from("orders").select(campos).eq("status", "entregue")
      .lte("delivered_at", iso(7)).gte("delivered_at", iso(30)).limit(500),
    supabase.from("orders").select(campos).eq("status", "postado")
      .lte("shipped_at", iso(14)).gte("shipped_at", iso(40)).limit(500),
    supabase.from("orders").select("shipping").gte("shipping->nps->>perguntado_em", iso(90)).limit(1000),
  ]);
  for (const r of [entregues, postados, perguntados]) {
    if (r.error) return res.status(500).json({ error: r.error.message });
  }

  // Telefones já perguntados nos últimos 90 dias (últimos 10 dígitos).
  const jaPerguntado = new Set((perguntados.data || [])
    .map((o) => numeroWhatsapp(o.shipping?.phone, o.shipping?.country)?.slice(-10)).filter(Boolean));

  for (const pedido of [...(entregues.data || []), ...(postados.data || [])]) {
    const ref = String(pedido.external_reference || "");
    const c = pedido.shipping || {};
    if (!c.whatsapp_optin) continue;
    s.candidatos++;
    if (ref.startsWith("kit_trybo") || ref.startsWith("revenda_") || c.tipo === "revenda") { pula("trybo/revenda"); continue; }
    if (c.nps) { pula("já perguntado"); continue; }
    const fim = numeroWhatsapp(c.phone, c.country)?.slice(-10);
    if (!fim) { pula("telefone inválido"); continue; }
    if (jaPerguntado.has(fim)) { pula("mesmo telefone há menos de 90 dias"); continue; }
    if (s.enviados >= MAX_POR_RODADA) { pula("teto da rodada"); continue; }
    if (dry) { s.destinatarios.push({ ref, status: pedido.status }); jaPerguntado.add(fim); continue; }

    try {
      // Marca ANTES de mandar (a resposta precisa achar o pedido); desfaz se falhar.
      const marcado = { ...c, nps: { perguntado_em: new Date().toISOString() } };
      const { error: eu } = await supabase.from("orders").update({ shipping: marcado }).eq("id", pedido.id);
      if (eu) throw new Error("marcação: " + eu.message);
      const r = await enviarAviso("st_opiniao", c, [primeiroNome(c.name || c.nome)]);
      if (!r.enviado) {
        await supabase.from("orders").update({ shipping: c }).eq("id", pedido.id);
        pula(r.motivo || "não enviado");
        continue;
      }
      jaPerguntado.add(fim);
      s.enviados++;
      s.destinatarios.push({ ref });
    } catch (e) {
      s.erros.push({ ref, erro: e?.message || String(e) });
    }
  }

  console.log(`[nps-whatsapp] ${s.enviados} pergunta(s) enviada(s) de ${s.candidatos} candidato(s)${dry ? " (ensaio)" : ""}`);
  if (s.erros.length) console.error("[nps-whatsapp] erros:", JSON.stringify(s.erros).slice(0, 2000));
  return res.json(s);
}
