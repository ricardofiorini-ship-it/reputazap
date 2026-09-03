// ============================================================
// StarTouch — A CATRACA (POST /api/visitas)
// ============================================================
// Conta um carregamento de página numa tabela de contadores diários
// (`page_hits`). É a única medida de VOLUME do site que não depende de
// consentimento — e por isso é a única que responde "quanta gente entrou".
//
// O GA4 continua existindo e continua atrás do aceite. Ele responde outras
// perguntas (jornada, engajamento, conversão) e responde melhor. O que ele
// não pode mais responder sozinho é "quantos". Ver supabase/schema-visitas.sql.
//
// ── O QUE ESTE ENDPOINT NÃO GRAVA, E É DE PROPÓSITO ─────────
// Não grava IP. Não grava user agent. Não grava cookie, id de navegador,
// nem hora exata. O corpo da requisição carrega só página + origem, e mesmo
// isso vira soma num balde do dia antes de tocar o disco. Se um dia alguém
// precisar acrescentar "só um id pra desduplicar", pare: é exatamente aí que
// a tabela deixa de ser contador e vira dado pessoal.
//
// ── POR QUE O NOME É "visitas" E NÃO "track"/"hit"/"collect" ─
// As listas de bloqueio de anúncio (EasyPrivacy e afins) casam por padrões em
// inglês: /track, /collect, /pixel, /beacon, /analytics. Um endpoint com esse
// nome seria bloqueado justamente no público que a gente mais precisa contar,
// e a catraca nasceria com o mesmo viés do GA4 — só que invisível. O nome em
// português não casa com nenhuma dessas regras. Não é esperteza: é evitar que
// a régua nova venha torta de fábrica.
//
// Best-effort de ponta a ponta: qualquer erro vira 204 silencioso. Medição
// nunca derruba navegação — e uma catraca que quebra a porta é pior que
// nenhuma catraca.
// ============================================================
import { createClient } from "@supabase/supabase-js";

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    // Falha silenciosa é o bug nº1 daqui: se as envs sumirem, a catraca para
    // de contar e o gráfico vira zero — indistinguível de "ninguém entrou".
    // Avisa uma vez por instância, alto.
    if (!getSupabase._avisou) {
      getSupabase._avisou = true;
      console.warn(
        "[visitas] CATRACA DESLIGADA — falta SUPABASE_URL ou SUPABASE_SERVICE_KEY. " +
        "Nenhuma visita está sendo contada e o painel /admin/visitas vai mostrar zero."
      );
    }
    return null;
  }
  return (_supabase = createClient(url, key, { auth: { persistSession: false } }));
}

// Hosts de onde a catraca aceita contagem. Não é segurança forte (dá pra
// forjar), é higiene: impede que uma página de terceiro, de propósito ou por
// acidente, engorde o contador. Não guarda nada de quem chamou.
const ORIGENS = new Set([
  "startouch.com.br",
  "www.startouch.com.br",
  "reputazap.vercel.app",
  "localhost",
]);

function hostDe(valor) {
  if (!valor) return null;
  try { return new URL(valor).hostname.toLowerCase(); } catch { return null; }
}

// Origem confiável quando Origin/Referer batem com a lista. Se os DOIS
// vierem ausentes, aceita: alguns navegadores omitem ambos no sendBeacon, e
// recusar aí cortaria visita legítima — que é o erro caro deste projeto.
function origemOk(req) {
  const o = hostDe(req.headers.origin);
  const r = hostDe(req.headers.referer);
  if (!o && !r) return true;
  return (o ? ORIGENS.has(o) : false) || (r ? ORIGENS.has(r) : false);
}

// Cada campo é normalizado com teto de tamanho e alfabeto fechado. Sem isso,
// um valor forjado de 10 KB viraria uma linha nova na tabela por chamada — a
// cardinalidade é o que pode estragar esta tabela, não o volume.
function limpar(valor, teto, padrao) {
  const s = String(valor == null ? "" : valor)
    .trim().toLowerCase()
    .replace(/[^a-z0-9 ._+\-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, teto);
  return s || padrao;
}

// Caminho da página: sem query (é onde moram os UTMs e qualquer coisa que
// alguém tenha colado na URL), sem hash, sem barra final.
function limparPath(valor) {
  let p = String(valor == null ? "" : valor).split("?")[0].split("#")[0].trim().toLowerCase();
  if (!p.startsWith("/")) return "/outros";
  p = p.replace(/\/+$/, "") || "/";
  if (!/^\/[a-z0-9/_.-]*$/.test(p)) return "/outros";
  return p.slice(0, 120);
}

export default async function handler(req, res) {
  // Sem CORS liberado: a catraca só conta o próprio site.
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  if (!origemOk(req)) return res.status(204).end();

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  const supabase = getSupabase();
  if (!supabase) return res.status(204).end();

  // Dia em São Paulo — senão tudo que acontece depois das 21h cai no dia
  // seguinte e o gráfico fica torto justamente no horário de pico.
  const dia = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    // ⚠️ O supabase-js NÃO lança exceção quando o banco recusa: ele DEVOLVE
    // { error }. Um try/catch sozinho aqui não pegaria nada — a chamada
    // "daria certo", o contador nunca subiria e o painel mostraria zero, que
    // é indistinguível de "ninguém entrou no site". É o modo de falha nº1
    // deste projeto (ver Princípios no CLAUDE.md), e ele morde justamente a
    // régua criada porque o GA4 já falha calado. Por isso o { error } é
    // conferido, e não ignorado.
    const { error } = await supabase.rpc("registrar_visita", {
      p_dia:      dia,
      p_path:     limparPath(body.path),
      p_source:   limpar(body.source,   60, "(direto)"),
      p_medium:   limpar(body.medium,   60, "(nenhum)"),
      p_campaign: limpar(body.campaign, 80, "(nenhuma)"),
    });
    if (error && !handler._avisou) {
      // Uma vez por instância: sem o freio, uma tabela ausente viraria uma
      // linha de log por visita.
      handler._avisou = true;
      const faltando = /function|does not exist|schema cache/i.test(error.message || "");
      console.warn(
        `[visitas] CATRACA NÃO ESTÁ CONTANDO: ${error.message}` +
        (faltando
          ? " — rode supabase/schema-visitas.sql uma vez no SQL Editor do Supabase."
          : "")
      );
    }
  } catch (e) {
    // Rede/timeout: best-effort, a catraca nunca derruba a página.
    if (!handler._avisou) {
      handler._avisou = true;
      console.warn(`[visitas] CATRACA NÃO ESTÁ CONTANDO (exceção): ${e && e.message}`);
    }
  }

  return res.status(204).end();
}
