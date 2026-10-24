// ============================================================
// Carrinho abandonado → cupom VOLTA de 20% (23/10/2026)
// ============================================================
// Quem preenche a entrega no /kit e não paga deixa um pedido `pending` em
// `orders`. Entre 23h e 72h depois, este cron manda UM e-mail com cupom de
// uso único (regras em _lib/cupom-volta.js). Roda de hora em hora, só de dia
// (8h às 20h de Brasília): e-mail de desconto às 3h da manhã é ruído.
//
// Quem NÃO recebe:
//   - quem já tem pedido pago (com qualquer e-mail igual) — não é 1ª compra,
//     e cobre também quem voltou e comprou sozinho;
//   - quem já recebeu um cupom antes (um por e-mail, pra sempre);
//   - carrinho da Trybo (outra marca) e revenda (outro preço, outro fluxo);
//   - pedido criado ANTES de CUPOM_DESDE: o dado foi coletado sob a Política
//     1.10, que não previa este e-mail. A 1.11 vale pra frente.
//
// Uso manual: ?secret=<CRON_SECRET>&dry=1 (ensaio) · &to=x@y.com (manda o
// e-mail de teste pra esse endereço, sem gravar cupom no pedido) · &limit=N
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "../_lib/email-sender.js";
import { cupomVoltaEmail } from "../_lib/email-templates.js";
import { geraCodigo, CUPOM_PCT, CUPOM_VALIDADE_DIAS } from "../_lib/cupom-volta.js";
import { enviarAviso, primeiroNome } from "../_lib/whatsapp-modelos.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Publicação da Política 1.11 (§3.1, "Lembrete de compra não concluída").
const CUPOM_DESDE = "2026-10-23T21:30:00Z";
const HORA_MS = 3600000;
const ESPERA_H = 23, JANELA_H = 72;
const MAX_POR_RODADA = 40;

function checkAuth(req) {
  const validos = [process.env.CRON_SECRET, process.env.BROADCAST_SECRET]
    .map((v) => (v || "").trim()).filter(Boolean);
  if (!validos.length) return false;
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  return validos.includes(bearer) || validos.includes(String(req.query.secret || "").trim());
}

function linkDoCarrinho(codigo, itens) {
  const ids = [];
  for (const i of Array.isArray(itens) ? itens : []) {
    for (let n = 0; n < Math.min(Number(i.qty) || 1, 10); n++) ids.push(i.id);
  }
  const add = ids.length ? `&add=${encodeURIComponent(ids.join(","))}` : "";
  return `https://startouch.com.br/kit?cupom=${encodeURIComponent(codigo)}${add}&utm_source=email&utm_medium=cupom&utm_campaign=carrinho_abandonado`;
}

export default async function handler(req, res) {
  if (!checkAuth(req)) return res.status(401).json({ error: "Não autorizado" });

  const dry = req.query.dry === "1";
  const forceTo = String(req.query.to || "").trim() || null;
  const limit = Math.min(parseInt(req.query.limit, 10) || MAX_POR_RODADA, MAX_POR_RODADA);
  const agora = Date.now();
  const de = new Date(Math.max(agora - JANELA_H * HORA_MS, Date.parse(CUPOM_DESDE))).toISOString();
  const ate = new Date(agora - ESPERA_H * HORA_MS).toISOString();
  const s = { dry, teste: !!forceTo, janela: { de, ate }, candidatos: 0, enviados: 0,
              pulados_ja_comprou: 0, pulados_ja_tem_cupom: 0, erros: [], destinatarios: [] };

  // Teste: monta o e-mail com um pedido de mentira e manda pro endereço dado.
  if (forceTo && req.query.exemplo === "1") {
    const codigo = "VOLTA-TESTE1";
    const itens = [{ id: "cartao-nfc", name: "Cartão de Avaliação NFC", qty: 2 }];
    const t = cupomVoltaEmail({ nome: "Ricardo", itens, codigo, pct: CUPOM_PCT,
      expira: new Date(agora + CUPOM_VALIDADE_DIAS * 24 * HORA_MS).toISOString(), link: linkDoCarrinho(codigo, itens) });
    const r = await sendTransactionalEmail({ userId: "guest", emailType: "cupom_volta_teste", to: forceTo,
      subject: t.subject, html: t.html, lang: "pt", metadata: { teste: true } });
    return res.json({ exemplo: true, resultado: r });
  }

  if (de >= ate) return res.json({ ...s, nota: "janela ainda vazia (cupom começou há menos de 23h)" });

  const { data: pendentes, error } = await supabase
    .from("orders")
    .select("id, external_reference, email, user_id, items, shipping, created_at")
    .eq("status", "pending")
    .like("external_reference", "kit_%")
    .not("external_reference", "like", "kit_trybo%")
    .gte("created_at", de).lte("created_at", ate)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("[carrinho-abandonado] FALHOU ao ler pedidos:", error.message);
    return res.status(500).json({ ...s, erro: error.message });
  }

  // Um por e-mail: o pedido mais recente (a lista já vem do mais novo).
  const porEmail = new Map();
  for (const o of pendentes || []) {
    const e = String(o.email || o.shipping?.email || "").trim().toLowerCase();
    if (e && !porEmail.has(e)) porEmail.set(e, o);
  }
  s.candidatos = porEmail.size;

  for (const [email, pedido] of porEmail) {
    if (s.enviados >= limit) break;
    try {
      const { data: historico, error: eh } = await supabase
        .from("orders").select("status, shipping").ilike("email", email).limit(200);
      if (eh) throw new Error("histórico: " + eh.message);
      if ((historico || []).some((o) => o.status === "paid")) { s.pulados_ja_comprou++; continue; }
      if ((historico || []).some((o) => o.shipping?.cupom_oferecido)) { s.pulados_ja_tem_cupom++; continue; }

      const codigo = geraCodigo();
      const oferta = {
        codigo, pct: CUPOM_PCT, enviado_em: new Date().toISOString(),
        expira: new Date(agora + CUPOM_VALIDADE_DIAS * 24 * HORA_MS).toISOString()
      };
      const itens = Array.isArray(pedido.items) ? pedido.items : [];
      const nome = pedido.shipping?.name || pedido.shipping?.nome || "";
      if (dry) { s.destinatarios.push({ ref: pedido.external_reference, itens: itens.length }); continue; }

      // Reserva ANTES de mandar: se o envio falhar depois, desfaz. Ao contrário
      // (manda e depois grava), uma falha na gravação reenviaria toda hora.
      const shippingNovo = { ...(pedido.shipping || {}), cupom_oferecido: oferta };
      const { error: eu } = await supabase.from("orders").update({ shipping: shippingNovo })
        .eq("id", pedido.id).eq("status", "pending");
      if (eu) throw new Error("reserva: " + eu.message);

      const t = cupomVoltaEmail({ nome, itens, codigo, pct: CUPOM_PCT, expira: oferta.expira, link: linkDoCarrinho(codigo, itens) });
      const r = await sendTransactionalEmail({
        userId: pedido.user_id || "guest", emailType: "cupom_volta", to: email,
        subject: t.subject, html: t.html, lang: "pt",
        dedupeByMetadata: { key: "ref", value: pedido.external_reference },
        metadata: { ref: pedido.external_reference, codigo }
      });
      if (r?.error || (r?.skipped && r.reason !== "already sent")) {
        await supabase.from("orders").update({ shipping: pedido.shipping }).eq("id", pedido.id);
        throw new Error("envio: " + (r.error || r.reason));
      }
      s.enviados++;
      s.destinatarios.push({ ref: pedido.external_reference, codigo });

      // Mesmo cupom pelo WhatsApp, só pra quem marcou a caixinha no checkout
      // (Política 1.14). Falha aqui não desfaz o e-mail, que já saiu.
      if (pedido.shipping?.whatsapp_optin && !String(pedido.external_reference || "").startsWith("kit_trybo")) {
        const ate = new Date(oferta.expira).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
        const w = await enviarAviso("st_carrinho", pedido.shipping, [primeiroNome(nome), String(CUPOM_PCT), codigo, ate]);
        if (w.enviado) s.whatsapp = (s.whatsapp || 0) + 1;
      }
      await new Promise((ok) => setTimeout(ok, 250));
    } catch (e) {
      s.erros.push({ ref: pedido.external_reference, erro: e?.message || String(e) });
    }
  }

  console.log(`[carrinho-abandonado] ${s.enviados} cupom(ns) enviado(s) de ${s.candidatos} candidato(s)${dry ? " (ensaio)" : ""}`);
  if (s.erros.length) console.error("[carrinho-abandonado] erros:", JSON.stringify(s.erros).slice(0, 2000));
  return res.json(s);
}
