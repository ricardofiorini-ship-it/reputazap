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
import { createClient } from "@supabase/supabase-js";
import { limitou } from "./_lib/rate-limit.js";

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
