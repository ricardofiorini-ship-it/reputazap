// ============================================================
// WhatsApp (11) 97694-4026 — webhook da Meta + assistente (24/10/2026)
// ============================================================
// GET  verificação do webhook (hub.mode / hub.verify_token / hub.challenge)
// POST mensagens novas (campo `messages`) e respostas que o Ricardo manda
//      pelo app do WhatsApp Business (campo `smb_message_echoes`, modo
//      "coexistência": o mesmo número no app E na API).
//
// Fluxo de uma mensagem do cliente:
//   1. confere a assinatura (X-Hub-Signature-256 com o App Secret) e responde
//      200 NA HORA — a Meta reenvia o que demora;
//   2. grava a mensagem (o wamid é único: reenvio da Meta não responde 2x);
//   3. espera alguns segundos: quem manda 3 mensagens seguidas recebe UMA
//      resposta, dada pela última;
//   4. se o Ricardo respondeu pelo app nas últimas 12h, ou se a conversa foi
//      passada pra ele, o robô fica quieto;
//   5. senão o assistente (_lib/whatsapp-agente.js) responde.
//
// Falha calada é o bug nº1 daqui: se a IA ou o envio falhar, o cliente recebe
// "já chamei o Ricardo" e o admin recebe e-mail. Nunca silêncio dos dois lados.
//
// Envs: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN,
// WHATSAPP_APP_SECRET, ANTHROPIC_API_KEY. Opcionais: WHATSAPP_MODEL,
// WHATSAPP_GRAPH_VERSION (padrão v26.0), WHATSAPP_BOT_DESLIGADO=1 (o robô só
// registra, não responde). Tabela: supabase/schema-whatsapp.sql.
// ============================================================
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";
import { responder, temConfiguracaoIA } from "./_lib/whatsapp-agente.js";
import { sendRawEmail } from "./_lib/email-sender.js";
import { cotarFrete, linkDeCompra } from "./_lib/ferramentas-venda.js";
import { ehPedidoParaParar, criarModelos, situacaoModelos, notaDaResposta, numeroWhatsapp } from "./_lib/whatsapp-modelos.js";

export const config = { api: { bodyParser: false } };

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const GRAPH = (process.env.WHATSAPP_GRAPH_VERSION || "v26.0").trim();
const HORA_MS = 3600000;
const PAUSA_HUMANO_MS = 12 * HORA_MS;   // depois que o Ricardo fala, o robô se cala
const AGRUPAR_MS = 6000;                // espera mensagens seguidas antes de responder
const HISTORICO_MAX = 20;

export const MARCA_DEVOLVIDA = "[conversa devolvida ao robô]";

const MSG_FALHA = "Recebi sua mensagem! Já chamei o Ricardo, da nossa equipe, e ele te responde por aqui em breve. 🙂";

// Toda conversa começa com o robô dizendo que é uma IA (27/10/2026). O marcador
// é a própria frase: se nenhuma resposta dos últimos 30 dias a contém, a
// próxima é a primeira e precisa se apresentar.
const MARCA_IA = /assistente virtual/i;
const APRESENTACAO = "Oi! Aqui é o assistente virtual da StarTouch (sou uma inteligência artificial), e o Ricardo, da equipe, também acompanha as conversas.";

// "Ok, obrigado" não é pedido de atendimento (27/10/2026). Caso: aviso
// automático de "pedido postado", a cliente responde "Ok obrigada" e o robô
// começava a atender como se ela tivesse perguntado algo. Mensagem feita só
// destas palavras (ou só de emoji/figurinha/reação) fica sem resposta — a não
// ser que a última fala nossa tenha sido uma PERGUNTA, porque aí "ok" pode
// ser um "sim" e quem decide é o assistente. Saudação ("boa noite") fica de
// fora de propósito: costuma ser o começo de um pedido.
const PALAVRAS_DE_FECHO = new Set(("ok okay okey oki okk blz beleza obrigado obrigada obrigadao obg obgd obgda brigado brigada "
  + "valeu vlw certo ta bom show perfeito perfeita otimo otima top joia combinado entendi entendido legal maravilha "
  + "massa tmj grato grata agradeco agradecido agradecida muito mto mt sim nao aguardo aguardando fico no de nada "
  + "amem deus abencoe bjs beijos abraco abracos abs isso e eh ah uhum hum k rs thanks thank you gracias").split(" "));

function ehSoFecho(texto, tipo) {
  if (tipo === "reaction" || tipo === "sticker") return true;
  if (tipo !== "text") return false;
  const bruto = String(texto || "");
  const palavras = bruto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/(.)\1{2,}/g, "$1")          // "valeuuu", "obrigadaaa", "kkkk"
    .split(/[^a-z]+/).filter(Boolean);
  if (!palavras.length) return /\p{Extended_Pictographic}/u.test(bruto);   // só emoji: 👍 🙏
  return palavras.length <= 8 && palavras.every((p) => PALAVRAS_DE_FECHO.has(p));
}

// Resposta do assistente quando decide que não há o que responder.
const SEM_RESPOSTA = "[SEM_RESPOSTA]";

// Mensagem que a Meta entrega como "unsupported" (enquete, visualização
// única, mensagem editada...): o robô não tem o que ler. Resposta fixa, sem
// IA, e UMA vez — caso de 26/10/2026: o outro lado era um sistema automático
// e o "não consegui abrir" virou pingue-pongue de 7 voltas.
const MSG_ILEGIVEL = "Oi! Aqui é o assistente virtual da StarTouch. Não consegui abrir essa mensagem por aqui. Pode me escrever em texto?";

async function lerCorpo(req) {
  const partes = [];
  for await (const p of req) partes.push(p);
  return Buffer.concat(partes);
}

function assinaturaOk(raw, header) {
  const segredo = (process.env.WHATSAPP_APP_SECRET || "").trim();
  if (!segredo) return false;   // sem segredo, não aceita nada (fecha por padrão)
  const esperado = "sha256=" + crypto.createHmac("sha256", segredo).update(raw).digest("hex");
  const a = Buffer.from(String(header || ""));
  const b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const soDigitos = (s) => String(s || "").replace(/\D/g, "");

async function gravar(linha) {
  const { error } = await supabase.from("whatsapp_mensagens").insert(linha);
  if (error && !/duplicate|unique/i.test(error.message)) {
    console.error(`[whatsapp] NÃO gravou (${linha.direcao}): ${error.message}` +
      (/relation|does not exist|schema cache/i.test(error.message) ? " — rode supabase/schema-whatsapp.sql" : ""));
    throw new Error(error.message);
  }
  return !error;   // false = já existia (reenvio da Meta)
}

async function enviarTexto(para, texto) {
  const r = await fetch(`https://graph.facebook.com/${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    body: JSON.stringify({
      messaging_product: "whatsapp", recipient_type: "individual",
      to: para, type: "text", text: { preview_url: true, body: String(texto).slice(0, 4000) }
    })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Meta respondeu ${r.status}: ${d?.error?.message || JSON.stringify(d).slice(0, 200)}`);
  return d?.messages?.[0]?.id || null;
}

async function avisarAdmin(assunto, html) {
  const admin = process.env.ADMIN_NOTIFICATIONS_EMAIL;
  if (!admin) { console.error("[whatsapp] ADMIN_NOTIFICATIONS_EMAIL ausente — aviso não saiu:", assunto); return; }
  const r = await sendRawEmail({ to: admin, subject: assunto, html });
  if (r?.error) console.error("[whatsapp] aviso ao admin falhou:", r.error);
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ── Ferramentas do assistente (o "como" de cada uma) ─────────────
const SITUACAO = {
  pending: "aguardando pagamento", paid: "pago, na fila de produção", em_producao: "em produção",
  postado: "postado", entregue: "entregue", cancelado: "cancelado"
};

function resumoPedido(o, completo) {
  const itens = (Array.isArray(o.items) ? o.items : []).map((i) => `${i.qty || 1}× ${i.name || i.id}`).join(", ");
  const partes = [
    `Pedido ${o.external_reference}`,
    `situação: ${SITUACAO[o.status] || o.status}`,
    `feito em ${new Date(o.created_at).toLocaleDateString("pt-BR")}`,
    o.paid_at ? `pago em ${new Date(o.paid_at).toLocaleDateString("pt-BR")}` : null,
    itens ? `itens: ${itens}` : null,
    o.shipping?.frete?.prazoTotalDias ? `prazo prometido: até ${o.shipping.frete.prazoTotalDias} dias úteis` : null,
    o.shipped_at ? `postado em ${new Date(o.shipped_at).toLocaleDateString("pt-BR")}` : null,
    completo && o.tracking_code ? `rastreio: ${o.tracking_code}` : null
  ];
  return partes.filter(Boolean).join(" · ");
}

async function consultarPedidos(waId, { email, numero_pedido }) {
  const campos = "external_reference, status, items, shipping, created_at, paid_at, shipped_at, tracking_code, email";
  if (numero_pedido || email) {
    let q = supabase.from("orders").select(campos).order("created_at", { ascending: false }).limit(5);
    q = numero_pedido ? q.eq("external_reference", String(numero_pedido).trim()) : q.ilike("email", String(email).trim());
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if (!data?.length) return "Nenhum pedido encontrado com esse dado.";
    return data.map((o) => resumoPedido(o, false)).join("\n") +
      "\n(Rastreio e endereço só são mostrados quando o pedido tem o mesmo telefone deste WhatsApp.)";
  }
  // Pelo telefone: compara os últimos 10 dígitos (DDD + número), que é o que
  // sobrevive às grafias (+55, com ou sem 9, com traço).
  const alvo = soDigitos(waId).slice(-10);
  const desde = new Date(Date.now() - 180 * 24 * HORA_MS).toISOString();
  const { data, error } = await supabase.from("orders").select(campos)
    .gte("created_at", desde).order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  const meus = (data || []).filter((o) => {
    const tel = soDigitos(o.shipping?.phone || o.shipping?.whatsapp || o.shipping?.telefone);
    return tel && tel.slice(-10) === alvo;
  }).slice(0, 5);
  if (!meus.length) return "Nenhum pedido com o telefone deste WhatsApp nos últimos 6 meses. Peça o e-mail da compra ou o número do pedido.";
  return meus.map((o) => resumoPedido(o, true)).join("\n");
}

const PRODUTO = { cartao_nfc: "cartão NFC", placa_balcao: "placa de balcão", placa_mesa: "placa de balcão M", pulseira_nfc: "pulseira NFC", cartao_social: "cartão Trybo" };

async function verificarCodigo({ codigo }) {
  const c = String(codigo || "").toUpperCase().replace(/\s+/g, "").trim();
  if (!c) return "Código vazio.";
  // linha-ok: o atendimento confere código das duas marcas (StarTouch e Trybo)
  const { data, error } = await supabase.from("plates").select("code, status, product_type, linha").eq("code", c).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return `O código ${c} não existe. Confira se digitou igual ao impresso (letra O e número 0 não são usados nos códigos novos).`;
  const marca = data.linha === "social" ? "Trybo" : "StarTouch";
  const estado = data.status === "active" ? "já está ATIVADO (ligado a uma conta)"
    : data.status === "disabled" ? "está DESATIVADO — precisa de uma pessoa da equipe"
    : "ainda NÃO foi ativado — pode ativar normalmente";
  return `${c}: ${PRODUTO[data.product_type] || data.product_type} ${marca}, ${estado}.`;
}

// ── Ferramentas de venda (25/10/2026) ──────────────────────────────
// Moram em _lib/ferramentas-venda.js desde 29/10/2026 (o assistente do site usa as mesmas).

async function chamarRicardo(waId, nome, { motivo, resumo }) {
  await gravar({ wa_id: waId, direcao: "escalado", texto: `${motivo} — ${resumo}` });
  await avisarAdmin(`WhatsApp: ${nome || "+" + waId} precisa de você`, `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="margin:0 0 8px;">📲 Conversa passada pra você</h2>
      <p><strong>Cliente:</strong> ${esc(nome || "—")} · +${esc(waId)}</p>
      <p><strong>Motivo:</strong> ${esc(motivo)}</p>
      <p><strong>Resumo:</strong> ${esc(resumo)}</p>
      <p><a href="https://wa.me/${esc(waId)}" style="display:inline-block;background:#1E8E3E;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700;">Abrir a conversa</a></p>
      <p style="color:#68757F;font-size:13px;">O assistente fica quieto nessa conversa pelas próximas 12 horas, ou até você responder.</p>
    </div>`);
  return "Feito: o Ricardo foi avisado e vai responder por aqui. O assistente não responde mais nesta conversa por enquanto.";
}

// ── Pesquisa de opinião (fase 3) ─────────────────────────────────
// O cron nps-whatsapp manda o modelo st_opiniao e marca o pedido com
// shipping.nps = { perguntado_em }. A resposta chega aqui:
//   1º a nota (0-10)  → 9-10 agradece e convida pro Divulgue e Ganhe;
//                       0-8 pergunta o que faltou;
//   2º o comentário   → 7-8 vai pro Ricardo por e-mail; 0-6 passa a conversa
//                       pra ele (o robô se cala, como em chamar_ricardo).
// Resposta que não é nota nem comentário esperado segue pro assistente.
const NPS_JANELA_MS = 7 * 24 * HORA_MS;

async function pedidoDaPesquisa(waId) {
  const desde = new Date(Date.now() - NPS_JANELA_MS).toISOString();
  const { data } = await supabase.from("orders").select("id, external_reference, shipping")
    .gte("shipping->nps->>perguntado_em", desde).limit(200);
  const fim = waId.slice(-10);
  return (data || []).filter((o) => numeroWhatsapp(o.shipping?.phone, o.shipping?.country)?.slice(-10) === fim)
    .sort((a, b) => Date.parse(b.shipping.nps.perguntado_em) - Date.parse(a.shipping.nps.perguntado_em))[0] || null;
}

async function responderFixo(waId, texto) {
  const wamid = await enviarTexto(waId, texto);
  await gravar({ wa_id: waId, direcao: "saida", wamid, texto });
}

async function tratarNps(waId, nome, texto) {
  const pedido = await pedidoDaPesquisa(waId);
  if (!pedido) return false;
  const nps = pedido.shipping.nps;
  const salvar = (novo) => supabase.from("orders")
    .update({ shipping: { ...pedido.shipping, nps: { ...nps, ...novo } } }).eq("id", pedido.id);

  if (nps.nota == null) {
    const nota = notaDaResposta(texto);
    if (nota == null) return false;
    const agora = new Date().toISOString();
    if (nota >= 9) {
      await salvar({ nota, respondido_em: agora, etapa: "fim" });
      // NÃO pôr aqui o link do Trustpilot: ele proíbe convidar só quem deu nota
      // alta. O convite dele vai pra todo comprador (cópia oculta no e-mail de
      // pagamento confirmado, billing.js). Esta env é pra destino que permita.
      const avaliar = (process.env.STARTOUCH_AVALIACAO_URL || "").trim();
      await responderFixo(waId, "Que bom demais, obrigado! 🙌\n\n" +
        "Se conhece alguém que também precisa de mais avaliações no Google: no Divulgue e Ganhe você recebe 10% de cada venda feita pelo seu link. É só entrar aqui: https://startouch.com.br/indique" +
        (avaliar ? `\n\nE se puder deixar sua opinião sobre a gente, ajuda muito: ${avaliar}` : ""));
    } else {
      await salvar({ nota, respondido_em: agora, etapa: "comentario" });
      await responderFixo(waId, nota >= 7
        ? "Obrigado! E o que faltou pra ser 10? Pode falar sem cerimônia, eu passo direto pro Ricardo."
        : "Poxa, sinto muito. Me conta o que aconteceu? Eu passo direto pro Ricardo, que cuida disso pessoalmente.");
    }
    console.log(`[whatsapp] pesquisa: nota ${nota} (${pedido.external_reference})`);
    return true;
  }

  if (nps.etapa === "comentario") {
    await salvar({ comentario: String(texto).slice(0, 2000), etapa: "fim" });
    if (nps.nota <= 6) {
      await chamarRicardo(waId, nome, { motivo: `Nota ${nps.nota} na pesquisa de opinião`, resumo: `Pedido ${pedido.external_reference}. Comentário: ${String(texto).slice(0, 500)}` });
      await responderFixo(waId, "Obrigado por contar. Já passei pro Ricardo, e ele te responde por aqui.");
    } else {
      await avisarAdmin(`Pesquisa: nota ${nps.nota} de ${nome || "+" + waId}`, `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="margin:0 0 8px;">O que faltou pra ser 10</h2>
          <p><strong>Cliente:</strong> ${esc(nome || "—")} · +${esc(waId)} · pedido ${esc(pedido.external_reference)}</p>
          <p><strong>Nota:</strong> ${nps.nota}</p>
          <p style="background:#F1F3F4;padding:12px;border-radius:8px;">${esc(texto)}</p>
        </div>`);
      await responderFixo(waId, "Anotado, obrigado! Já passei pro Ricardo. 🙂");
    }
    return true;
  }
  return false;
}

// ── Uma mensagem do cliente ──────────────────────────────────────
async function tratarMensagem(msg, nome) {
  const waId = soDigitos(msg.from);
  const texto = msg.type === "text" ? msg.text?.body || ""
    : msg.type === "button" ? msg.button?.text || ""
    : msg.type === "interactive" ? (msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "")
    : msg.type === "reaction" ? `[o cliente reagiu com ${msg.reaction?.emoji || "um emoji"}]`
    : `[o cliente mandou ${msg.type === "image" ? "uma imagem" : msg.type === "audio" ? "um áudio" : msg.type === "document" ? "um arquivo" : msg.type === "sticker" ? "uma figurinha" : "uma mensagem do tipo " + msg.type}]`;

  const nova = await gravar({ wa_id: waId, direcao: "entrada", wamid: msg.id, texto });
  if (!nova) { console.log("[whatsapp] mensagem repetida (reenvio da Meta) — ignorada"); return; }

  if (process.env.WHATSAPP_BOT_DESLIGADO === "1") { console.log("[whatsapp] robô desligado — só registrou"); return; }

  // PARAR: resposta fixa, sem IA. A linha gravada acima já é o registro —
  // `pediuParar` lê dali e nenhum aviso automático sai mais pra este número.
  if (ehPedidoParaParar(texto)) {
    const resp = "Pronto, não te mando mais avisos automáticos por aqui. Se precisar de alguma coisa, é só escrever. 🙂";
    const wamid = await enviarTexto(waId, resp);
    await gravar({ wa_id: waId, direcao: "saida", wamid, texto: resp });
    return;
  }

  // Agrupa rajadas: só a última mensagem da rajada responde.
  await new Promise((ok) => setTimeout(ok, AGRUPAR_MS));
  const { data: ultima } = await supabase.from("whatsapp_mensagens").select("wamid")
    .eq("wa_id", waId).eq("direcao", "entrada").order("criado_em", { ascending: false }).limit(1).maybeSingle();
  if (ultima?.wamid && ultima.wamid !== msg.id) return;

  const desde = new Date(Date.now() - 24 * HORA_MS).toISOString();
  const { data: linhas, error } = await supabase.from("whatsapp_mensagens").select("direcao, texto, criado_em")
    .eq("wa_id", waId).gte("criado_em", desde).order("criado_em", { ascending: false }).limit(60);
  if (error) throw new Error(error.message);

  // Pessoa na conversa? O robô fica quieto — a não ser que a conversa tenha
  // sido DEVOLVIDA ao robô depois (botão em /admin/whatsapp, que grava uma
  // linha `saida` com o marcador abaixo). Vale o evento mais recente.
  const ultimoControle = (linhas || []).find((l) => l.direcao === "humano" || l.direcao === "escalado"
    || (l.direcao === "saida" && (l.texto || "").startsWith(MARCA_DEVOLVIDA)));
  const pausa = ultimoControle && ultimoControle.direcao !== "saida"
    && Date.now() - Date.parse(ultimoControle.criado_em) < PAUSA_HUMANO_MS ? ultimoControle : null;
  if (pausa) { console.log(`[whatsapp] conversa com pessoa (${pausa.direcao}) — robô quieto`); return; }

  // Robô falando com robô (26 e 27/10/2026): o atendimento automático de outra
  // empresa responde cada mensagem nossa com o MESMO texto. Texto longo que já
  // chegou igualzinho nas últimas 24h é máquina — calar quebra o laço. (Texto
  // curto repetido, tipo "sim", é gente respondendo duas perguntas.)
  const normal = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (msg.type === "text" && normal(texto).length >= 20
    && (linhas || []).filter((l) => l.direcao === "entrada" && normal(l.texto) === normal(texto)).length >= 2) {
    console.log("[whatsapp] mesmo texto de novo — parece resposta automática de outro sistema, sem resposta");
    return;
  }

  if (msg.type === "unsupported") {
    const ultimaSaida = (linhas || []).find((l) => l.direcao === "saida");
    if (ultimaSaida?.texto === MSG_ILEGIVEL) { console.log("[whatsapp] outra mensagem ilegível — já pedi texto, sem resposta"); return; }
    await responderFixo(waId, MSG_ILEGIVEL);
    return;
  }

  if (await tratarNps(waId, nome, texto)) return;

  if (ehSoFecho(texto, msg.type)) {
    const ultimaNossa = (linhas || []).find((l) => (l.direcao === "saida" || l.direcao === "humano")
      && !(l.texto || "").startsWith(MARCA_DEVOLVIDA));
    if (!(ultimaNossa?.texto || "").includes("?")) {
      console.log("[whatsapp] só agradecimento/ok — sem resposta");
      return;
    }
  }
  await gerarEEnviar(waId, nome, linhas, texto, msg.id);
}

// Chegou mensagem nova do cliente enquanto a resposta era gerada? (27/10/2026)
// Caso: "Tem como me explicar tudo sobre" + "Como funciona", 7s de
// intervalo — a espera acima não cobre quem digita em pedaços, e saíam duas
// explicações quase iguais. Quem responde é o atendimento da mensagem mais
// nova, que já enxerga as duas.
async function foiSuperada(waId, wamid) {
  if (!wamid) return false;
  const { data } = await supabase.from("whatsapp_mensagens").select("wamid")
    .eq("wa_id", waId).eq("direcao", "entrada").order("criado_em", { ascending: false }).limit(1).maybeSingle();
  return !!(data?.wamid && data.wamid !== wamid);
}

// Monta o histórico, pede a resposta ao assistente e envia. Usado pela
// mensagem nova do cliente e pelo "Devolver ao robô" do admin.
async function gerarEEnviar(waId, nome, linhas, texto, wamidGatilho = null) {
  // Histórico em ordem, só o que foi dito, juntando mensagens seguidas do
  // mesmo lado — a API alterna os papéis. O que o RICARDO escreveu pelo app
  // entra do lado do atendimento, marcado: quando a conversa volta pro robô,
  // ele precisa saber o que a pessoa já combinou com o cliente.
  const historico = [];
  for (const l of (linhas || []).slice().reverse()) {
    if (l.direcao !== "entrada" && l.direcao !== "saida" && l.direcao !== "humano") continue;
    if (l.direcao === "saida" && (l.texto || "").startsWith(MARCA_DEVOLVIDA)) continue;   // marcador, não fala do robô
    const role = l.direcao === "entrada" ? "user" : "assistant";
    const conteudo = l.direcao === "humano" ? `[Ricardo, da equipe, escreveu:] ${l.texto || ""}` : (l.texto || "");
    const ult = historico[historico.length - 1];
    if (ult && ult.role === role) ult.content += "\n" + conteudo;
    else historico.push({ role, content: conteudo });
  }
  while (historico.length && historico[0].role !== "user") historico.shift();
  const recorte = historico.slice(-HISTORICO_MAX);
  if (recorte[0]?.role !== "user") recorte.shift();
  if (!recorte.length) return;
  // O nome do perfil do WhatsApp NÃO vai pro assistente (27/10/2026): é
  // apelido, nome de outra pessoa ou da loja, e ouvir "Oi, Mãe do João!" de
  // um robô soa errado. O nome segue só nos e-mails pro admin.

  // Primeira conversa? = nunca se apresentou E o cliente não tinha escrito
  // antes desta rajada (30 dias). A segunda parte existe porque conversa que
  // já vinha rolando ganhava "Oi! Eu sou o assistente virtual" no meio da
  // venda (27/10/2026) — as respostas de antes da regra não tinham a frase.
  const desde30 = new Date(Date.now() - 30 * 24 * HORA_MS).toISOString();
  const antesDaRajada = new Date(Date.now() - 10 * 60000).toISOString();
  const [{ data: apresentou }, { data: escreveuAntes }] = await Promise.all([
    supabase.from("whatsapp_mensagens").select("id")
      .eq("wa_id", waId).eq("direcao", "saida").gte("criado_em", desde30)
      .ilike("texto", "%assistente virtual%").limit(1),
    supabase.from("whatsapp_mensagens").select("id")
      .eq("wa_id", waId).eq("direcao", "entrada").gte("criado_em", desde30).lt("criado_em", antesDaRajada).limit(1)
  ]);
  const primeira = !(apresentou || []).length && !(escreveuAntes || []).length;
  if (primeira) {
    const ult = recorte.length - 1;
    recorte[ult] = { ...recorte[ult], content: `[Esta é a sua primeira resposta a este cliente: comece se apresentando como o assistente virtual da StarTouch (uma inteligência artificial), numa frase curta.]\n${recorte[ult].content}` };
  }

  let resultado;
  try {
    if (!temConfiguracaoIA()) throw new Error("ANTHROPIC_API_KEY ausente");
    resultado = await responder(recorte, async (ferramenta, input) => {
      if (ferramenta === "consultar_pedidos") return consultarPedidos(waId, input);
      if (ferramenta === "verificar_codigo") return verificarCodigo(input);
      if (ferramenta === "cotar_frete") return cotarFrete(input);
      if (ferramenta === "link_de_compra") return linkDeCompra(input);
      if (ferramenta === "chamar_ricardo") return chamarRicardo(waId, nome, input);
      return "Ferramenta desconhecida.";
    });
  } catch (e) {
    console.error(`[whatsapp] assistente FALHOU para +${waId}:`, e?.message || e);
    resultado = { texto: null, erro: e?.message || String(e) };
  }

  let resposta = resultado.texto;
  // Superada por mensagem mais nova: cala. Exceto se já passou pro Ricardo —
  // aí a próxima rodada fica quieta (pausa) e o aviso ao cliente é este.
  if (!resultado.escalou && await foiSuperada(waId, wamidGatilho)) {
    console.log("[whatsapp] cliente mandou mais coisa enquanto eu respondia — a resposta sai pela mensagem nova");
    return;
  }
  if (resposta && resposta.includes(SEM_RESPOSTA)) {
    console.log("[whatsapp] assistente decidiu não responder (cliente só encerrou)");
    return;
  }
  if (resposta && primeira && !MARCA_IA.test(resposta)) resposta = `${APRESENTACAO}\n\n${resposta}`;
  if (!resposta) {
    // Sem resposta boa (erro, recusa, laço): o cliente não fica no vácuo e o
    // admin fica sabendo.
    resposta = MSG_FALHA;
    if (!resultado.escalou) {
      await gravar({ wa_id: waId, direcao: "escalado", texto: `assistente sem resposta (${resultado.erro || (resultado.recusou ? "recusa" : "laço")})` });
      await avisarAdmin(`WhatsApp: assistente não respondeu ${nome || "+" + waId}`,
        `<p>O assistente não conseguiu responder e o cliente recebeu "já chamei o Ricardo".</p>
         <p><strong>Cliente:</strong> ${esc(nome || "—")} · +${esc(waId)}</p>
         <p><strong>Última mensagem:</strong> ${esc(texto)}</p>
         <p><strong>Motivo técnico:</strong> ${esc(resultado.erro || (resultado.recusou ? "recusa do modelo" : "laço de ferramentas"))}</p>
         <p><a href="https://wa.me/${esc(waId)}">Abrir a conversa</a></p>`);
    }
  }

  try {
    const wamid = await enviarTexto(waId, resposta);
    await gravar({ wa_id: waId, direcao: "saida", wamid, texto: resposta });
    console.log(`[whatsapp] respondido (${resposta === MSG_FALHA ? "mensagem de falha" : "assistente"})`);
  } catch (e) {
    console.error(`[whatsapp] ENVIO FALHOU para +${waId}:`, e?.message || e);
    await avisarAdmin(`WhatsApp: resposta não foi enviada a ${nome || "+" + waId}`,
      `<p>A Meta recusou o envio da resposta. O cliente está sem retorno.</p>
       <p><strong>Erro:</strong> ${esc(e?.message || e)}</p>
       <p><strong>Cliente:</strong> +${esc(waId)} · <a href="https://wa.me/${esc(waId)}">abrir</a></p>`);
  }
}

/**
 * "Devolver ao robô" (admin): se a última mensagem do cliente ficou sem
 * resposta, o robô responde AGORA — senão os dois ficam se esperando. Só
 * dentro de 24h da última mensagem do cliente (fora disso a Meta só aceita
 * modelo aprovado). Devolve { respondeu, motivo }.
 */
export async function responderPendente(waId) {
  const desde = new Date(Date.now() - 24 * HORA_MS).toISOString();
  const { data: linhas, error } = await supabase.from("whatsapp_mensagens").select("direcao, texto, criado_em")
    .eq("wa_id", waId).gte("criado_em", desde).order("criado_em", { ascending: false }).limit(60);
  if (error) throw new Error(error.message);
  const ultimaFala = (linhas || []).find((l) => l.direcao === "entrada" || l.direcao === "humano"
    || (l.direcao === "saida" && !(l.texto || "").startsWith(MARCA_DEVOLVIDA)));
  if (!ultimaFala) return { respondeu: false, motivo: "fora_24h" };
  if (ultimaFala.direcao !== "entrada") return { respondeu: false, motivo: "nada_pendente" };
  await gerarEEnviar(waId, "", linhas, ultimaFala.texto || "");
  return { respondeu: true };
}

// O Ricardo respondeu pelo app (coexistência): registra e pausa o robô.
// Reação (emoji segurando a mensagem) não é "assumir a conversa" — um toque
// sem querer calava o robô por 12h (24/10/2026). Só mensagem de verdade pausa.
const ECO_QUE_NAO_PAUSA = new Set(["reaction", "unsupported", "system"]);

async function tratarEco(eco) {
  const waId = soDigitos(eco.to);
  if (!waId) return;
  if (ECO_QUE_NAO_PAUSA.has(eco.type)) { console.log(`[whatsapp] eco do tipo ${eco.type} — não pausa o robô`); return; }
  await gravar({ wa_id: waId, direcao: "humano", wamid: eco.id || null, texto: eco.text?.body || `[${eco.type}]` });
}

async function processar(payload) {
  // Uma linha por evento, sem conteúdo de mensagem: é o que diz, no log da
  // Vercel, se a Meta está entregando (o caminho de sucesso não escrevia nada,
  // e "não chegou" ficava indistinguível de "chegou e deu certo").
  const resumo = (payload?.entry || []).flatMap((e) => (e.changes || []).map((c) =>
    `${c.field}:${(c.value?.messages || []).length}msg/${(c.value?.message_echoes || []).length}eco/${(c.value?.statuses || []).length}st`));
  console.log(`[whatsapp] evento recebido ${resumo.join(" ") || "(vazio)"}`);
  for (const entrada of payload?.entry || []) {
    for (const mudanca of entrada?.changes || []) {
      const v = mudanca?.value || {};
      if (mudanca.field === "smb_message_echoes") {
        for (const eco of v.message_echoes || []) {
          try { await tratarEco(eco); } catch (e) { console.error("[whatsapp] eco falhou:", e?.message); }
        }
        continue;
      }
      if (mudanca.field !== "messages") continue;
      for (const st of v.statuses || []) {
        if (st.status === "failed") console.error(`[whatsapp] Meta: envio FALHOU para ${st.recipient_id}:`, JSON.stringify(st.errors || []).slice(0, 300));
      }
      const nome = v.contacts?.[0]?.profile?.name || "";
      for (const msg of v.messages || []) {
        try { await tratarMensagem(msg, nome); } catch (e) { console.error("[whatsapp] mensagem falhou:", e?.message || e); }
      }
    }
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const q = req.query || {};

    // MODELOS dos avisos (Política 1.14): ?modelos=criar cadastra na Meta,
    // ?modelos=ver mostra se já foram aprovados. Mesmo segredo do teste.
    if (q.modelos !== undefined) {
      const validos = [process.env.BROADCAST_SECRET, process.env.CRON_SECRET].map((v) => (v || "").trim()).filter(Boolean);
      if (!validos.length || !validos.includes(String(q.secret || "").trim().replace(/ /g, "+"))) return res.status(404).end();
      try {
        if (q.modelos === "criar") return res.status(200).json({ criados: await criarModelos(), situacao: await situacaoModelos() });
        return res.status(200).json({ situacao: await situacaoModelos() });
      } catch (e) {
        return res.status(500).json({ erro: e?.message || String(e) });
      }
    }

    // TESTE do assistente sem WhatsApp: /api/whatsapp?teste=<pergunta>&secret=<BROADCAST_SECRET>
    // Devolve a resposta que o robô daria. Não envia nada, não grava nada, e
    // "chamar o Ricardo" vira só um aviso na resposta (sem e-mail).
    if (q.teste !== undefined) {
      const validos = [process.env.BROADCAST_SECRET, process.env.CRON_SECRET].map((v) => (v || "").trim()).filter(Boolean);
      if (!validos.length || !validos.includes(String(q.secret || "").trim().replace(/ /g, "+"))) return res.status(404).end();
      const chamadas = [];
      try {
        const r = await responder([{ role: "user", content: String(q.teste).slice(0, 1000) }], async (ferramenta, input) => {
          chamadas.push({ ferramenta, input });
          if (ferramenta === "consultar_pedidos") return (input.email || input.numero_pedido) ? consultarPedidos("0", input) : "Nenhum pedido com o telefone deste WhatsApp (teste sem telefone).";
          if (ferramenta === "verificar_codigo") return verificarCodigo(input);
      if (ferramenta === "cotar_frete") return cotarFrete(input);
      if (ferramenta === "link_de_compra") return linkDeCompra(input);
          if (ferramenta === "chamar_ricardo") return "Feito (TESTE: nenhum e-mail foi enviado).";
          return "Ferramenta desconhecida.";
        });
        return res.status(200).json({ modelo: process.env.WHATSAPP_MODEL || "claude-opus-5-5", pergunta: q.teste, resposta: r.texto, ferramentas_usadas: chamadas, recusou: !!r.recusou });
      } catch (e) {
        return res.status(500).json({ erro: e?.message || String(e) });
      }
    }

    const token = (process.env.WHATSAPP_VERIFY_TOKEN || "").trim();
    if (q["hub.mode"] === "subscribe" && token && q["hub.verify_token"] === token) {
      return res.status(200).send(String(q["hub.challenge"] || ""));
    }
    return res.status(403).send("forbidden");
  }
  if (req.method !== "POST") return res.status(405).end();

  const raw = await lerCorpo(req);
  if (!assinaturaOk(raw, req.headers["x-hub-signature-256"])) {
    console.warn("[whatsapp] assinatura inválida ou WHATSAPP_APP_SECRET ausente — evento ignorado");
    return res.status(401).end();
  }
  let payload;
  try { payload = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).end(); }

  // Responde já; o trabalho continua depois da resposta (a Meta reenvia o
  // que demora, e a resposta da IA leva alguns segundos).
  waitUntil(processar(payload).catch((e) => console.error("[whatsapp] processamento falhou:", e?.message || e)));
  return res.status(200).end();
}
