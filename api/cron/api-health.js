// ============================================================
// StarTouch — Cron: monitor de saúde das FUNÇÕES (api/)
// ============================================================
// Irmão do db-health, mas vigia o BACKEND em vez do banco. De hora em
// hora (vercel.json) cutuca os endpoints críticos e confere que cada um
// LIGA. Se algum responder erro de servidor (>=500) ou não responder,
// manda email pro admin na hora.
//
// POR QUÊ: uma função que quebra ao CARREGAR (import de nome inexistente,
// função apagada — como o incidente de 17/jul, que derrubou billing e o
// resumo semanal por 3 dias) responde HTTP 500 (FUNCTION_INVOCATION_FAILED).
// Uma função saudável responde qualquer coisa < 500 (200/400/401/405…),
// porque o código chegou a rodar. Logo a regra é universal:
//   saudável = respondeu com status < 500.  Doente = >=500 ou sem resposta.
// Não precisa saber o status "certo" de cada rota — só se ela LIGA.
//
// Segunda camada: o guard de build (scripts/check-functions.mjs) pega isso
// ANTES de publicar. Este monitor é a rede pós-deploy, pra falhas que só
// aparecem em produção (ex: env var faltando na Vercel).
//
// O alerta sai DIRETO pelo Resend, sem tocar o banco — o alarme não pode
// depender do que ele monitora.
//
// Auth: header x-vercel-cron (cron real) OU ?secret=CRON_SECRET (teste).
// Teste manual: GET /api/cron/api-health?test=1&secret=SEU_CRON_SECRET
// Verificação sob demanda: GET /api/cron/api-health?secret=SEU_CRON_SECRET
// ============================================================

const CRON_SECRET = process.env.CRON_SECRET;
const ALERT_TO = process.env.ADMIN_NOTIFICATIONS_EMAIL || "ricardo.fiorini@gmail.com";
const EMAIL_FROM = process.env.RESEND_FROM || "StarTouch <onboarding@resend.dev>";
const BASE = (process.env.PUBLIC_BASE_URL || "https://startouch.com.br").replace(/\/$/, "");
const PROBE_TIMEOUT_MS = 10000; // sem resposta em 10s = considera fora

// Endpoints críticos (dinheiro/confiança) que importam helpers diferentes —
// se um import compartilhado quebrar, ao menos um destes acusa. GET simples:
// mesmo com método/params "errados", um 4xx já prova que a função LIGOU.
const PROBES = [
  { nome: "Pagamento (billing)",      url: `${BASE}/api/billing?action=debug`, papel: "checkout e webhook do Mercado Pago" },
  { nome: "Resumo semanal (digest)",  url: `${BASE}/api/cron/weekly-digest`,   papel: "email semanal pros clientes" },
  { nome: "IA Radar",                 url: `${BASE}/api/radar`,                papel: "diagnóstico e Pacote Presença em IA" },
  { nome: "Meus negócios (mybiz)",    url: `${BASE}/api/mybiz`,                papel: "dados do painel do cliente" },
  { nome: "Avaliações (reviews)",     url: `${BASE}/api/reviews`,              papel: "notas e reviews do Google" },
  { nome: "Placas (plates)",          url: `${BASE}/api/plates?action=list-stock`, papel: "ativação e estoque de placas" },
];

function checkAuth(req) {
  if (req.headers["x-vercel-cron"] === "1") return true;
  if (CRON_SECRET && (req.headers.authorization || "") === `Bearer ${CRON_SECRET}`) return true;
  if (CRON_SECRET && req.query.secret === CRON_SECRET) return true;
  return false;
}

// Cutuca um endpoint. Saudável = respondeu com status < 500.
async function probe(p) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const r = await fetch(p.url, { method: "GET", signal: ctrl.signal, redirect: "manual" });
    clearTimeout(timer);
    const status = r.status;
    return { ...p, status, ok: status < 500, took_ms: Date.now() - t0 };
  } catch (e) {
    clearTimeout(timer);
    const semResposta = e.name === "AbortError" ? `sem resposta em ${PROBE_TIMEOUT_MS}ms` : (e.message || String(e));
    return { ...p, status: 0, ok: false, err: semResposta, took_ms: Date.now() - t0 };
  }
}

// Envia alerta DIRETO via Resend (independente do backend monitorado).
async function sendAlert(subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[cron/api-health] RESEND_API_KEY ausente — não há como alertar por email");
    return false;
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [ALERT_TO], subject, html })
    });
    if (!r.ok) {
      console.error("[cron/api-health] Resend falhou:", await r.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[cron/api-health] erro ao enviar alerta:", e);
    return false;
  }
}

export default async function handler(req, res) {
  if (!checkAuth(req)) return res.status(401).json({ error: "Não autorizado" });

  // ── Gatilho de teste: força um alerta de exemplo pra validar entrega ──
  if (req.query.test === "1") {
    const ok = await sendAlert(
      "🔔 [StarTouch] Teste do monitor de funções",
      `<div style="font-family:Arial,sans-serif;font-size:14px;color:#202124;line-height:1.6;">
         <p>Este é um <b>teste</b> do monitor de saúde das funções (backend).</p>
         <p>Se você recebeu este email, o alerta funciona — você será avisado aqui caso um endpoint crítico (pagamento, resumo semanal, etc.) saia do ar depois de um deploy.</p>
         <p style="color:#9AA0A6;font-size:12px;">StarTouch · Monitor automático.</p>
       </div>`
    );
    return res.status(ok ? 200 : 500).json({ test: true, alert_sent: ok });
  }

  // ── Verificação real: cutuca todos os endpoints em paralelo ──
  const results = await Promise.all(PROBES.map(probe));
  const down = results.filter((r) => !r.ok);
  const resumo = results.map((r) => ({
    nome: r.nome, status: r.status, ok: r.ok, took_ms: r.took_ms, ...(r.err ? { err: r.err } : {})
  }));

  if (down.length === 0) {
    return res.status(200).json({ ok: true, checked: results.length, results: resumo });
  }

  // Um ou mais endpoints fora → alerta
  const when = new Date().toISOString();
  const linhas = down.map((r) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f1c9c5;"><b>${r.nome}</b><br><span style="color:#5F6368;font-size:12px;">${r.papel}</span></td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1c9c5;text-align:right;white-space:nowrap;color:#C5221F;font-weight:700;">${r.status === 0 ? (r.err || "sem resposta") : "HTTP " + r.status}</td>
    </tr>`).join("");

  const alerted = await sendAlert(
    `🚨 [StarTouch] ${down.length} função(ões) fora do ar`,
    `<div style="font-family:Arial,sans-serif;font-size:14px;color:#202124;line-height:1.6;">
       <h2 style="color:#C5221F;margin:0 0 12px;">🚨 Endpoint(s) do backend não estão respondendo</h2>
       <p>O monitor cutucou as funções críticas e ${down.length === 1 ? "uma" : down.length} respondeu(ram) erro de servidor (ou nada). Isso costuma significar que o <b>último deploy quebrou</b> — uma função não está nem ligando.</p>
       <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FCE8E6;border-radius:8px;margin:12px 0;border-collapse:collapse;">
         ${linhas}
       </table>
       <p style="color:#5F6368;font-size:12px;">Verificado em ${when}.</p>
       <p><b>O que isso significa na prática:</b> se for o pagamento, clientes não conseguem comprar e vendas aprovadas podem não virar Pro. Se for o painel/avaliações, o cliente vê erro ao abrir o app.</p>
       <p><b>O que fazer:</b></p>
       <ol>
         <li>Abra os deploys na Vercel: <a href="https://vercel.com/dashboard">vercel.com/dashboard</a> → projeto → Deployments.</li>
         <li>Se o último deploy foi recente, o mais rápido é <b>Rollback</b> pro deploy anterior (que estava verde) enquanto investiga.</li>
         <li>Veja os <b>Logs</b> da função apontada acima — o erro costuma dizer o nome que faltou (ex: "does not provide an export named X").</li>
       </ol>
       <p style="color:#9AA0A6;font-size:12px;margin-top:16px;">Você receberá este alerta a cada verificação (de hora em hora) enquanto persistir. StarTouch · Monitor automático.</p>
     </div>`
  );

  return res.status(503).json({ ok: false, down: down.length, results: resumo, alerted });
}
