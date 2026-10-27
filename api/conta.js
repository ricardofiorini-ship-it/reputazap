// ============================================================
// StarTouch — Conta do usuário (GET/POST /api/conta)
// ============================================================
// O que faltava pra "Minha conta" deixar de ser vitrine: ler e gravar os
// dados da PESSOA (nome, telefone, senha). O que é do NEGÓCIO continua no
// savebiz; aqui não se toca em `businesses`.
//
// Dispatcher por `?action=`:
//   GET  (sem action)   → nome, e-mail e telefone reais
//   POST ?action=perfil → salva nome e telefone
//   POST ?action=senha  → troca a senha de quem está logado
//   POST ?action=idioma → língua dos e-mails ({ lang: pt|en|es|zh }; ver _lib/idioma.js)
//   POST ?action=email  → pede a troca do e-mail de login (manda o link pro novo)
//   GET  ?action=confirmar-email&t= → o link do e-mail; troca e avisa o antigo.
//                         Sem token de sessão: quem clica pode estar noutro aparelho.
//
// ── Troca de e-mail (27/10/2026) ──
// Antes era pedido no WhatsApp e troca à mão pelo admin. Três travas, cada
// uma contra uma coisa: a senha atual (celular destravado na mão de outro),
// o link no endereço NOVO (e-mail digitado errado = conta sem acesso) e o
// aviso no endereço ANTIGO depois da troca (detecção, se as outras falharem).
// O link é assinado e carrega o e-mail de ORIGEM: depois da troca ele não
// confere mais com a conta, então não pode ser usado de novo.
//
// ── Por que a senha atual é EXIGIDA pra trocar a senha ──
// O token já prova quem é. Mesmo assim pedimos a senha atual, porque as duas
// coisas protegem contra ameaças diferentes: o token protege contra estranho
// na internet; a senha atual protege contra quem já está NA FRENTE do celular
// destravado do lojista. Sem ela, trinta segundos com o aparelho alheio viram
// troca de senha e conta sequestrada — e o dono perde o acesso sem nunca
// saber por quê. Por isso também o freio por IP: senha atual conferida é
// alvo de tentativa e erro, e sem limite o campo vira adivinhador de senha.
//
// ── O nome mora em DOIS lugares, e os dois têm que andar juntos ──
// `profiles.name` é o que o painel lê; `auth.user_metadata.name` é o que o
// login devolve e o que o `savebiz.js:69` usa pra reconstruir o profile. Se a
// gente gravasse só um, a próxima vez que o cliente salvasse o negócio o nome
// VOLTARIA sozinho pro valor antigo — falha silenciosa clássica: sem erro,
// sem log, e o cliente achando que não salvou direito. Grava nos dois.
// ============================================================
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { limitou } from "./_lib/rate-limit.js";
import { gravarIdioma, idiomaValido } from "./_lib/idioma.js";
import { sendTransactionalEmail } from "./_lib/email-sender.js";
import { emailTrocaConfirmarEmail, emailTrocadoEmail } from "./_lib/email-templates.js";
import { listarTodosUsuarios } from "./_lib/usuarios.js";

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SENHA_MINIMA = 6; // mesma régua do reset-password.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET" && req.query.action === "confirmar-email") {
    try { return await confirmarEmail(req, res); } catch (err) {
      console.error("[conta] confirmar-email falhou:", err);
      return paginaResultado(res, "pt", "erro", 500);
    }
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token obrigatório" });

  const { data: userData, error: authError } = await admin.auth.getUser(token);
  if (authError || !userData?.user) {
    return res.status(401).json({ error: "Token inválido" });
  }
  const user = userData.user;
  const action = (req.query.action || "").toString();

  try {
    if (req.method === "GET") return await lerPerfil(res, user);
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (action === "perfil") return await salvarPerfil(req, res, user);
    if (action === "senha") return await trocarSenha(req, res, user);
    if (action === "email") return await pedirTrocaEmail(req, res, user);
    if (action === "idioma") {
      const lang = idiomaValido(req.body?.lang);
      if (!lang) return res.status(400).json({ error: "Idioma inválido" });
      const ok = await gravarIdioma(user.id, lang);
      return ok ? res.json({ ok: true, lang }) : res.status(500).json({ error: "Não foi possível salvar o idioma." });
    }
    return res.status(400).json({ error: "Ação desconhecida" });
  } catch (err) {
    console.error("[conta] erro inesperado:", err);
    return res.status(500).json({ error: "Não foi possível concluir. Tente de novo." });
  }
}

// ── GET: os dados reais da pessoa ───────────────────────────
// O painel mostrava telefone de mentira ((11) 99999-9999, do mock) porque não
// havia de onde ler o verdadeiro. É esta função que fecha esse buraco.
async function lerPerfil(res, user) {
  const meta = user.user_metadata || {};
  const { data: perfil, error } = await admin
    .from("profiles")
    .select("name, phone")
    .eq("id", user.id)
    .maybeSingle();

  // O profile pode não existir ainda (conta criada antes do savebiz rodar).
  // Isso não é erro: cai no metadata do auth, que sempre existe.
  if (error) console.warn("[conta] leitura do profile falhou:", error.message);

  return res.json({
    ok: true,
    tem_senha: temSenha(user),
    user: {
      email: user.email,
      name: perfil?.name || meta.full_name || meta.name || "",
      phone: perfil?.phone || meta.phone || ""
    }
  });
}

// ── POST ?action=perfil ─────────────────────────────────────
async function salvarPerfil(req, res, user) {
  const name = (req.body?.name || "").toString().trim();
  const phone = (req.body?.phone || "").toString().trim();

  if (!name) return res.status(400).json({ error: "O nome não pode ficar em branco" });
  if (name.length > 120) return res.status(400).json({ error: "Nome muito longo" });
  if (phone.length > 40) return res.status(400).json({ error: "Telefone muito longo" });

  const { error: perfilErro } = await admin
    .from("profiles")
    .upsert({ id: user.id, name, phone }, { onConflict: "id" });

  // Aqui o erro NÃO é engolido. A lição do email_log: insert que não confere o
  // {error} devolvido pelo supabase-js falha calado, e o cliente vê "salvo"
  // sobre nada.
  if (perfilErro) {
    console.error("[conta] falha ao gravar profile:", perfilErro);
    return res.status(500).json({ error: "Não foi possível salvar. Tente de novo." });
  }

  const meta = user.user_metadata || {};
  const { error: metaErro } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...meta, name, full_name: name, phone }
  });
  if (metaErro) {
    // O profile já gravou; o metadata é a cópia que o login lê. Divergência
    // aqui é o começo do "nome que volta sozinho" — vai pro log alto.
    console.error("[conta] profile gravou mas o metadata do auth NÃO:", metaErro);
    return res.status(500).json({ error: "Salvo pela metade. Recarregue e confira o nome." });
  }

  return res.json({ ok: true, user: { email: user.email, name, phone } });
}

// ── POST ?action=senha ──────────────────────────────────────
async function trocarSenha(req, res, user) {
  const atual = (req.body?.senha_atual || "").toString();
  const nova = (req.body?.senha_nova || "").toString();

  if (!atual || !nova) {
    return res.status(400).json({ error: "Informe a senha atual e a nova" });
  }
  if (nova.length < SENHA_MINIMA) {
    return res.status(400).json({ error: `A nova senha precisa ter ao menos ${SENHA_MINIMA} caracteres` });
  }
  if (nova === atual) {
    return res.status(400).json({ error: "A nova senha é igual à atual" });
  }

  // Freio antes de conferir a senha: é o campo que um invasor usaria pra
  // tentar senha por senha. 10/hora deixa o cliente errar à vontade e não
  // deixa ninguém varrer uma lista.
  if (await limitou(req, res, { nome: "conta-senha", porIpHora: 10 })) return;

  // Confere a senha atual num cliente ANÔNIMO e separado: é uma verificação,
  // não um login — nada da sessão criada aqui é devolvido ao navegador, e o
  // token que o cliente já tem segue valendo.
  const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { error: confereErro } = await anon.auth.signInWithPassword({
    email: user.email,
    password: atual
  });
  if (confereErro) {
    return res.status(400).json({ error: "A senha atual não confere" });
  }

  const { error: trocaErro } = await admin.auth.admin.updateUserById(user.id, { password: nova });
  if (trocaErro) {
    console.error("[conta] falha ao trocar senha:", trocaErro);
    return res.status(400).json({ error: trocaErro.message || "Não foi possível trocar a senha" });
  }

  return res.json({ ok: true });
}

// ── Troca do e-mail de login (27/10/2026) ───────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALIDADE_LINK_MS = 24 * 60 * 60 * 1000;

// Conta que só entra pelo Google não tem senha pra conferir. Sem a senha, a
// trava contra "celular destravado na mão de outro" some — então ela não
// troca por aqui: cria a senha antes ("Esqueci minha senha"), e aí troca.
function temSenha(user) {
  return (user.identities || []).some((i) => i.provider === "email")
    || (user.app_metadata?.providers || []).includes("email");
}

function assinar(corpo) {
  return crypto.createHmac("sha256", process.env.SUPABASE_SERVICE_KEY || "")
    .update("troca-email|" + corpo).digest("base64url");
}

function criarLink(dados) {
  const corpo = Buffer.from(JSON.stringify(dados)).toString("base64url");
  return `https://startouch.com.br/api/conta?action=confirmar-email&t=${corpo}.${assinar(corpo)}`;
}

function lerLink(t) {
  const [corpo, assinatura] = String(t || "").split(".");
  if (!corpo || !assinatura) return null;
  const a = Buffer.from(assinatura), b = Buffer.from(assinar(corpo));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { return JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")); } catch { return null; }
}

async function emailEmUso(email) {
  const { data, error } = await listarTodosUsuarios(admin);
  if (error) throw new Error("não consegui listar as contas: " + error.message);
  return (data?.users || []).some((u) => (u.email || "").toLowerCase() === email);
}

async function pedirTrocaEmail(req, res, user) {
  const novo = (req.body?.email_novo || "").toString().trim().toLowerCase();
  const senha = (req.body?.senha_atual || "").toString();
  if (!EMAIL_RE.test(novo)) return res.status(400).json({ error: "Digite um e-mail válido" });
  if (novo === (user.email || "").toLowerCase()) return res.status(400).json({ error: "Esse já é o seu e-mail" });
  if (!temSenha(user)) {
    return res.status(400).json({ error: "Sua conta entra pelo Google e não tem senha. Crie uma senha em \"Esqueci minha senha\", na tela de entrada, e depois troque o e-mail aqui." });
  }
  if (!senha) return res.status(400).json({ error: "Informe a sua senha atual" });

  // Mesmo freio da troca de senha: o campo de senha é alvo de tentativa e erro.
  if (await limitou(req, res, { nome: "conta-email", porIpHora: 10 })) return;

  const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { error: confereErro } = await anon.auth.signInWithPassword({ email: user.email, password: senha });
  if (confereErro) return res.status(400).json({ error: "A senha atual não confere" });

  if (await emailEmUso(novo)) return res.status(409).json({ error: "Esse e-mail já é usado por outra conta" });

  const link = criarLink({ u: user.id, de: (user.email || "").toLowerCase(), para: novo, exp: Date.now() + VALIDADE_LINK_MS });
  const meta = user.user_metadata || {};
  const tmpl = emailTrocaConfirmarEmail({ userName: meta.name || meta.full_name || "", link, novo });
  const r = await sendTransactionalEmail({
    userId: user.id, emailType: "email_change_confirm", to: novo,
    subject: tmpl.subject, html: tmpl.html, metadata: { para: novo }
  });
  if (!r || r.skipped || r.error) {
    console.error("[conta] confirmação de troca de e-mail NÃO saiu:", r?.reason || r?.error);
    return res.status(500).json({ error: "Não conseguimos enviar o e-mail de confirmação. Tente de novo em instantes." });
  }
  return res.json({ ok: true, enviado_para: novo });
}

async function confirmarEmail(req, res) {
  const d = lerLink(req.query.t);
  if (!d?.u || !d?.para) return paginaResultado(res, "pt", "invalido", 400);
  const { data: u } = await admin.auth.admin.getUserById(d.u);
  const user = u?.user;
  const lang = idiomaValido(user?.user_metadata?.lang) || "pt";
  if (!user) return paginaResultado(res, lang, "invalido", 400);
  const atual = (user.email || "").toLowerCase();
  if (atual === d.para) return paginaResultado(res, lang, "ok", 200);        // clicou duas vezes
  if (atual !== d.de) return paginaResultado(res, lang, "invalido", 400);    // conta mudou depois do pedido
  if (Date.now() > Number(d.exp)) return paginaResultado(res, lang, "expirado", 400);

  const { error } = await admin.auth.admin.updateUserById(user.id, { email: d.para, email_confirm: true });
  if (error) {
    const jaUsado = /already|registered|exists/i.test(error.message || "");
    console.error("[conta] troca de e-mail falhou:", error.message);
    return paginaResultado(res, lang, jaUsado ? "em-uso" : "erro", jaUsado ? 409 : 500);
  }
  console.log("[conta] E-MAIL TROCADO pelo cliente:", { user_id: user.id, de: d.de, para: d.para });

  // Aviso no endereço antigo: aguardado (a Vercel corta promise órfã) e, se
  // falhar, a troca já aconteceu — vai pro log, não pra tela.
  try {
    const meta = user.user_metadata || {};
    const tmpl = emailTrocadoEmail({ userName: meta.name || meta.full_name || "", novo: d.para });
    const r = await sendTransactionalEmail({
      userId: user.id, emailType: "email_changed", to: d.de,
      subject: tmpl.subject, html: tmpl.html, metadata: { de: d.de, para: d.para }
    });
    if (!r || r.skipped || r.error) console.error("[conta] aviso de e-mail trocado NÃO saiu:", r?.reason || r?.error);
  } catch (e) {
    console.error("[conta] aviso de e-mail trocado NÃO saiu:", e?.message || e);
  }
  return paginaResultado(res, lang, "ok", 200);
}

// A página que abre ao clicar no link. Mora aqui (e não no site) porque é
// curta e precisa da língua da CONTA, que só o servidor conhece.
const TEXTOS = {
  pt: { ok: ["E-mail confirmado!", "A partir de agora, entre no painel com o e-mail novo e a mesma senha."],
        expirado: ["Este link venceu", "Ele valia por 24 horas. Peça a troca de novo no painel, em Minha conta."],
        "em-uso": ["Esse e-mail já está em uso", "Outra conta já usa esse endereço. Fale com a gente pelo WhatsApp."],
        invalido: ["Link inválido", "Este link não vale mais. Se ainda quiser trocar o e-mail, peça de novo no painel."],
        erro: ["Algo deu errado", "Não conseguimos trocar o e-mail agora. Tente abrir o link de novo em instantes."],
        botao: "Ir para o painel" },
  en: { ok: ["Email confirmed!", "From now on, sign in to the dashboard with your new email and the same password."],
        expirado: ["This link has expired", "It was valid for 24 hours. Request the change again in the dashboard, under My account."],
        "em-uso": ["That email is already in use", "Another account already uses this address. Contact us on WhatsApp."],
        invalido: ["Invalid link", "This link is no longer valid. If you still want to change your email, request it again in the dashboard."],
        erro: ["Something went wrong", "We couldn't change your email right now. Try opening the link again in a moment."],
        botao: "Go to dashboard" },
  es: { ok: ["¡Correo confirmado!", "A partir de ahora, entra al panel con el correo nuevo y la misma contraseña."],
        expirado: ["Este enlace venció", "Era válido por 24 horas. Vuelve a pedir el cambio en el panel, en Mi cuenta."],
        "em-uso": ["Ese correo ya está en uso", "Otra cuenta ya usa esta dirección. Escríbenos por WhatsApp."],
        invalido: ["Enlace inválido", "Este enlace ya no es válido. Si aún quieres cambiar el correo, pídelo de nuevo en el panel."],
        erro: ["Algo salió mal", "No pudimos cambiar el correo ahora. Intenta abrir el enlace de nuevo en unos instantes."],
        botao: "Ir al panel" },
  zh: { ok: ["邮箱已确认！", "从现在起，请使用新邮箱和原密码登录控制面板。"],
        expirado: ["此链接已过期", "链接有效期为 24 小时。请在控制面板的“我的账户”中重新申请更换。"],
        "em-uso": ["该邮箱已被使用", "另一个账户已在使用此地址。请通过 WhatsApp 联系我们。"],
        invalido: ["链接无效", "此链接已失效。如仍需更换邮箱，请在控制面板中重新申请。"],
        erro: ["出了点问题", "我们暂时无法更换邮箱。请稍后再次打开该链接。"],
        botao: "前往控制面板" }
};

function paginaResultado(res, lang, estado, status) {
  const t = TEXTOS[lang] || TEXTOS.pt;
  const [titulo, texto] = t[estado] || t.erro;
  const cor = estado === "ok" ? "#137333" : "#B91C1C";
  res.status(status).setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.send(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>StarTouch</title></head>
<body style="margin:0;background:#F8F9FA;font-family:Arial,sans-serif;color:#202124;">
<div style="max-width:440px;margin:60px auto;padding:28px 24px;background:#fff;border:1px solid #E0E3E7;border-radius:14px;text-align:center;">
<div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#1A73E8;margin-bottom:14px;">STARTOUCH</div>
<h1 style="font-size:21px;margin:0 0 10px;color:${cor};">${titulo}</h1>
<p style="font-size:15px;line-height:1.6;color:#5F6368;margin:0 0 22px;">${texto}</p>
<a href="https://startouch.com.br/app?login=1" style="display:inline-block;background:#1A73E8;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;">${t.botao}</a>
</div></body></html>`);
}
