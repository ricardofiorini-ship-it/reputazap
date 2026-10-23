// ============================================================
// TRYBO — resumo semanal por e-mail (23/10/2026)
// ============================================================
// Par do api/cron/weekly-digest.js da StarTouch. Aquele só olha negócio com
// ficha no Google (place_id), então conta da Trybo — que nasce sem Google
// (trybo-003) — nunca recebeu nada depois das boas-vindas. Este manda, toda
// segunda, os toques da semana nos cartões, por cartão e por rede.
//
// Só lê o banco: nenhuma chamada ao Google, custo zero em Places.
//
// Semana = os 7 dias brasileiros INTEIROS que terminaram ontem (o cron roda
// segunda de manhã, então é segunda a domingo). Mesma régua de dia do painel
// (api/trybo.js, handlePainel), pra o número do e-mail bater com a tela.
//
// TOQUE ≠ SEGUIDOR: ver o comentário em tryboResumoSemanalEmail.
//
// Uso manual (mesmo segredo dos outros crons):
//   ?secret=<CRON_SECRET>&dry=1        ensaio, não envia
//   ?secret=<CRON_SECRET>&to=x@y.com   manda tudo pra um endereço (teste)
//   ?secret=<CRON_SECRET>&limit=3      só os 3 primeiros negócios
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "../_lib/email-sender.js";
import { tryboResumoSemanalEmail, remetenteTrybo } from "../_lib/email-trybo.js";
import { unsubUrl } from "../_lib/unsubscribe.js";
import { LINHA_TRYBO } from "../_lib/linha.js";
import { listarTodosUsuarios } from "../_lib/usuarios.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DIA_MS = 86400000;
const FUSO_BR_MS = 3 * 3600000;   // Brasil sem horário de verão desde 2019

// Aceita também o BROADCAST_SECRET, igual ao broadcast.js: o CRON_SECRET está
// marcado como Sensitive na Vercel (não dá pra ver) e pode ter caractere que
// estraga na URL — o teste pelo navegador nunca bateria (23/10/2026).
function checkAuth(req) {
  const validos = [process.env.BROADCAST_SECRET, process.env.CRON_SECRET]
    .map((v) => (v || "").trim()).filter(Boolean);
  if (!validos.length) return false;
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  return validos.includes(bearer) || validos.includes(String(req.query.secret || "").trim());
}

function janela() {
  const hojeBR = new Date(Date.now() - FUSO_BR_MS).toISOString().slice(0, 10);
  const fim = Date.parse(hojeBR + "T00:00:00Z") + FUSO_BR_MS;   // hoje 00:00 em Brasília
  return {
    semana: new Date(fim - 7 * DIA_MS - FUSO_BR_MS).toISOString().slice(0, 10),   // segunda que abriu a semana
    inicio: new Date(fim - 7 * DIA_MS).toISOString(),
    anterior: new Date(fim - 14 * DIA_MS).toISOString(),
    fim: new Date(fim).toISOString()
  };
}

// O Supabase corta todo select em 1000 linhas, calado. Tudo aqui pagina.
async function todasAsPaginas(montar) {
  const linhas = [];
  for (let de = 0; de < 200000; de += 1000) {
    const { data, error } = await montar().range(de, de + 999);
    if (error) throw new Error(error.message);
    linhas.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return linhas;
}

function emLotes(lista, n = 150) {
  const lotes = [];
  for (let i = 0; i < lista.length; i += n) lotes.push(lista.slice(i, i + n));
  return lotes;
}

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    // Diz o que precisa pra depurar sem revelar segredo nenhum (mesmo
    // diagnóstico do broadcast.js).
    return res.status(401).json({
      error: "Não autorizado: o secret da URL não bate com BROADCAST_SECRET nem com CRON_SECRET da Vercel.",
      broadcast_secret_configurada: !!(process.env.BROADCAST_SECRET || "").trim(),
      caracteres_recebidos_na_url: String(req.query.secret || "").trim().length,
    });
  }

  const dry = req.query.dry === "1";
  const forceTo = String(req.query.to || "").trim() || null;
  const limit = parseInt(req.query.limit, 10);
  const j = janela();
  const t0 = Date.now();
  const s = {
    semana: j.semana, dry, teste: !!forceTo,
    negocios: 0, enviados: 0, pulados_descadastro: 0, pulados_ja_recebeu: 0, pulados_sem_email: 0,
    toques_na_semana: 0, erros: [], destinatarios: []
  };

  try {
    // Os cartões Trybo com dono — inclusive os bloqueados/trocados, porque o
    // toque que eles receberam antes da troca é parte da semana.
    const cartoes = await todasAsPaginas(() => supabase
      .from("plates").select("id, code, status, channel_name, business_id")
      .eq("linha", LINHA_TRYBO).not("business_id", "is", null).order("code", { ascending: true }));

    const porNegocio = new Map();
    for (const c of cartoes) {
      if (!porNegocio.has(c.business_id)) porNegocio.set(c.business_id, []);
      porNegocio.get(c.business_id).push(c);
    }
    // Só quem tem pelo menos um cartão funcionando: o e-mail diz "porque tem
    // cartões Trybo ativos", e tem que ser verdade.
    let negocioIds = [...porNegocio].filter(([, cs]) => cs.some((c) => c.status === "active")).map(([id]) => id);
    if (Number.isFinite(limit) && limit > 0) negocioIds = negocioIds.slice(0, limit);
    s.negocios = negocioIds.length;
    if (!negocioIds.length) return res.json({ ...s, took_ms: Date.now() - t0 });

    const negocios = new Map();
    for (const lote of emLotes(negocioIds)) {
      const { data, error } = await supabase.from("businesses").select("id, user_id, name").in("id", lote);
      if (error) throw new Error("negócios: " + error.message);
      for (const b of data || []) negocios.set(b.id, b);
    }

    const idsCartoes = negocioIds.flatMap((id) => porNegocio.get(id).map((c) => c.id));
    const toquesSemana = new Map(), toquesAntes = new Map(), cliques = new Map();
    for (const lote of emLotes(idsCartoes)) {
      const toques = await todasAsPaginas(() => supabase
        .from("plate_taps").select("plate_id, tapped_at")
        .in("plate_id", lote).eq("is_bot", false)
        .gte("tapped_at", j.anterior).lt("tapped_at", j.fim).order("tapped_at", { ascending: true }));
      for (const t of toques) {
        const alvo = t.tapped_at >= j.inicio ? toquesSemana : toquesAntes;
        alvo.set(t.plate_id, (alvo.get(t.plate_id) || 0) + 1);
      }
      const eventos = await todasAsPaginas(() => supabase
        .from("experience_events").select("plate_id, action")
        .in("plate_id", lote).eq("kind", "click")
        .gte("happened_at", j.inicio).lt("happened_at", j.fim).order("happened_at", { ascending: true }));
      for (const e of eventos) {
        if (!cliques.has(e.plate_id)) cliques.set(e.plate_id, new Map());
        const m = cliques.get(e.plate_id);
        m.set(e.action, (m.get(e.action) || 0) + 1);
      }
    }

    const userIds = [...new Set([...negocios.values()].map((b) => b.user_id).filter(Boolean))];
    const { data: usuarios } = await listarTodosUsuarios(supabase);
    const userById = new Map((usuarios?.users || []).map((u) => [u.id, u]));
    const { data: prefs } = userIds.length
      ? await supabase.from("alert_preferences").select("user_id, email_enabled, email_to").in("user_id", userIds)
      : { data: [] };
    const prefsById = new Map((prefs || []).map((p) => [p.user_id, p]));

    for (const id of negocioIds) {
      const biz = negocios.get(id);
      if (!biz?.user_id) continue;
      try {
        const pref = prefsById.get(biz.user_id);
        if (pref && pref.email_enabled === false) { s.pulados_descadastro++; continue; }
        const user = userById.get(biz.user_id);
        const to = forceTo || (pref?.email_to || "").trim() || user?.email;
        if (!to) { s.pulados_sem_email++; continue; }

        const cs = porNegocio.get(id);
        const lista = cs
          .map((c) => ({ code: c.code, apelido: c.channel_name, toques: toquesSemana.get(c.id) || 0, ativo: c.status === "active" }))
          // Cartão trocado/bloqueado só aparece se teve toque na semana.
          .filter((c) => c.ativo || c.toques > 0)
          .sort((a, b) => b.toques - a.toques);
        const redes = new Map();
        for (const c of cs) for (const [k, n] of cliques.get(c.id) || []) redes.set(k, (redes.get(k) || 0) + n);
        const total = cs.reduce((n, c) => n + (toquesSemana.get(c.id) || 0), 0);
        const antes = cs.reduce((n, c) => n + (toquesAntes.get(c.id) || 0), 0);
        s.toques_na_semana += total;

        const meta = user?.user_metadata || {};
        const tmpl = tryboResumoSemanalEmail({
          nome: meta.name || meta.full_name || "",
          negocio: biz.name,
          toques: total, toquesAntes: antes,
          cartoes: lista,
          redes: [...redes].map(([kind, n]) => ({ kind, cliques: n })).sort((a, b) => b.cliques - a.cliques),
          unsubUrl: unsubUrl(biz.user_id, "trybo")
        });

        if (dry) { s.destinatarios.push({ negocio: biz.name, toques: total, antes }); continue; }

        const r = await sendTransactionalEmail({
          userId: biz.user_id, emailType: "trybo_semanal", to,
          subject: tmpl.subject, html: tmpl.html,
          from: remetenteTrybo() || undefined, lang: "pt",
          headers: { "List-Unsubscribe": `<${unsubUrl(biz.user_id, "trybo")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          // Teste (?to=) não marca a semana como enviada pro cliente.
          ...(forceTo ? {} : { dedupeByMetadata: { key: "semana", value: j.semana } }),
          metadata: { semana: j.semana, business_id: id, toques: total }
        });
        if (r?.skipped && r.reason === "already sent") { s.pulados_ja_recebeu++; continue; }
        if (r?.error || r?.skipped) { s.erros.push({ negocio: biz.name, erro: r.error || r.reason }); continue; }
        s.enviados++;
        s.destinatarios.push({ negocio: biz.name, toques: total });
        await new Promise((ok) => setTimeout(ok, 250));   // freio do Resend
      } catch (e) {
        s.erros.push({ negocio: biz?.name, erro: e?.message || String(e) });
      }
    }
  } catch (e) {
    // Falha na LEITURA não pode parecer "semana sem toque": grita e devolve 500.
    console.error("[trybo-semanal] FALHOU antes de enviar:", e?.message || e);
    return res.status(500).json({ ...s, erro: e?.message || String(e), took_ms: Date.now() - t0 });
  }

  s.took_ms = Date.now() - t0;
  console.log(`[trybo-semanal] semana ${s.semana}: ${s.enviados} enviados de ${s.negocios} negócios, ${s.erros.length} erros${dry ? " (ensaio)" : ""}`);
  if (s.erros.length) console.error("[trybo-semanal] erros:", JSON.stringify(s.erros).slice(0, 2000));
  return res.json(s);
}
