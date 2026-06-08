// ============================================================
// StarTouch — Cron: monitor de saúde do banco (Supabase)
// ============================================================
// Schedule: de hora em hora (vercel.json). Faz DUAS coisas:
//   1. VIGIA — toca o banco com uma query mínima e, se ele não
//      responder (fora do ar / pausado / timeout), manda email pro
//      admin na hora.
//   2. MANTÉM ACORDADO — no plano free, o Supabase pausa o projeto
//      após 7 dias SEM acesso. Esse cutucão de hora em hora conta como
//      acesso, então o banco nunca fica ocioso tempo suficiente pra
//      dormir. Ou seja: o monitor também evita a pausa de graça.
//
// IMPORTANTE: o alerta sai DIRETO pelo Resend, sem passar pelo
// email-sender (que grava no Supabase). Se o banco está fora, um
// alarme que depende do banco não tocaria. O caminho do alerta é
// 100% independente do que ele monitora.
//
// Auth: header x-vercel-cron (cron real) OU ?secret=CRON_SECRET (teste).
// Teste manual: GET /api/cron/db-health?test=1&secret=SEU_CRON_SECRET
// ============================================================
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CRON_SECRET = process.env.CRON_SECRET;
const ALERT_TO = process.env.ADMIN_NOTIFICATIONS_EMAIL || "ricardo.fiorini@gmail.com";
const EMAIL_FROM = process.env.RESEND_FROM || "StarTouch <onboarding@resend.dev>";
const PING_TIMEOUT_MS = 8000; // se o banco não responder em 8s, considera fora

function checkAuth(req) {
  if (req.headers["x-vercel-cron"] === "1") return true;
  if (CRON_SECRET && (req.headers.authorization || "") === `Bearer ${CRON_SECRET}`) return true;
  if (CRON_SECRET && req.query.secret === CRON_SECRET) return true;
  return false;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout após ${ms}ms`)), ms))
  ]);
}

// Envia alerta DIRETO via Resend (sem tocar o banco — ver cabeçalho).
async function sendAlert(subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[cron/db-health] RESEND_API_KEY ausente — não há como alertar por email");
    return false;
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [ALERT_TO], subject, html })
    });
    if (!r.ok) {
      console.error("[cron/db-health] Resend falhou:", await r.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[cron/db-health] erro ao enviar alerta:", e);
    return false;
  }
}

export default async function handler(req, res) {
  if (!checkAuth(req)) return res.status(401).json({ error: "Não autorizado" });

  // ── Gatilho de teste: força um alerta de exemplo pra validar entrega ──
  if (req.query.test === "1") {
    const ok = await sendAlert(
      "🔔 [StarTouch] Teste do monitor de banco",
      `<div style="font-family:Arial,sans-serif;font-size:14px;color:#202124;line-height:1.6;">
         <p>Este é um <b>teste</b> do monitor de saúde do banco.</p>
         <p>Se você recebeu este email, o sistema de alerta está funcionando — você será avisado aqui caso o banco saia do ar.</p>
         <p style="color:#9AA0A6;font-size:12px;">StarTouch · Monitor automático.</p>
       </div>`
    );
    return res.status(ok ? 200 : 500).json({ test: true, alert_sent: ok });
  }

  // ── Verificação real: toca o banco com uma query mínima ──
  const t0 = Date.now();
  let ok = false, errMsg = null;
  try {
    const { error } = await withTimeout(
      supabase.from("businesses").select("id").limit(1),
      PING_TIMEOUT_MS
    );
    if (error) errMsg = error.message;
    else ok = true;
  } catch (e) {
    errMsg = e.message;
  }
  const tookMs = Date.now() - t0;

  if (ok) {
    return res.status(200).json({ ok: true, took_ms: tookMs });
  }

  // Banco não respondeu → dispara alerta
  const when = new Date().toISOString();
  const alerted = await sendAlert(
    "🚨 [StarTouch] Banco de dados NÃO está respondendo",
    `<div style="font-family:Arial,sans-serif;font-size:14px;color:#202124;line-height:1.6;">
       <h2 style="color:#C5221F;margin:0 0 12px;">🚨 O banco (Supabase) não respondeu</h2>
       <p>O monitor automático tentou tocar o banco e não conseguiu.</p>
       <p style="background:#FCE8E6;padding:12px 14px;border-radius:8px;">
         <b>Erro:</b> ${errMsg || "sem detalhe"}<br>
         <b>Demorou:</b> ${tookMs}ms<br>
         <b>Quando:</b> ${when}
       </p>
       <p><b>O que isso significa na prática:</b> clientes que encostarem o celular na placa agora podem ver "tente de novo num instante". Cadastro e ativação de placa também podem falhar enquanto durar.</p>
       <p><b>O que fazer:</b></p>
       <ol>
         <li>Abra o painel: <a href="https://supabase.com/dashboard">supabase.com/dashboard</a></li>
         <li>Se o projeto estiver <b>pausado (Paused)</b>, clique em <b>Restore</b> pra religar.</li>
         <li>Se estiver fora por outro motivo, confira <a href="https://status.supabase.com">status.supabase.com</a>.</li>
       </ol>
       <p style="color:#9AA0A6;font-size:12px;margin-top:16px;">Você receberá este alerta a cada verificação (de hora em hora) enquanto o problema persistir. StarTouch · Monitor automático.</p>
     </div>`
  );

  return res.status(503).json({ ok: false, error: errMsg, took_ms: tookMs, alerted });
}
