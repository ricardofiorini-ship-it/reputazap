// ============================================================
// StarTouch — Canal do titular (POST /api/titular) — Art. 18 da LGPD
// ============================================================
// Registra a solicitação, notifica o Encarregado e devolve protocolo + prazo
// ao titular. NÃO executa nada sozinho: eliminação de dados é acionada pelo
// admin (api/admin.js?action=delete-user). Requisição web que apaga conta é
// porta pra apagar a conta alheia.
//
// ANTI-ENUMERAÇÃO — a regra que governa este arquivo:
// a resposta é SEMPRE a mesma, exista ou não cadastro com aquele e-mail.
// Mesmo padrão do forgot-password.js:29. O oráculo moraria na resposta HTTP,
// não no e-mail: quem digita o endereço de outra pessoa nunca recebe a
// mensagem, então enviar ou não enviar não vaza nada pra ele — mas um
// "não encontramos esse cadastro" vazaria.
//
// Sobra poder fazer o site mandar e-mail pra um endereço qualquer. Contra isso:
// limite por e-mail alvo (1/24h) além do limite por IP, e texto neutro que não
// afirma nada sobre a pessoa.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { limitou } from "./_lib/rate-limit.js";
import { sendRawEmail } from "./_lib/email-sender.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DPO_EMAIL = process.env.DPO_EMAIL || process.env.ADMIN_NOTIFICATIONS_EMAIL;
const PRAZO_DIAS = 15; // Art. 18: 15 dias corridos da solicitação

const TIPOS = {
  confirmacao:  "Confirmação da existência de tratamento",
  acesso:       "Acesso aos dados",
  correcao:     "Correção de dados incompletos ou desatualizados",
  eliminacao:   "Eliminação dos dados",
  portabilidade:"Portabilidade",
  revogacao:    "Revogação do consentimento"
};

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Protocolo curto e legível: ST-MMDD-XXXX. O titular vai citar isso por
// telefone ou e-mail, então nada de UUID.
function novoProtocolo() {
  const d = new Date();
  const mmdd = String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  let r = "";
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I/O/0/1: confundem ao ditar
  for (let i = 0; i < 4; i++) r += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return `ST-${mmdd}-${r}`;
}

// O e-mail informado corresponde a um usuário? Só o admin vê o resultado.
async function confereIdentidade(email) {
  try {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const alvo = email.toLowerCase();
    return (data?.users || []).some((u) => (u.email || "").toLowerCase() === alvo);
  } catch (e) {
    console.error("[titular] falha ao conferir identidade:", e?.message);
    return null; // desconhecido ≠ falso
  }
}

// Limite por e-mail alvo: impede usar o formulário como disparador contra
// terceiro. O limite por IP sozinho não cobre — trocar de IP é barato.
async function jaPediuHoje(email) {
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("titular_requests")
    .select("id")
    .eq("email", email.toLowerCase())
    .gte("criado_em", desde)
    .limit(1);
  if (error) {
    // Falha de banco não pode virar bloqueio do direito. Passa e loga.
    console.error("[titular] checagem de repetição falhou:", error.message);
    return false;
  }
  return (data || []).length > 0;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  if (await limitou(req, res, { nome: "titular", porIpHora: 5, globalDia: 200 })) return;

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body && typeof body === "object" ? body : {};

  const email = String(body.email || "").trim().toLowerCase();
  const tipo = String(body.tipo || "").trim();
  const nome = String(body.nome || "").trim().slice(0, 120);
  const mensagem = String(body.mensagem || "").trim().slice(0, 2000);

  // Validação de FORMATO só. Nada aqui pode depender de o e-mail existir.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "Informe um e-mail válido." });
  }
  if (!TIPOS[tipo]) {
    return res.status(400).json({ error: "Escolha o tipo de solicitação." });
  }

  // Resposta única deste endpoint no caminho feliz. Uma variável só, usada nos
  // dois ramos abaixo, pra ninguém "melhorar a mensagem" de um lado só e
  // reabrir o oráculo sem perceber.
  const RESPOSTA_UNIFORME = {
    ok: true,
    mensagem: "Solicitação registrada. Se houver dados associados a este e-mail, " +
              "responderemos em até 15 dias, conforme o Art. 18 da LGPD."
  };

  if (await jaPediuHoje(email)) {
    // Mesma resposta de sucesso: dizer "já existe pedido" contaria a um
    // estranho que aquele endereço pediu algo.
    return res.json(RESPOSTA_UNIFORME);
  }

  const protocolo = novoProtocolo();
  const prazo = new Date(Date.now() + PRAZO_DIAS * 24 * 60 * 60 * 1000);
  const confere = await confereIdentidade(email);

  const { error: insErr } = await supabase.from("titular_requests").insert({
    protocolo, tipo, email, nome: nome || null, mensagem: mensagem || null,
    identidade_confere: confere, prazo_em: prazo.toISOString()
  });

  if (insErr) {
    // Aqui NÃO dá pra fingir sucesso: sem registro, o prazo não corre e o
    // pedido some. Melhor o titular tentar de novo do que achar que pediu.
    console.error("[titular] falha ao registrar solicitação:", insErr.message);
    return res.status(500).json({
      error: "Não foi possível registrar agora. Tente de novo ou escreva para privacidade@startouch.com.br."
    });
  }

  const prazoBR = prazo.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  // 1. Aviso ao Encarregado — este SIM diz se o e-mail bate com um cadastro.
  if (DPO_EMAIL) {
    const conf = confere === null ? "não foi possível conferir"
               : confere ? "SIM — bate com um usuário cadastrado"
               : "não — nenhum usuário com este e-mail";
    await sendRawEmail({
      to: DPO_EMAIL,
      subject: `[LGPD] ${protocolo} — ${TIPOS[tipo]} (prazo ${prazoBR})`,
      html:
        `<h2>Solicitação de titular</h2>` +
        `<p><strong>Protocolo:</strong> ${esc(protocolo)}<br/>` +
        `<strong>Tipo:</strong> ${esc(TIPOS[tipo])}<br/>` +
        `<strong>E-mail:</strong> ${esc(email)}<br/>` +
        `<strong>Nome informado:</strong> ${esc(nome || "—")}<br/>` +
        `<strong>Identidade confere:</strong> ${esc(conf)}</p>` +
        (mensagem ? `<p><strong>Mensagem:</strong><br/>${esc(mensagem).replace(/\n/g, "<br/>")}</p>` : "") +
        `<p><strong>Prazo do Art. 18: ${esc(prazoBR)}</strong> (15 dias da solicitação).</p>` +
        `<p>Eliminação é executada por você em /admin/clientes, nunca pelo formulário.</p>`
    }).catch((e) => console.error("[titular] aviso ao DPO falhou:", e?.message));
  } else {
    console.warn("[titular] DPO_EMAIL/ADMIN_NOTIFICATIONS_EMAIL ausente — aviso pulado");
  }

  // 2. Protocolo ao titular. Texto NEUTRO: não afirma que existe cadastro.
  await sendRawEmail({
    to: email,
    subject: `Solicitação registrada — protocolo ${protocolo}`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#202124;">` +
      `<h2 style="color:#1A73E8;margin-bottom:6px;">Solicitação registrada</h2>` +
      `<p style="color:#5F6368;font-size:14px;margin-top:0;">Recebemos uma solicitação relacionada a dados pessoais, enviada com este endereço de e-mail.</p>` +
      `<p><strong>Protocolo:</strong> ${esc(protocolo)}<br/>` +
      `<strong>Tipo:</strong> ${esc(TIPOS[tipo])}<br/>` +
      `<strong>Prazo de resposta:</strong> ${esc(prazoBR)}</p>` +
      `<p style="font-size:13px;color:#5F6368;">Analisaremos e responderemos em até 15 dias, conforme o Art. 18 da LGPD. Podemos pedir informações adicionais para confirmar sua identidade antes de executar qualquer alteração.</p>` +
      `<p style="font-size:12px;color:#80868B;border-top:1px solid #e5e7eb;padding-top:14px;">Se você não fez esta solicitação, ignore este e-mail: nada será alterado sem confirmação. Dúvidas: privacidade@startouch.com.br</p>` +
      `</div>`
  }).catch((e) => console.error("[titular] protocolo ao titular falhou:", e?.message));

  return res.json(RESPOSTA_UNIFORME);
}
