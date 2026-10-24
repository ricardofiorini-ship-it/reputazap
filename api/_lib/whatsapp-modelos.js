// ============================================================
// Avisos pelo WhatsApp com MODELO aprovado pela Meta (25/10/2026)
// ============================================================
// Fora da janela de 24h depois da última mensagem do cliente, a Meta só
// deixa a empresa escrever primeiro com um modelo aprovado. São estes quatro:
//
//   st_pedido_pago     (utilidade)  pagamento confirmado + prazo
//   st_pedido_postado  (utilidade)  rastreio
//   st_ativacao        (utilidade)  "chegou? precisa de ajuda pra ativar?"
//   st_carrinho        (marketing)  carrinho abandonado + cupom VOLTA
//
// SÓ para quem marcou, no checkout, que aceita avisos pelo WhatsApp
// (orders.shipping.whatsapp_optin) e não pediu pra parar depois (respondeu
// PARAR — ver `pediuParar`). Política 1.14 §3.1.
//
// Falha aqui NUNCA derruba o fluxo de quem chamou (pagamento, admin, cron):
// o e-mail continua saindo do mesmo jeito. Só grita no log.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const GRAPH = (process.env.WHATSAPP_GRAPH_VERSION || "v26.0").trim();
const WABA = (process.env.WHATSAPP_WABA_ID || "1241592304390338").trim();

// O texto de cada modelo. É o MESMO texto cadastrado na Meta (criarModelos)
// e o que vai pro histórico da conversa — pra o robô saber o que foi dito
// quando o cliente responder ao aviso.
export const MODELOS = {
  st_pedido_pago: {
    categoria: "UTILITY",
    texto: "Oi, {{1}}! Recebemos o pagamento do seu pedido na StarTouch. 🎉\n\nEle já entrou em produção e chega em até {{2}} dias úteis. Assim que for postado, mando o código de rastreio por aqui.\n\nQualquer dúvida, é só responder esta mensagem.",
    exemplo: ["Ana", "7"]
  },
  st_pedido_postado: {
    categoria: "UTILITY",
    texto: "Oi, {{1}}! Seu pedido da StarTouch foi postado. 📦\n\nCódigo de rastreio: {{2}}\nTransportadora: {{3}}\n\nQuando chegar, é só encostar o celular no cartão ou na placa para ativar. Se precisar de ajuda, responda aqui.",
    exemplo: ["Ana", "AB123456789BR", "Correios"]
  },
  st_ativacao: {
    categoria: "UTILITY",
    texto: "Oi, {{1}}! Seu StarTouch já chegou? 😊\n\nPara ativar, encoste o celular no cartão ou na placa (ou aponte a câmera para o QR Code) e siga os passos. Leva uns 2 minutos.\n\nSe travar em alguma parte, me responda aqui que eu te ajudo.",
    exemplo: ["Ana"]
  },
  st_carrinho: {
    categoria: "MARKETING",
    texto: "Oi, {{1}}! Vi que seu pedido na StarTouch ficou pela metade.\n\nSe ainda fizer sentido, separei {{2}}% de desconto na sua primeira compra com o cupom {{3}}, válido até {{4}}. O link para finalizar também foi para o seu e-mail.\n\nFicou alguma dúvida? É só responder aqui.",
    exemplo: ["Ana", "20", "VOLTA-K7M2QX", "31/10"]
  }
};

export function temConfiguracaoWhatsapp() {
  return !!((process.env.WHATSAPP_TOKEN || "").trim() && (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim());
}

/** Número no formato da Meta (só dígitos, com país). Brasil sem 55 ganha 55. */
export function numeroWhatsapp(telefone, pais = "BR") {
  let d = String(telefone || "").replace(/\D/g, "");
  if (!d) return null;
  if ((pais || "BR") === "BR") {
    if (d.length === 10 || d.length === 11) d = "55" + d;
    if (!(d.startsWith("55") && (d.length === 12 || d.length === 13))) return null;
  } else if (d.length < 8) return null;
  return d;
}

export const primeiroNome = (nome) => (String(nome || "").trim().split(/\s+/)[0] || "tudo bem").slice(0, 40);

/** A mensagem é um pedido pra parar os avisos? (só a palavra, sem mais nada) */
export const ehPedidoParaParar = (texto) =>
  /^\s*(parar|pare|sair|stop|cancelar avisos|não quero mais|nao quero mais)\s*[.!]*\s*$/i.test(texto || "");

/** O cliente respondeu PARAR (ou parecido) em algum momento? */
export async function pediuParar(waId) {
  const { data } = await supabase.from("whatsapp_mensagens").select("texto")
    .eq("wa_id", waId).eq("direcao", "entrada").limit(500);
  return (data || []).some((l) => ehPedidoParaParar(l.texto));
}

function textoFinal(nomeModelo, params) {
  return MODELOS[nomeModelo].texto.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? "");
}

/**
 * Envia um aviso com modelo. `shipping` é o orders.shipping do pedido (tem
 * telefone, país e o consentimento). Devolve { enviado, motivo }.
 */
export async function enviarAviso(nomeModelo, shipping, params) {
  try {
    if (!MODELOS[nomeModelo]) return { enviado: false, motivo: "modelo desconhecido" };
    if (!shipping?.whatsapp_optin) return { enviado: false, motivo: "sem consentimento" };
    if (!temConfiguracaoWhatsapp()) return { enviado: false, motivo: "WhatsApp não configurado" };
    const para = numeroWhatsapp(shipping.phone, shipping.country);
    if (!para) return { enviado: false, motivo: "telefone inválido" };
    if (await pediuParar(para)) return { enviado: false, motivo: "cliente pediu para parar" };

    const r = await fetch(`https://graph.facebook.com/${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
      body: JSON.stringify({
        messaging_product: "whatsapp", recipient_type: "individual", to: para, type: "template",
        template: {
          name: nomeModelo, language: { code: "pt_BR" },
          components: [{ type: "body", parameters: params.map((p) => ({ type: "text", text: String(p).slice(0, 200) })) }]
        }
      })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error(`[whatsapp-aviso] ${nomeModelo} NÃO saiu: ${r.status} ${d?.error?.message || ""}`);
      return { enviado: false, motivo: d?.error?.message || `HTTP ${r.status}` };
    }
    // Vai pro histórico: se o cliente responder ao aviso, o robô sabe do que se trata.
    await supabase.from("whatsapp_mensagens").insert({
      wa_id: para, direcao: "saida", wamid: d?.messages?.[0]?.id || null, texto: textoFinal(nomeModelo, params)
    });
    console.log(`[whatsapp-aviso] ${nomeModelo} enviado`);
    return { enviado: true };
  } catch (e) {
    console.error(`[whatsapp-aviso] ${nomeModelo} falhou:`, e?.message || e);
    return { enviado: false, motivo: e?.message || String(e) };
  }
}

/** Cadastra os modelos na Meta (uma vez). Os que já existem voltam com erro de duplicado — normal. */
export async function criarModelos() {
  const resultado = {};
  for (const [nome, m] of Object.entries(MODELOS)) {
    const r = await fetch(`https://graph.facebook.com/${GRAPH}/${WABA}/message_templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
      body: JSON.stringify({
        name: nome, language: "pt_BR", category: m.categoria,
        components: [{ type: "BODY", text: m.texto, example: { body_text: [m.exemplo] } }]
      })
    });
    const d = await r.json().catch(() => ({}));
    resultado[nome] = r.ok ? { ok: true, status: d.status, id: d.id } : { ok: false, erro: d?.error?.error_user_msg || d?.error?.message || `HTTP ${r.status}` };
  }
  return resultado;
}

/** Situação dos modelos na Meta (APPROVED / PENDING / REJECTED). */
export async function situacaoModelos() {
  const r = await fetch(`https://graph.facebook.com/${GRAPH}/${WABA}/message_templates?fields=name,status,category,rejected_reason&limit=100`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { erro: d?.error?.message || `HTTP ${r.status}` };
  return (d.data || []).filter((t) => MODELOS[t.name]).map((t) => ({ nome: t.name, status: t.status, categoria: t.category, motivo: t.rejected_reason || null }));
}
