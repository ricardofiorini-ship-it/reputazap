// ============================================================
// StarTouch — Resultados (GET /api/results)
// ============================================================
// A camada de cruzamento: o que aconteceu DEPOIS do toque.
//
// A RÉGUA VALE INTEIRA AQUI (29/08/2026): a contagem de toques continua
// gratuita em Dispositivos, com histórico, último toque e períodos. Nada foi
// movido pra cá. O total de toques aparece nesta resposta como DENOMINADOR —
// o número de baixo da conta, sem o qual o cruzamento não faz sentido. O que
// se paga é o cruzamento, nunca o número que o cliente já tinha.
//
// A LEITURA UNIFICA OS DOIS MUNDOS. Todo toque tem um desfecho, e só existem
// dois: ou a pessoa foi direto ao Google (dispositivo em Google Direto), ou
// ela abriu um menu e escolheu alguma coisa. Assim o dispositivo que não usa
// menu não fica de fora do relatório, e a diferença entre os dois caminhos
// aparece MEDIDA.
//
// Fechado no administrador enquanto o Pro não está à venda — mesma trava e
// mesmo motivo do api/experiences.js.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const ADMIN_EMAILS = new Set(["ricardo.fiorini@gmail.com"]);
const podeUsar = (user) => ADMIN_EMAILS.has((user?.email || "").toLowerCase().trim());

const JANELAS = [7, 30, 90];
const TETO_LINHAS = 20000;

// O dia do cliente é o dia do Brasil, não o UTC do servidor: um toque às 21h
// de SP é 00h UTC do dia seguinte e cairia no dia errado do gráfico. (Mesma
// conta do plates.js — se um dia virar três cópias, extrair pra um helper.)
const BR_OFFSET_MS = 3 * 60 * 60 * 1000;
const DIA_MS = 86400000;
const diaBr = (iso) => new Date(new Date(iso).getTime() - BR_OFFSET_MS).toISOString().slice(0, 10);
const inicioDoDia = (dia) => new Date(new Date(`${dia}T00:00:00.000Z`).getTime() + BR_OFFSET_MS).toISOString();
const somaDias = (dia, n) => new Date(new Date(`${dia}T00:00:00.000Z`).getTime() + n * DIA_MS).toISOString().slice(0, 10);

async function autenticar(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return { erro: "Token obrigatório", status: 401 };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { erro: "Token inválido", status: 401 };
  return { user: data.user };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ error: auth.erro });
    if (!podeUsar(auth.user)) {
      console.warn(`[results] acesso negado para ${auth.user?.email || "?"}`);
      return res.status(404).json({ error: "Not found" });
    }

    const { data: biz, error: bizErr } = await supabase
      .from("businesses").select("id, name").eq("user_id", auth.user.id).maybeSingle();
    if (bizErr) return res.status(500).json({ error: bizErr.message });
    if (!biz) return res.status(404).json({ error: "Nenhum negócio cadastrado nesta conta." });

    const pedido = parseInt(req.query.days, 10);
    const dias = JANELAS.includes(pedido) ? pedido : 30;
    const hoje = diaBr(new Date().toISOString());
    const de = somaDias(hoje, -(dias - 1));
    const ate = hoje;
    const deIso = inicioDoDia(de);
    const ateIso = inicioDoDia(somaDias(ate, 1));      // exclusivo: pega o dia final inteiro
    const antDe = somaDias(de, -dias);
    const antAte = de;

    // ── Toques (o denominador; o dado gratuito) ──
    // Tabela pode não existir em ambiente novo: isso é "não sabemos", não
    // "ninguém tocou", e a tela precisa da diferença.
    let toques = [], toquesOk = true;
    {
      const { data, error } = await supabase
        .from("plate_taps").select("plate_id, tapped_at")
        .eq("business_id", biz.id).gte("tapped_at", deIso).lt("tapped_at", ateIso)
        .limit(TETO_LINHAS);
      if (error) { toquesOk = false; console.error("[results] plate_taps indisponível:", error.message); }
      else toques = data || [];
    }

    // ── Eventos do menu (o que se paga) ──
    let eventos = [], eventosOk = true;
    {
      const { data, error } = await supabase
        .from("experience_events")
        .select("experience_id, plate_id, kind, button_id, action, happened_at, medium")
        .eq("business_id", biz.id).gte("happened_at", deIso).lt("happened_at", ateIso)
        .limit(TETO_LINHAS);
      if (error) { eventosOk = false; console.error("[results] experience_events indisponível:", error.message); }
      else eventos = data || [];
    }

    // ── Período anterior, só pra comparar ──
    // Só compara se o período anterior estiver inteiro depois do início do log:
    // comparar com uma época sem registro daria "caiu 100%", que é mentira.
    let toquesAnt = null, aberturasAnt = null;
    {
      const { data: primeiro } = await supabase
        .from("plate_taps").select("tapped_at").eq("business_id", biz.id)
        .order("tapped_at", { ascending: true }).limit(1).maybeSingle();
      const comecoLog = primeiro?.tapped_at ? diaBr(primeiro.tapped_at) : null;
      if (comecoLog && antDe >= comecoLog) {
        const { count } = await supabase.from("plate_taps")
          .select("id", { count: "exact", head: true })
          .eq("business_id", biz.id).gte("tapped_at", inicioDoDia(antDe)).lt("tapped_at", inicioDoDia(antAte));
        toquesAnt = count || 0;
        const { count: c2 } = await supabase.from("experience_events")
          .select("id", { count: "exact", head: true })
          .eq("business_id", biz.id).eq("kind", "open")
          .gte("happened_at", inicioDoDia(antDe)).lt("happened_at", inicioDoDia(antAte));
        aberturasAnt = c2 || 0;
      }
    }

    // ── Nomes: dispositivo, experiência e rótulo do botão ──
    // O log guarda `button_id` (identidade estável) e não o rótulo, de
    // propósito: renomear um botão não pode reescrever o histórico dele. O
    // rótulo ATUAL é resolvido aqui, na hora de mostrar.
    const [{ data: plates }, { data: exps }] = await Promise.all([
      supabase.from("plates").select("id, code, channel_name, product_type, served_mode").eq("business_id", biz.id),
      supabase.from("experiences").select("id, name, published").eq("business_id", biz.id)
    ]);
    const nomeDoDispositivo = new Map((plates || []).map((p) => [p.id, p.channel_name || p.code]));
    const nomeDaExperiencia = new Map((exps || []).map((e) => [e.id, e.name]));
    const rotuloDoBotao = new Map();
    for (const e of exps || []) {
      for (const b of e.published?.buttons || []) rotuloDoBotao.set(b.id, b.label);
    }

    // ── Agregação ──
    const aberturas = eventos.filter((e) => e.kind === "open");
    const cliques = eventos.filter((e) => e.kind === "click");
    const aberturasDeDispositivo = aberturas.filter((e) => e.plate_id).length;
    const aberturasDeLink = aberturas.length - aberturasDeDispositivo;

    // "Foi direto ao Google" = toque que NÃO abriu menu. Verdade por
    // construção, e é o que coloca o dispositivo em Google Direto dentro do
    // relatório em vez de deixá-lo de fora.
    const diretoAoGoogle = Math.max(0, toques.length - aberturasDeDispositivo);

    const conta = (lista, chave) => {
      const m = {};
      for (const x of lista) { const k = chave(x); if (k != null) m[k] = (m[k] || 0) + 1; }
      return m;
    };

    const porAcao = conta(cliques, (c) => c.action || "outro");
    const porBotao = Object.entries(conta(cliques, (c) => c.button_id))
      .map(([id, n]) => ({
        button_id: id,
        label: rotuloDoBotao.get(id) || null,
        action: cliques.find((c) => c.button_id === id)?.action || null,
        cliques: n
      }))
      .sort((a, b) => b.cliques - a.cliques);

    const abrePorExp = conta(aberturas, (a) => a.experience_id);
    const clicaPorExp = conta(cliques, (c) => c.experience_id);
    const porExperiencia = [...new Set([...Object.keys(abrePorExp), ...Object.keys(clicaPorExp)])]
      .map((id) => ({
        experience_id: id,
        name: nomeDaExperiencia.get(id) || "Menu removido",
        aberturas: abrePorExp[id] || 0,
        cliques: clicaPorExp[id] || 0
      }))
      .sort((a, b) => b.aberturas - a.aberturas);

    const toquesPorPlaca = conta(toques, (t) => t.plate_id);
    const abrePorPlaca = conta(aberturas.filter((a) => a.plate_id), (a) => a.plate_id);
    const clicaPorPlaca = conta(cliques.filter((c) => c.plate_id), (c) => c.plate_id);
    const porDispositivo = (plates || [])
      .map((p) => ({
        plate_id: p.id,
        nome: nomeDoDispositivo.get(p.id),
        product_type: p.product_type,
        servindo: p.served_mode === "menu" ? "menu" : "google",
        // `toques` viaja como CONTEXTO — o detalhe dele (por dia, por meio,
        // histórico) mora em Dispositivos e é gratuito. Aqui ele só serve de
        // base pra comparação com aberturas e escolhas.
        toques: toquesPorPlaca[p.id] || 0,
        aberturas: abrePorPlaca[p.id] || 0,
        cliques: clicaPorPlaca[p.id] || 0
      }))
      .filter((d) => d.toques > 0 || d.aberturas > 0)
      .sort((a, b) => b.toques - a.toques);

    // Série diária com TODOS os dias, inclusive os zerados — senão o gráfico
    // encosta os dias movimentados um no outro e some com o buraco.
    const porDia = [];
    const toquesPorDia = conta(toques, (t) => diaBr(t.tapped_at));
    const aberturasPorDia = conta(aberturas, (a) => diaBr(a.happened_at));
    const cliquesPorDia = conta(cliques, (c) => diaBr(c.happened_at));
    for (let i = 0; i < dias; i++) {
      const d = somaDias(de, i);
      porDia.push({ dia: d, toques: toquesPorDia[d] || 0, aberturas: aberturasPorDia[d] || 0, cliques: cliquesPorDia[d] || 0 });
    }

    return res.json({
      ok: true,
      dias, de, ate,
      disponivel: { toques: toquesOk, eventos: eventosOk },
      toques: {
        total: toques.length,
        anterior: toquesAnt,
        direto_ao_google: diretoAoGoogle
      },
      menu: {
        aberturas: aberturas.length,
        aberturas_anterior: aberturasAnt,
        aberturas_de_dispositivo: aberturasDeDispositivo,
        aberturas_de_link: aberturasDeLink,
        cliques: cliques.length,
        por_acao: porAcao,
        por_botao: porBotao,
        por_experiencia: porExperiencia
      },
      por_dispositivo: porDispositivo,
      por_dia: porDia,
      cortado: toques.length >= TETO_LINHAS || eventos.length >= TETO_LINHAS
    });
  } catch (err) {
    console.error("[results] erro:", err);
    if (!res.headersSent) return res.status(500).json({ error: err?.message || "Erro interno" });
  }
}
