// ============================================================
// StarTouch — Cron: expurgo da política de retenção (LGPD)
// ============================================================
// Schedule: diário, 04:00 UTC (vercel.json).
//
// A Política de Privacidade (§9) declara prazos. Prazo declarado sem rotina que
// o cumpra é promessa que nenhum log comprova — e é o LOG que vale como prova,
// não a intenção. Por isso cada execução grava uma linha por tabela em
// `retention_runs`, INCLUSIVE quando apaga zero: execução sem linha nenhuma é
// indistinguível de cron que não rodou.
//
// `retention_runs` NÃO está na lista de alvos, de propósito. Log que vive onde a
// rotina alcança se come (ver CLAUDE.md, seção Princípios).
//
// Auth: header x-vercel-cron (cron real) OU ?secret=CRON_SECRET (teste).
// Teste manual: GET /api/cron/retention?dry=1&secret=SEU_CRON_SECRET
// ============================================================
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CRON_SECRET = process.env.CRON_SECRET;

// Os 5 prazos da Política §9. A coluna de data muda por tabela — conferida uma
// a uma contra o schema; errar a coluna aqui apagaria a tabela inteira ou nada.
const ALVOS = [
  { tabela: "places_cache", coluna: "created_at",   prazo: "30 days",   schema: "supabase/schema-places-cache.sql" },
  { tabela: "rate_limits",  coluna: "window_start", prazo: "30 days",   schema: "supabase/schema-rate-limit.sql" },
  { tabela: "funnel_events",coluna: "created_at",   prazo: "12 months", schema: "supabase/schema-funnel.sql" },
  { tabela: "email_log",    coluna: "sent_at",      prazo: "12 months", schema: "supabase/003_email_log.sql" },
  // A Política diz "24 meses a partir do cadastro" porque radar_leads não tem
  // coluna de último contato. O texto foi ajustado ao dado, não o contrário.
  { tabela: "radar_leads",  coluna: "created_at",   prazo: "24 months", schema: "supabase/schema-radar.sql" }
];

function checkAuth(req) {
  if (req.headers["x-vercel-cron"] === "1") return true;
  if (CRON_SECRET && (req.headers.authorization || "") === `Bearer ${CRON_SECRET}`) return true;
  if (CRON_SECRET && req.query.secret === CRON_SECRET) return true;
  return false;
}

// Converte '30 days' / '12 months' em um corte ISO. Feito em JS e não no
// Postgres porque o supabase-js não aceita expressão SQL no .lt().
function corte(prazo) {
  const [n, unidade] = prazo.split(" ");
  const d = new Date();
  if (unidade.startsWith("day")) d.setUTCDate(d.getUTCDate() - Number(n));
  else if (unidade.startsWith("month")) d.setUTCMonth(d.getUTCMonth() - Number(n));
  else throw new Error(`unidade de prazo desconhecida: ${prazo}`);
  return d.toISOString();
}

// Grava a linha de prova. Se ISTO falhar, o expurgo aconteceu e não há registro
// — que é o pior cenário possível aqui. Por isso o erro é gritado, não engolido.
async function registrar(linha) {
  const { error } = await supabase.from("retention_runs").insert(linha);
  if (error) {
    console.error(
      `[cron/retention] FALHA AO GRAVAR A PROVA (${linha.tabela}): ${error.message}. ` +
      `Se a tabela retention_runs não existe, rode supabase/script-unico-2026-08-22.sql — ` +
      `sem ela o expurgo roda SEM deixar prova de cumprimento.`
    );
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!checkAuth(req)) return res.status(404).end();

  const dry = req.query.dry === "1";
  const t0 = Date.now();
  const resultado = [];
  let provaOk = true;

  for (const alvo of ALVOS) {
    const ini = Date.now();
    const limite = corte(alvo.prazo);
    let linhas = 0;
    let erro = null;

    try {
      if (dry) {
        // Ensaio: conta sem apagar.
        const { count, error } = await supabase
          .from(alvo.tabela)
          .select("*", { count: "exact", head: true })
          .lt(alvo.coluna, limite);
        if (error) throw new Error(error.message);
        linhas = count || 0;
      } else {
        const { data, error } = await supabase
          .from(alvo.tabela)
          .delete()
          .lt(alvo.coluna, limite)
          .select("*", { count: "exact", head: true });
        // O supabase-js devolve {error} em vez de lançar — sem este check a
        // falha seria muda e a tabela pareceria "limpa" sem nunca ter sido
        // tocada. É o bug nº1 deste projeto; não repetir.
        if (error) throw new Error(error.message);
        linhas = Array.isArray(data) ? data.length : (data?.length ?? 0);
      }
    } catch (e) {
      // Falha isolada: uma tabela quebrada não pode abortar as outras quatro.
      erro = e?.message || String(e);
      const faltando = /relation|does not exist|schema cache/i.test(erro);
      console.error(
        `[cron/retention] ${alvo.tabela}: ${erro}` +
        (faltando ? ` — EXPURGO DESLIGADO nesta tabela. Rode ${alvo.schema}.` : "")
      );
    }

    const duracao = Date.now() - ini;
    resultado.push({ tabela: alvo.tabela, prazo: alvo.prazo, linhas, erro, duracao_ms: duracao });

    // Ensaio não grava prova — ele não apagou nada.
    if (!dry) {
      const ok = await registrar({
        tabela: alvo.tabela, prazo: alvo.prazo, linhas, erro, duracao_ms: duracao
      });
      if (!ok) provaOk = false;
    }
  }

  const total = resultado.reduce((s, r) => s + r.linhas, 0);
  const comErro = resultado.filter((r) => r.erro).length;
  console.log(
    `[cron/retention] ${dry ? "ENSAIO" : "expurgo"}: ${total} linha(s), ` +
    `${comErro} tabela(s) com erro, ${Date.now() - t0}ms`
  );

  return res.json({
    ok: comErro === 0 && provaOk,
    dry,
    prova_gravada: dry ? null : provaOk,
    total_linhas: total,
    tabelas: resultado,
    took_ms: Date.now() - t0
  });
}
