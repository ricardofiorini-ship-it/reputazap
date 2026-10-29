// ============================================================
// Carrinho abandonado → cupom VOLTA de 20% (23/10/2026)
// ============================================================
// Quem preenche a entrega no /kit e não paga deixa um pedido `pending` em
// `orders`. Entre 23h e 72h depois, este cron manda UM e-mail com cupom de
// uso único (regras em _lib/cupom-volta.js). Roda de hora em hora, só de dia
// (8h às 20h de Brasília): e-mail de desconto às 3h da manhã é ruído.
//
// Quem NÃO recebe:
//   - quem já comprou: qualquer pedido pago (inclusive já em produção,
//     postado ou entregue), casando por e-mail, telefone ou CPF/CNPJ — não é
//     1ª compra, e cobre também quem voltou e comprou sozinho;
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

// A parte depois do "?" do link do carrinho: cupom + itens + origem. O e-mail
// usa o link inteiro; o botão do WhatsApp só aceita a parte variável no fim.
function queryDoCarrinho(codigo, itens, origem = "email") {
  const ids = [];
  for (const i of Array.isArray(itens) ? itens : []) {
    for (let n = 0; n < Math.min(Number(i.qty) || 1, 10); n++) ids.push(i.id);
  }
  const add = ids.length ? `&add=${encodeURIComponent(ids.join(","))}` : "";
  return `cupom=${encodeURIComponent(codigo)}${add}&utm_source=${origem}&utm_medium=cupom&utm_campaign=carrinho_abandonado`;
}
function linkDoCarrinho(codigo, itens) {
  return `https://startouch.com.br/kit?${queryDoCarrinho(codigo, itens)}`;
}

// QUEM JÁ COMPROU (29/10/2026). Antes só valia `status = "paid"` — mas o
// pedido sai de "paid" quando o Ricardo move pra produção/postado/entregue,
// então um cliente com pedido ENTREGUE que abandonasse um carrinho novo
// ganhava 20% de "primeira compra". Agora conta qualquer pedido pago (pela
// data de pagamento OU por um estado pós-pagamento), e casa também pelo
// telefone e pelo CPF/CNPJ — quem comprou com outro e-mail não ganha cupom.
const ESTADOS_PAGOS = ["paid", "em_producao", "postado", "entregue"];
const soDigitos = (v) => String(v || "").replace(/\D/g, "");
async function compradores() {
  const [porData, porEstado] = await Promise.all([
    supabase.from("orders").select("email, shipping").not("paid_at", "is", null).limit(1000),
    supabase.from("orders").select("email, shipping").in("status", ESTADOS_PAGOS).limit(1000)
  ]);
  if (porData.error || porEstado.error) throw new Error("compradores: " + (porData.error || porEstado.error).message);
  const c = { emails: new Set(), fones: new Set(), docs: new Set(), total: 0 };
  for (const o of [...(porData.data || []), ...(porEstado.data || [])]) {
    c.total++;
    const sh = o.shipping || {};
    for (const e of [o.email, sh.email]) if (e) c.emails.add(String(e).trim().toLowerCase());
    for (const f of [sh.phone, sh.whatsapp]) { const d = soDigitos(f); if (d.length >= 10) c.fones.add(d.slice(-10)); }
    for (const d of [sh.cpf_cnpj, sh.cnpj]) { const x = soDigitos(d); if (x.length >= 11) c.docs.add(x); }
  }
  // A janela de 1000 linhas enche um dia; aí a lista fica incompleta e o
  // cupom poderia ir pra cliente antigo. Grita em vez de errar calado.
  if ((porData.data || []).length >= 1000 || (porEstado.data || []).length >= 1000) {
    console.warn("[carrinho-abandonado] lista de compradores CORTADA em 1000 — a checagem de 'já comprou' pode deixar passar cliente antigo. Paginar.");
  }
  return c;
}
function jaComprou(c, email, shipping) {
  const sh = shipping || {};
  if (c.emails.has(String(email || "").trim().toLowerCase())) return true;
  const fone = soDigitos(sh.phone || sh.whatsapp).slice(-10);
  if (fone.length === 10 && c.fones.has(fone)) return true;
  const doc = soDigitos(sh.cpf_cnpj || sh.cnpj);
  return doc.length >= 11 && c.docs.has(doc);
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

  // Sem a lista de compradores, não manda nada: cupom de "primeira compra"
  // pra cliente antigo é pior do que um dia sem lembrete.
  let quemComprou;
  try { quemComprou = await compradores(); }
  catch (e) {
    console.error("[carrinho-abandonado] FALHOU ao ler compradores — nenhum cupom enviado:", e?.message || e);
    return res.status(500).json({ ...s, erro: e?.message || String(e) });
  }

  for (const [email, pedido] of porEmail) {
    if (s.enviados >= limit) break;
    try {
      if (jaComprou(quemComprou, email, pedido.shipping)) { s.pulados_ja_comprou++; continue; }
      const { data: historico, error: eh } = await supabase
        .from("orders").select("status, paid_at, shipping").ilike("email", email).limit(200);
      if (eh) throw new Error("histórico: " + eh.message);
      if ((historico || []).some((o) => o.paid_at || ESTADOS_PAGOS.includes(o.status))) { s.pulados_ja_comprou++; continue; }
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
        const params = [primeiroNome(nome), String(CUPOM_PCT), codigo, ate];
        // Primeiro o modelo com o botão do carrinho pronto; se a Meta ainda
        // não aprovou (ou recusar), cai no antigo, sem botão — o cupom sai igual.
        let w = await enviarAviso("st_carrinho_link", pedido.shipping, params, { botao: queryDoCarrinho(codigo, itens, "whatsapp") });
        if (!w.enviado && !/consentimento|parar|telefone|não configurado/i.test(w.motivo || "")) {
          console.warn(`[carrinho-abandonado] st_carrinho_link não saiu (${w.motivo}) — mandando o modelo sem botão`);
          w = await enviarAviso("st_carrinho", pedido.shipping, params);
        }
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
