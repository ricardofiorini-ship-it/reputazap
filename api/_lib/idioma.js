// ============================================================
// idioma.js — em que língua cada cliente quer receber e-mail (09/10/2026)
// ============================================================
// O site e o painel têm versão EN/ES/中文 (public/i18n.js), mas a escolha
// mora no navegador. E-mail sai do servidor: pra ele saber a língua, a
// escolha precisa estar NA CONTA. Mora em `auth.user_metadata.lang` — não
// numa coluna nova, de propósito: coluna exigiria rodar SQL antes do deploy,
// que é o passo esquecido clássico deste projeto. Sem `lang` = português.
//
// Caminhos que gravam:
//   - cadastro (register / login Google): o navegador manda o cabeçalho
//     `X-St-Lang` (o i18n.js põe sozinho em toda chamada /api/ quando a
//     língua não é português) — o boas-vindas já sai na língua certa;
//   - troca de língua com a conta aberta: POST /api/conta?action=idioma.
//
// LGPD: preferência da conta, coberta pela Política (§ tabela de
// operadores: Supabase — "Cadastro, pedidos, preferências").
// ============================================================
import { createClient } from "@supabase/supabase-js";

export const IDIOMAS = ["pt", "en", "es", "zh"];

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export function idiomaValido(x) {
  const v = String(x || "").toLowerCase().slice(0, 2);
  return IDIOMAS.includes(v) ? v : null;
}

/** Língua que o navegador declarou nesta chamada (null = não declarou). */
export function idiomaDoPedido(req) {
  return idiomaValido(req?.headers?.["x-st-lang"]);
}

/** Grava a língua na conta, sem apagar o resto do user_metadata. */
export async function gravarIdioma(userId, lang) {
  const v = idiomaValido(lang);
  if (!userId || !v) return false;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) { console.warn("[idioma] conta não encontrada:", error?.message); return false; }
  const meta = data.user.user_metadata || {};
  if (meta.lang === v) return true;
  const { error: e2 } = await admin.auth.admin.updateUserById(userId, { user_metadata: { ...meta, lang: v } });
  if (e2) { console.warn("[idioma] gravação falhou:", e2.message); return false; }
  cache.delete(userId);
  return true;
}

// Cache por instância: o resumo semanal manda ~100 e-mails seguidos e não
// pode fazer 100 consultas. A primeira consulta lista as contas de uma vez.
const cache = new Map();
let carregadoEm = 0;
let avisouFalha = false;
const VALIDADE_MS = 5 * 60 * 1000;

async function carregarTodos() {
  const novo = new Map();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users || [];
    for (const u of users) novo.set(u.id, idiomaValido(u.user_metadata?.lang) || "pt");
    if (users.length < 1000) break;
  }
  cache.clear();
  for (const [k, v] of novo) cache.set(k, v);
  carregadoEm = Date.now();
}

/**
 * Língua da conta. Falha de leitura NÃO derruba o e-mail: sai em português —
 * mas grita no log (uma vez por instância), porque silêncio aqui pareceria
 * "ninguém escolheu outra língua".
 */
export async function idiomaDoUsuario(userId) {
  if (!userId) return "pt";
  try {
    if (Date.now() - carregadoEm > VALIDADE_MS) await carregarTodos();
    if (cache.has(userId)) return cache.get(userId);
    // Conta nova depois da última carga: consulta só ela.
    const { data } = await admin.auth.admin.getUserById(userId);
    const v = idiomaValido(data?.user?.user_metadata?.lang) || "pt";
    cache.set(userId, v);
    return v;
  } catch (e) {
    if (!avisouFalha) { avisouFalha = true; console.warn("[idioma] LEITURA DESLIGADA — e-mails saem em português:", e?.message); }
    return "pt";
  }
}
