// ============================================================
// /api/admin — endpoint protegido para o admin (Ricardo) ver
// dados agregados dos clientes
//
// Auth: JWT do Supabase. Email do user precisa estar na lista
// ADMIN_EMAILS abaixo. Hoje só ricardo.fiorini@gmail.com.
//
// Ações:
//   ?action=stats         GET — números gerais (total clientes,
//                         placas ativas, ativações últimas 7 dias)
//   ?action=list-clients  GET — lista de clientes com dados
//                         agregados (nome, email, whats, plano,
//                         placas ativas, criado_em, ultimo_login)
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "./_lib/fetch-timeout.js";
import { suggestTerms, fetchPlaceSeed } from "./_lib/competitors.js";
import { fetchGridRankingCached } from "./_lib/ranking-grid-cache.js";
import { validaTransicao, camposDaTransicao, destinosPossiveis, pulaEnvio, ROTULO }
  from "./_lib/pedido-estados.js";
import { dadosDoCliente, enderecoCompleto, textoDaEtiqueta }
  from "./_lib/pedido-cliente.js";
import { sendTransactionalEmail } from "./_lib/email-sender.js";
import { pedidoAtualizadoEmail } from "./_lib/email-templates.js";

// Lista de emails autorizados como admin (hardcoded)
const ADMIN_EMAILS = new Set([
  "ricardo.fiorini@gmail.com"
]);

// Service key — só backend, NUNCA expor
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Cliente Supabase só pra validar JWT do admin
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Valida JWT do header Authorization. Retorna user se for admin,
 * ou null se não for autorizado.
 */
async function requireAdmin(req, res) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Token ausente" });
    return null;
  }
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: "Token inválido" });
    return null;
  }
  const email = (data.user.email || "").toLowerCase();
  if (!ADMIN_EMAILS.has(email)) {
    res.status(403).json({ error: "Acesso negado — só admins" });
    return null;
  }
  return data.user;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const action = req.query.action;

  try {
    if (action === "stats")        return await handleStats(req, res);
    if (action === "list-clients") return await handleListClients(req, res);
    if (action === "delete-user")  return await handleDeleteUser(req, res, admin);
    if (action === "prospects")    return await handleProspects(req, res);
    if (action === "funnel")       return await handleFunnel(req, res);
    if (action === "visitas")      return await handleVisitas(req, res);
    if (action === "grid-suggest") return await handleGridSuggest(req, res);
    if (action === "grid")         return await handleGrid(req, res);
    if (action === "pedidos")      return await handlePedidos(req, res);
    if (action === "pedido-status") return await handlePedidoStatus(req, res, admin);
    return res.status(400).json({ error: "Ação desconhecida. Use ?action=stats, list-clients, delete-user, prospects, funnel, visitas, grid-suggest, grid, pedidos ou pedido-status" });
  } catch (err) {
    console.error("[admin] erro:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ── FUNNEL: funil do convidado (pessoas por passo + queda) ───
// Conta pessoas DISTINTAS (anon_id) que atingiram cada passo na janela de dias.
// signup_complete pode vir sem anon_id (logado no server) → conta por evento.
async function handleFunnel(req, res) {
  // PERÍODO LIVRE (?de=AAAA-MM-DD&ate=AAAA-MM-DD) ou atalho por dias.
  // `ate` vai até o FIM do dia escolhido: quem digita "até 09/09" espera o dia
  // 9 inteiro, não a meia-noite dele — cortar às 00:00 esconderia um dia
  // inteiro de dados sem avisar ninguém.
  const dia = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? v : null;
  const de = dia(req.query.de);
  const ate = dia(req.query.ate);

  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  // FUSO DE BRASÍLIA, e não UTC. A data que a pessoa digita é a data do
  // relógio dela: "09/09" lido como UTC começaria às 21h do dia 8 em Brasília
  // e a contagem de um dia carregaria três horas do anterior. Num botão
  // "Hoje" isso apareceria de cara — e num relatório de mês passaria batido.
  // O Brasil não tem mais horário de verão desde 2019, então -03:00 é fixo.
  const BR = "-03:00";
  const since = de
    ? new Date(de + "T00:00:00.000" + BR).toISOString()
    : new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const until = ate ? new Date(ate + "T23:59:59.999" + BR).toISOString() : null;

  let q = supabase
    .from("funnel_events")
    .select("anon_id, step, meta, created_at")
    .gte("created_at", since);
  if (until) q = q.lte("created_at", until);
  const { data, error } = await q.limit(100000);
  if (error) return res.status(500).json({ error: error.message });

  // Passos na ordem do funil + rótulo amigável.
  const STEPS = [
    { key: "guest_search_view",   label: "Abriu a busca" },
    { key: "guest_search_submit", label: "Buscou um negócio" },
    { key: "guest_panel_view",    label: "Viu o painel" },
    { key: "guest_signup_click",  label: "Clicou em criar conta" },
    // `desde` = dia em que o passo passou a EXISTIR. A tela avisa quando o
    // período consultado começa antes disso, senão um passo zerado por não ter
    // sido medido é lido como gente que sumiu — que é o oposto do que houve.
    { key: "signup_form_view",    label: "Abriu a tela de cadastro", desde: "2026-09-10" },
    { key: "signup_complete",     label: "Concluiu o cadastro" },
  ];
  const sets = {}; STEPS.forEach(s => { sets[s.key] = new Set(); });
  let i = 0;
  for (const r of (data || [])) {
    if (!sets[r.step]) continue;
    // Sem anon_id (ex: signup_complete server-side) → conta cada evento.
    sets[r.step].add(r.anon_id || `evt-${i++}`);
  }

  // ── DE QUAL BOTÃO VEIO O CLIQUE ─────────────────────────────
  // Seis caminhos levam ao cadastro e eles respondem perguntas diferentes:
  // se quase tudo vem do MODAL DE SAÍDA, a pessoa só reage quando está indo
  // embora; se vem da FAIXA DOS CONCORRENTES, o portão do borrão é que está
  // fazendo o trabalho. Uma coisa pede mudar o momento do pedido; a outra pede
  // apertar o portão que já existe. Sem esta quebra as duas são o mesmo número.
  //
  // ⚠️ A SOMA PODE PASSAR DO TOTAL DO PASSO, e não é erro: conta PESSOAS por
  // botão, e quem clicou em dois aparece nos dois. O total do passo conta a
  // pessoa uma vez só. A tela diz isso — número que não fecha e não se explica
  // vira desconfiança na medição inteira.
  const ORIGEM_LABEL = {
    ranking:     "Faixa dos concorrentes borrados",
    gate:        "Portão de Alertas / Relatórios / Configurações",
    exit_intent: "Modal de saída (\"antes de sair…\")",
    score:       "Modal do Score",
    header:      "Menu do avatar",
    acao_semana: "Ação da semana",
    desconhecido: "Origem não registrada"
  };
  const origens = {}; let j = 0;
  for (const r of (data || [])) {
    if (r.step !== "guest_signup_click") continue;
    const from = (r.meta && r.meta.from) || "desconhecido";
    if (!origens[from]) origens[from] = new Set();
    origens[from].add(r.anon_id || `evt-o-${j++}`);
  }
  const porOrigem = Object.entries(origens)
    .map(([from, set]) => ({ from, label: ORIGEM_LABEL[from] || from, people: set.size }))
    .sort((a, b) => b.people - a.people);

  // ── O PASSO FINAL MEDIA OUTRA POPULACAO ─────────────────────
  // Achado em 10/09/2026, com o funil na tela: 35 cadastros para 9 cliques em
  // "criar conta". Não fecha, e a causa é que `signup_complete` conta TODO
  // cadastro do site, venha de onde vier — inclusive o comprador do Mercado
  // Livre que recebeu o cartão e se cadastra no /ativar-codigo (o canal com
  // mais volume), que nunca passou pelo painel do convidado.
  //
  // Dividir esse total pelo topo do funil e chamar de "% do topo" é somar
  // laranja com maçã: o numerador tem gente que o denominador nunca viu.
  //
  // O elo que separa os dois é o `anon_id`: ele só existe pra quem passou pelo
  // /app. Quem chegou pelo cartão não tem nenhum, e o `logFunnel` grava null.
  // Então o passo passa a contar SÓ quem o funil viu de verdade, e o resto vai
  // pra um número à parte, com nome próprio — em vez de sumir ou inflar.
  const anonsDoFunil = new Set();
  for (const r of (data || [])) {
    if (r.anon_id && typeof r.step === "string" && r.step.startsWith("guest_")) anonsDoFunil.add(r.anon_id);
  }
  const cadastroDoFunil = new Set();
  let cadastroForaDoFunil = 0;
  for (const r of (data || [])) {
    if (r.step !== "signup_complete") continue;
    if (r.anon_id && anonsDoFunil.has(r.anon_id)) cadastroDoFunil.add(r.anon_id);
    else cadastroForaDoFunil++;
  }
  sets["signup_complete"] = cadastroDoFunil;

  const top = sets[STEPS[0].key].size || 0;
  let prev = null;
  const funnel = STEPS.map(s => {
    const people = sets[s.key].size;
    const pctOfTop = top ? Math.round((people / top) * 100) : 0;
    const dropFromPrev = prev != null && prev > 0 ? Math.round(((prev - people) / prev) * 100) : null;
    prev = people;
    const extra = s.key === "guest_signup_click" ? { por_origem: porOrigem } : {};
    if (s.desde) extra.desde = s.desde;
    return { key: s.key, label: s.label, people, pctOfTop, dropFromPrev, ...extra };
  });

  // ── O SEGUNDO FUNIL: adoção do Menu Inteligente (08/09/2026) ──
  // O funil acima mede visitante → conta. Este mede conta → cliente pagante,
  // que é a pergunta do lançamento. Vive na mesma tela porque são o mesmo
  // percurso visto em dois trechos, e olhar um sem o outro engana: cadastro
  // subindo com menu parado é crescimento que não vira receita.
  //
  // NÃO usa `funnel_events`: aqui o estado está nas próprias tabelas, e ler
  // delas é mais honesto que confiar num evento que pode não ter sido gravado.
  // A janela de dias NÃO se aplica — o menu é um estado, não um acontecimento;
  // contar "menus criados nos últimos 30 dias" esconderia quem criou antes e
  // publicou agora.
  const menu = await funilDoMenu(since, until);

  // A pergunta que decide o portão do cadastro, calculada aqui e não na tela:
  // de quem VIU O RESULTADO, quantos criaram conta. É a única razão do funil
  // que não depende dos passos do meio, que já nasceram furados uma vez.
  const viuPainel = sets["guest_panel_view"].size;
  const conversaoDoPainel = viuPainel ? Math.round((cadastroDoFunil.size / viuPainel) * 100) : null;

  return res.json({
    days, de, ate, periodo: { de: since, ate: until },
    total_events: (data || []).length, funnel, menu,
    cadastros: {
      do_funil: cadastroDoFunil.size,
      fora_do_funil: cadastroForaDoFunil,
      total: cadastroDoFunil.size + cadastroForaDoFunil,
      viu_painel: viuPainel,
      conversao_do_painel: conversaoDoPainel
    }
  });
}

// `since`/`until` filtram o que É datável — menu criado e menu publicado. O
// resto (no ar num aparelho, assinantes) é ESTADO DE AGORA e não tem data no
// nosso banco; filtrar por período ali daria um número que parece do período e
// não é. A tela diz qual linha é qual, em vez de misturar as duas naturezas.
// ── CONTAS DE DENTRO DE CASA ──
// Pedido do Ricardo (09/09/2026): os testes dele nao podem entrar na conta.
// E o motivo e mais duro do que "poluir o numero": durante um lancamento com
// pouquissimos clientes, DOIS negocios de teste viram a maioria da amostra —
// o painel diria "22% publicaram" e os 22% seriam ele mesmo. Numero que
// descreve quem olha em vez de quem usa e pior que numero nenhum, porque da
// confianca.
//
// Mora numa constante so. Espalhar essa lista por relatorios seria garantir
// que um dia um deles conte e o outro nao, e a divergencia apareceria como
// "os numeros nao batem" sem ninguem achar a causa.
const EMAILS_INTERNOS = new Set([
  "ricardo.fiorini@gmail.com",
  "ricardo@gt6.com.br"
]);

// Devolve os `user_id` das contas internas. Uma chamada, nao uma por negocio.
// Falha em silencio de proposito: se a leitura de usuarios cair, e melhor um
// relatorio COM as contas de teste do que relatorio nenhum — e o aviso sai no
// log pra nao virar diferenca silenciosa.
async function idsInternos() {
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    return new Set(
      (data?.users || [])
        .filter(u => EMAILS_INTERNOS.has((u.email || "").toLowerCase().trim()))
        .map(u => u.id)
    );
  } catch (e) {
    console.warn("[admin] nao consegui excluir contas internas do funil:", e?.message || e);
    return null;
  }
}

async function funilDoMenu(since, until) {
  const noPeriodo = (d) => {
    if (!d) return false;
    if (since && d < since) return false;
    if (until && d > until) return false;
    return true;
  };

  const [exps, plates, negocios, internos] = await Promise.all([
    supabase.from("experiences").select("id, business_id, published, archived_at, created_at, published_at"),
    supabase.from("plates").select("experience_id, served_mode").eq("served_mode", "menu"),
    supabase.from("businesses").select("id, user_id, plan, stripe_subscription_status, stripe_cancel_at_period_end, stripe_current_period_end"),
    idsInternos()
  ]);
  if (exps.error) return { erro: exps.error.message };

  // Os negócios das contas internas saem primeiro, e tudo o mais é contado
  // sobre o que sobrou — inclusive as experiências, que são filtradas pelo
  // `business_id`. Excluir só na contagem final deixaria os menus de teste
  // dentro de "montaram um menu".
  const negsInternos = new Set(
    internos ? (negocios.data || []).filter(b => internos.has(b.user_id)).map(b => b.id) : []
  );
  const deFora = (businessId) => !negsInternos.has(businessId);

  const todasVivas = (exps.data || []).filter(e => !e.archived_at && deFora(e.business_id));
  const vivas = todasVivas.filter(e => noPeriodo(e.created_at));
  // Publicado NO PERÍODO — e não "criado no período e publicado alguma vez":
  // quem montou em agosto e publicou em setembro conta em setembro, que é
  // quando o dinheiro aconteceu.
  const publicadas = todasVivas.filter(e => e.published && noPeriodo(e.published_at));
  const comDispositivo = new Set((plates.data || []).map(p => p.experience_id).filter(Boolean));

  const negs = (negocios.data || []).filter(b => deFora(b.id));
  const assinantes = negs.filter(b => b.plan === "pro" && b.stripe_subscription_status);
  const emTeste = assinantes.filter(b => b.stripe_subscription_status === "trialing");
  const cancelando = assinantes.filter(b => b.stripe_cancel_at_period_end === true);

  // Negócios distintos, e não menus: um dono com três menus é UM cliente.
  const donosComMenu = new Set(vivas.map(e => e.business_id)).size;
  const donosPublicaram = new Set(publicadas.map(e => e.business_id)).size;

  return {
    // Diz em voz alta se a exclusão valeu. Sem isto, uma falha na leitura de
    // usuários apareceria como um número levemente maior — e ninguém notaria.
    internos_excluidos: internos ? negsInternos.size : null,
    negocios_total: negs.length,
    criaram_menu: donosComMenu,
    publicaram: donosPublicaram,
    // Publicado e servindo em pelo menos um aparelho — é aqui que o menu
    // deixa de ser configuração e passa a existir para o cliente final.
    no_ar_em_dispositivo: new Set(publicadas.filter(e => comDispositivo.has(e.id)).map(e => e.business_id)).size,
    assinantes: assinantes.length,
    em_teste_gratis: emTeste.length,
    cancelaram_com_prazo_correndo: cancelando.length,
    // Menus parados no rascunho: montou e não publicou. Se este número crescer,
    // a objeção está no preço ou no momento da cobrança, não no produto.
    so_rascunho: donosComMenu - donosPublicaram
  };
}

// ── VISITAS: a catraca (contagem que não depende de consentimento) ──
// Lê os contadores diários de `page_hits`. Este número responde "quanta gente
// entrou"; o GA4 responde "quanta gente entrou E aceitou cookies" — e as duas
// respostas divergiram por um fator de 5 a 10 na medição de 02/09/2026.
// Ver supabase/schema-visitas.sql.
async function handleVisitas(req, res) {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  // A tabela é por dia (date), não por instante — o corte é em data.
  const desde = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("page_hits")
    .select("dia, path, source, medium, campaign, hits")
    .gte("dia", desde)
    .limit(50000);

  if (error) {
    // Tabela ausente é o caso mais provável de erro aqui, e responder um 500
    // genérico faria parecer bug de código. Diz o que fazer.
    const faltando = /relation|does not exist|schema cache/i.test(error.message || "");
    return res.status(500).json({
      error: faltando
        ? "A tabela page_hits não existe. Rode supabase/schema-visitas.sql uma vez no SQL Editor."
        : error.message,
    });
  }

  const linhas = data || [];
  const total = linhas.reduce((s, r) => s + (r.hits || 0), 0);

  // Somadores simples. Volume esperado: dezenas de linhas por dia.
  const soma = (chave) => {
    const m = new Map();
    for (const r of linhas) m.set(r[chave], (m.get(r[chave]) || 0) + (r.hits || 0));
    return [...m.entries()]
      .map(([k, v]) => ({ nome: k, hits: v, pct: total ? Math.round((v / total) * 100) : 0 }))
      .sort((a, b) => b.hits - a.hits);
  };

  // Origem legível: "ig / paid_social". É o par que diz de onde veio.
  const canais = new Map();
  for (const r of linhas) {
    const k = `${r.source} / ${r.medium}`;
    canais.set(k, (canais.get(k) || 0) + (r.hits || 0));
  }

  const porDia = soma("dia").sort((a, b) => a.nome.localeCompare(b.nome));

  // ── Taxa de aceite do banner de cookies ───────────────────
  // Tabela separada e opcional: se o SQL não tiver sido rodado, o painel de
  // visitas continua funcionando e o bloco de consentimento vem null. Um erro
  // aqui não pode derrubar a régua de volume, que é a principal.
  let consentimento = null;
  const c = await supabase
    .from("consent_hits")
    .select("dia, evento, hits")
    .gte("dia", desde)
    .limit(50000);

  if (c.error) {
    const faltando = /relation|does not exist|schema cache/i.test(c.error.message || "");
    consentimento = {
      erro: faltando
        ? "Rode supabase/schema-consentimento.sql uma vez pra começar a medir a taxa de aceite."
        : c.error.message,
    };
  } else {
    const e = {};
    for (const r of c.data || []) e[r.evento] = (e[r.evento] || 0) + (r.hits || 0);
    const carregamentos =
      (e.sem_decisao || 0) + (e.com_analise || 0) + (e.sem_analise || 0);
    const decidiram = (e.decidiu_aceitar || 0) + (e.decidiu_recusar || 0);
    consentimento = {
      carregamentos,
      // A pergunta que originou tudo: quanto do site o GA4 consegue enxergar.
      medidos_pelo_ga4: e.com_analise || 0,
      pct_visivel_ga4: carregamentos ? Math.round(((e.com_analise || 0) / carregamentos) * 100) : 0,
      banner_exibido: e.sem_decisao || 0,
      decidiu_aceitar: e.decidiu_aceitar || 0,
      decidiu_recusar: e.decidiu_recusar || 0,
      // Quem viu o banner e não clicou em nada. Fica negado e o banner volta.
      ignorou: Math.max(0, (e.sem_decisao || 0) - decidiram),
      pct_aceite: decidiram ? Math.round(((e.decidiu_aceitar || 0) / decidiram) * 100) : null,
    };
  }

  return res.json({
    days,
    total,
    consentimento,
    media_dia: porDia.length ? Math.round(total / porDia.length) : 0,
    dias_com_dado: porDia.length,
    por_dia: porDia,
    por_pagina: soma("path").slice(0, 20),
    por_canal: [...canais.entries()]
      .map(([nome, hits]) => ({ nome, hits, pct: total ? Math.round((hits / total) * 100) : 0 }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 20),
    por_campanha: soma("campaign").filter((c) => c.nome !== "(nenhuma)").slice(0, 20),
  });
}

// ── GRID: ranking por grade (comparação admin, Passo 1/3) ────
// Admin-gated: roda a grade nova sem depender da flag RANKING_GRID_ENABLED,
// pra validar endpoint + cache em negócios reais antes de virar a chave.
async function handleGridSuggest(req, res) {
  const placeId = (req.query.place_id || "").toString().trim();
  if (!placeId) return res.status(400).json({ error: "place_id obrigatório" });
  const seed = await fetchPlaceSeed(placeId);
  if (!seed) return res.status(404).json({ error: "Negócio não encontrado" });
  return res.json({
    name: seed.name,
    types: seed.types || [],
    primary_category: seed.primaryDisplay || null,
    suggestions: suggestTerms(seed.name, seed.types, seed.primaryDisplay, seed.primaryType),
  });
}
async function handleGrid(req, res) {
  const placeId = (req.query.place_id || "").toString().trim();
  let terms = (req.query.terms || "").toString().split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3);
  if (!placeId) return res.status(400).json({ error: "place_id obrigatório" });
  // Sem termo → usa o padrão da categoria do Google (1 termo, grátis).
  if (!terms.length) {
    const seed = await fetchPlaceSeed(placeId);
    terms = suggestTerms(seed?.name, seed?.types, seed?.primaryDisplay, seed?.primaryType).slice(0, 1);
    if (!terms.length) return res.status(422).json({ error: "Sem termo padrão pra este negócio — informe um termo." });
  }
  const grid = await fetchGridRankingCached({ placeId, terms });
  return res.json(grid);
}

// ── STATS: números gerais do sistema ─────────────────────────
async function handleStats(req, res) {
  // Total de users (auth.users)
  const { data: usersList, error: usersErr } = await supabase.auth.admin.listUsers({
    page: 1, perPage: 1000
  });
  if (usersErr) return res.status(500).json({ error: usersErr.message });
  const totalClients = usersList?.users?.length || 0;

  // Total de negócios
  const { count: totalBusinesses } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true });

  // Negócios por plano
  const { data: plansData } = await supabase
    .from("businesses")
    .select("plan");
  const planCounts = (plansData || []).reduce((acc, b) => {
    const p = b.plan || "free";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  // Total de placas e por status
  const { data: platesData } = await supabase
    .from("plates")
    .select("status");
  const plateCounts = (platesData || []).reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, {});

  // Ativações últimas 7 dias
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: activations7d } = await supabase
    .from("plates")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .gte("activated_at", since);

  // Cadastros últimos 7 dias (filtro no array — auth admin não tem filtro de data)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const signups7d = (usersList?.users || []).filter(u => {
    return new Date(u.created_at).getTime() >= sevenDaysAgo;
  }).length;

  // Total de feedbacks (avaliações da peneira Pro)
  const { count: totalFeedbacks } = await supabase
    .from("feedbacks")
    .select("*", { count: "exact", head: true });

  return res.json({
    ok: true,
    stats: {
      totalClients,
      signups7d,
      totalBusinesses,
      planCounts,
      plateCounts,
      activations7d,
      totalFeedbacks
    }
  });
}

// ── LIST CLIENTS: tabela completa pra revisão ────────────────
async function handleListClients(req, res) {
  // Pega todos os users
  const { data: usersList, error: usersErr } = await supabase.auth.admin.listUsers({
    page: 1, perPage: 1000
  });
  if (usersErr) return res.status(500).json({ error: usersErr.message });
  const users = usersList?.users || [];

  // Pega todos os businesses (1 por user)
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, user_id, name, place_id, plan, created_at, address");
  const bizByUser = {};
  (businesses || []).forEach(b => { bizByUser[b.user_id] = b; });

  // Pega todas as placas (incluindo last_tapped_at pra calcular ultimo toque)
  const { data: plates } = await supabase
    .from("plates")
    .select("business_id, status, code, product_type, total_taps, last_tapped_at, activated_at, channel_name");
  const platesByBiz = {};
  (plates || []).forEach(p => {
    if (!platesByBiz[p.business_id]) platesByBiz[p.business_id] = [];
    platesByBiz[p.business_id].push(p);
  });

  // Pega TODOS os snapshots de cada business (pra ter nota inicial + atual)
  // Ordenado DESC: o primeiro de cada business e o mais novo; o ultimo e o mais antigo
  const { data: snapshots } = await supabase
    .from("competitor_snapshots")
    .select("business_id, snapshot_date, competitors")
    .order("snapshot_date", { ascending: false });
  const latestSnapByBiz = {};
  const firstSnapByBiz = {};
  (snapshots || []).forEach(s => {
    if (!latestSnapByBiz[s.business_id]) latestSnapByBiz[s.business_id] = s;
    firstSnapByBiz[s.business_id] = s; // ultima iteracao = snapshot mais antigo
  });

  // Monta os clientes
  const clients = users
    .map(u => {
      const meta = u.user_metadata || {};
      const biz = bizByUser[u.id];
      const bizPlates = biz ? (platesByBiz[biz.id] || []) : [];
      const activePlates = bizPlates.filter(p => p.status === "active");
      const totalTaps = bizPlates.reduce((s, p) => s + (p.total_taps || 0), 0);

      // Ultimo toque (max de last_tapped_at em todas as placas do negocio)
      const lastTapAt = bizPlates.reduce((max, p) => {
        if (!p.last_tapped_at) return max;
        const t = new Date(p.last_tapped_at).getTime();
        return t > max ? t : max;
      }, 0);

      // Helper pra extrair nota+reviews do snapshot procurando o proprio negocio
      const extractMyRating = (snap) => {
        if (!snap || !Array.isArray(snap.competitors)) return null;
        const me = snap.competitors.find(c => c.place_id === biz?.place_id || c.isYou);
        if (!me) return null;
        return {
          rating: me.rating || null,
          reviews: me.reviews || me.user_ratings_total || null
        };
      };

      // Nota inicial (primeiro snapshot) + atual (ultimo snapshot)
      let initialRating = null;
      let initialReviews = null;
      let initialSnapDate = null;
      let googleRating = null;
      let googleReviews = null;
      if (biz) {
        const latest = extractMyRating(latestSnapByBiz[biz.id]);
        if (latest) {
          googleRating = latest.rating;
          googleReviews = latest.reviews;
        }
        const first = extractMyRating(firstSnapByBiz[biz.id]);
        if (first) {
          initialRating = first.rating;
          initialReviews = first.reviews;
          initialSnapDate = firstSnapByBiz[biz.id].snapshot_date;
        }
      }

      return {
        user_id: u.id,
        email: u.email,
        name: meta.name || meta.full_name || (u.email || "").split("@")[0] || "",
        phone: meta.phone || null,
        provider: u.app_metadata?.provider || "email",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        // Negócio
        business: biz ? {
          id: biz.id,
          name: biz.name,
          place_id: biz.place_id,
          address: biz.address,
          plan: biz.plan || "free",
          created_at: biz.created_at
        } : null,
        // Placas
        plates: {
          total: bizPlates.length,
          active: activePlates.length,
          totalTaps,
          lastTapAt: lastTapAt ? new Date(lastTapAt).toISOString() : null,
          list: bizPlates.map(p => ({
            code: p.code,
            status: p.status,
            product_type: p.product_type,
            channel_name: p.channel_name,
            total_taps: p.total_taps,
            last_tapped_at: p.last_tapped_at,
            activated_at: p.activated_at
          }))
        },
        // Google: nota atual + inicial (do primeiro e ultimo snapshot)
        google: googleRating != null ? {
          rating: googleRating,
          reviews: googleReviews,
          snapshot_date: latestSnapByBiz[biz?.id]?.snapshot_date || null,
          initial_rating: initialRating,
          initial_reviews: initialReviews,
          initial_snapshot_date: initialSnapDate
        } : null
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return res.json({ ok: true, clients, count: clients.length });
}

// ── DELETE USER (cascade) ────────────────────────────────────
// Apaga: auth.users + businesses + feedbacks + competitor_snapshots
//        + email_log + alert_preferences (se existir)
// Placas: devolve pro estoque (status='in_stock', business_id=null)
//         em vez de deletar — assim recupera código pra outro cliente.
//
// Protecao: bloqueia se user_id = self (Ricardo nao deleta ele mesmo)
async function handleDeleteUser(req, res, admin) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Use POST ou DELETE" });
  }

  const userId = req.query.user_id || req.body?.user_id;
  if (!userId) return res.status(400).json({ error: "user_id obrigatório" });

  // Protecao: nao deletar o proprio admin
  if (userId === admin.id) {
    return res.status(400).json({ error: "Não pode deletar sua própria conta admin" });
  }

  const summary = {
    user_id: userId,
    deleted: {
      auth_user: false,
      businesses: 0,
      feedbacks: 0,
      snapshots: 0,
      email_logs: 0,
      alert_preferences: 0
    },
    plates_returned_to_stock: 0,
    warnings: []
  };

  try {
    // 1. Acha os businesses do user
    const { data: bizs } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("user_id", userId);
    const bizIds = (bizs || []).map(b => b.id);

    // 2. Devolve placas pro estoque (mantém código + histórico de taps, perde vínculo)
    if (bizIds.length) {
      const { data: returnedPlates, error: platesErr } = await supabase
        .from("plates")
        .update({
          business_id: null,
          status: "in_stock",
          channel_name: null,
          activated_at: null
        })
        .in("business_id", bizIds)
        .select("id");
      if (platesErr) summary.warnings.push("plates: " + platesErr.message);
      else summary.plates_returned_to_stock = (returnedPlates || []).length;

      // 3. Apaga feedbacks dos businesses
      const { count: fbCount, error: fbErr } = await supabase
        .from("feedbacks")
        .delete({ count: "exact" })
        .in("business_id", bizIds);
      if (fbErr) summary.warnings.push("feedbacks: " + fbErr.message);
      else summary.deleted.feedbacks = fbCount || 0;

      // 4. Apaga snapshots dos businesses
      const { count: snapCount, error: snapErr } = await supabase
        .from("competitor_snapshots")
        .delete({ count: "exact" })
        .in("business_id", bizIds);
      if (snapErr) summary.warnings.push("snapshots: " + snapErr.message);
      else summary.deleted.snapshots = snapCount || 0;

      // 5. Apaga os businesses
      const { count: bizCount, error: bizDelErr } = await supabase
        .from("businesses")
        .delete({ count: "exact" })
        .eq("user_id", userId);
      if (bizDelErr) summary.warnings.push("businesses: " + bizDelErr.message);
      else summary.deleted.businesses = bizCount || 0;
    }

    // 6. Apaga email_log do user (se a tabela existir)
    try {
      const { count: emailCount } = await supabase
        .from("email_log")
        .delete({ count: "exact" })
        .eq("user_id", userId);
      summary.deleted.email_logs = emailCount || 0;
    } catch (e) {
      summary.warnings.push("email_log: " + e.message);
    }

    // 7. Apaga alert_preferences do user (se a tabela existir)
    try {
      const { count: alertCount } = await supabase
        .from("alert_preferences")
        .delete({ count: "exact" })
        .eq("user_id", userId);
      summary.deleted.alert_preferences = alertCount || 0;
    } catch (e) {
      summary.warnings.push("alert_preferences: " + e.message);
    }

    // ── 7b. Rastros ligados ao E-MAIL, não ao user_id (Art. 18, V) ──────────
    // Estes ficavam de fora e faziam a exclusão ser parcial: pedido do Art. 18
    // que deixa CPF e endereço no banco não é eliminação. Precisa do e-mail
    // ANTES do passo 8, que apaga o usuário do auth.
    let emailDoUser = null;
    try {
      const { data } = await supabase.auth.admin.getUserById(userId);
      emailDoUser = (data?.user?.email || "").toLowerCase() || null;
    } catch (e) {
      summary.warnings.push("email do user: " + e.message);
    }

    if (emailDoUser) {
      // orders: ANONIMIZA, não apaga. Nota fiscal é obrigação legal e a
      // Política declara 5 anos pra dado fiscal — o que sai é a identificação
      // (shipping inteiro, com CPF e endereço, MAIS a coluna `email`). Ficam
      // valor, data e status, que é o que a obrigação exige. Zerar só o
      // shipping e deixar o e-mail seria meia anonimização.
      try {
        const { count, error } = await supabase
          .from("orders")
          .update({ shipping: null, email: null }, { count: "exact" })
          .eq("email", emailDoUser);
        if (error) throw new Error(error.message);
        summary.anonymized = { orders: count || 0 };
      } catch (e) {
        summary.warnings.push("orders: " + e.message);
      }

      try {
        const { count, error } = await supabase
          .from("radar_leads").delete({ count: "exact" }).eq("email", emailDoUser);
        if (error) throw new Error(error.message);
        summary.deleted.radar_leads = count || 0;
      } catch (e) {
        summary.warnings.push("radar_leads: " + e.message);
      }

      try {
        const { count, error } = await supabase
          .from("titular_requests").delete({ count: "exact" }).eq("email", emailDoUser);
        if (error) throw new Error(error.message);
        summary.deleted.titular_requests = count || 0;
      } catch (e) {
        summary.warnings.push("titular_requests: " + e.message);
      }
    }

    // funnel_events, places_cache e rate_limits NÃO são apagados aqui, e é
    // decisão, não esquecimento: nenhum deles guarda vínculo com este usuário.
    // funnel_events tem id aleatório de navegador; places_cache é resposta do
    // Google por place_id; rate_limits é IP de quem chamou. Não há chave pra
    // achar "as linhas desta pessoa" — sair varrendo por aproximação apagaria
    // dado de terceiro. Os três são cobertos pelo PRAZO, no cron de retenção.

    // 8. Por fim, deleta o user em auth.users
    const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
    if (authErr) {
      return res.status(500).json({
        error: "Dados removidos mas auth.user não deletou: " + authErr.message,
        summary
      });
    }
    summary.deleted.auth_user = true;

    console.log("[admin.delete-user]", JSON.stringify(summary));
    return res.json({ ok: true, summary });
  } catch (err) {
    console.error("[admin.delete-user] erro:", err);
    return res.status(500).json({ error: err.message, summary });
  }
}

// ── PROSPECTS: gera lista de alvos (negócios por termo + região) ──────
// CEP de 8 dígitos vira cidade/UF via ViaCEP pra ancorar a busca no Brasil.
async function resolveLoc(loc) {
  const digits = (loc || "").replace(/\D/g, "");
  if (digits.length === 8) {
    try {
      const v = await fetch(`https://viacep.com.br/ws/${digits}/json/`).then(r => r.json());
      if (v && !v.erro) return [v.localidade, v.uf].filter(Boolean).join(" ");
    } catch {}
  }
  return loc || "";
}

async function handleProspects(req, res) {
  const API_KEY = process.env.PLACES_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "PLACES_API_KEY ausente" });

  const q = (req.query.q || "").trim();
  const loc = (req.query.loc || "").trim();
  if (q.length < 2) return res.status(400).json({ error: "Informe o termo de busca (q)" });

  const locExpanded = await resolveLoc(loc);
  const query = [q, locExpanded].filter(Boolean).join(" ");

  // Text Search com paginação (até 2 páginas ≈ 40 resultados).
  // next_page_token só fica válido ~2s depois — aguardamos antes da 2ª página.
  const collected = [];
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=pt-BR&region=br&key=${API_KEY}`;
  for (let page = 0; page < 2; page++) {
    const data = await fetchWithTimeout(url, {}, 8000).then(r => r.json());
    for (const p of (data.results || [])) {
      if (p.business_status && p.business_status !== "OPERATIONAL") continue;
      if (typeof p.rating !== "number") continue;
      collected.push(p);
    }
    if (!data.next_page_token) break;
    await new Promise(r => setTimeout(r, 2200));
    url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${data.next_page_token}&key=${API_KEY}`;
  }

  // Dedup + monta prospects com link de diagnóstico pronto
  const seen = new Set();
  const prospects = [];
  for (const p of collected) {
    if (seen.has(p.place_id)) continue;
    seen.add(p.place_id);
    const rating = p.rating || 0;
    const reviews = p.user_ratings_total || 0;
    // A ordem do Google PARA ESTE TERMO é o ranking: posição = ordem na lista,
    // e quem está logo acima é o item anterior. Permite montar a mensagem
    // customizada sem chamadas extras.
    const rank = prospects.length + 1;
    const ahead = prospects.length ? prospects[prospects.length - 1] : null;
    prospects.push({
      place_id: p.place_id,
      name: p.name,
      address: p.formatted_address || "",
      rating,
      reviews,
      rank,
      aheadName: ahead ? ahead.name : null,
      aheadRating: ahead ? ahead.rating : null,
      reviewsToNext: ahead ? Math.max(0, ahead.reviews - reviews) : 0,
      // "Alvo quente": bom produto (nota >= 4.0) mas coletando pouco
      isTarget: rating >= 4.0 && reviews >= 3 && reviews <= 150,
      diagnostico: `/diagnostico?place_id=${encodeURIComponent(p.place_id)}&keyword=${encodeURIComponent(q)}`
    });
  }

  return res.json({ ok: true, term: q, location: locExpanded, total: prospects.length, prospects });
}

// ═══════════════════════════════════════════════════════════
// PEDIDOS — a tela que faltava
// ═══════════════════════════════════════════════════════════
// Sete telas de /admin e nenhuma de vendas. O primeiro revendedor perguntou
// onde acompanhava o pedido dele e nem o admin tinha onde olhar: a resposta
// estava numa consulta SQL escrita à mão.

// ═══════════════════════════════════════════════════════════
// A QUE FAMÍLIA O PEDIDO PERTENCE
// ═══════════════════════════════════════════════════════════
// O `external_reference` carrega o prefixo de quem criou o pedido, e é a ÚNICA
// marca que existe em todos eles — `shipping.tipo` só o de revenda tem.
//
//   revenda_  distribuidor            FÍSICO — produz, posta, rastreia
//   kit_      compra normal do site   FÍSICO — idem (inclui `kit_guest`)
//   ia_       Pacote Presença em IA   DIGITAL — não existe caixa
//   plano_ / pro_   assinatura        DIGITAL — idem
//
// SEPARAR FÍSICO DE DIGITAL NÃO É ENFEITE. A máquina de estados oferece
// "Postado" pra qualquer pedido pago; num pedido digital isso pede um código de
// rastreio que não existe e dispara pro cliente um e-mail "A caminho 📦" de uma
// caixa que nunca foi despachada. O filtro é o que impede esse clique.
const FAMILIAS = [
  { chave: "revenda", rotulo: "Revenda", prefixo: "revenda_", fisico: true },
  { chave: "kit",     rotulo: "Kit",     prefixo: "kit_",     fisico: true },
  { chave: "ia",      rotulo: "Pacote IA", prefixo: "ia_",    fisico: false },
  { chave: "plano",   rotulo: "Assinatura", prefixo: "plano_", fisico: false },
  { chave: "pro",     rotulo: "Assinatura", prefixo: "pro_",  fisico: false },
];

function familiaDoPedido(o) {
  const ref = (o?.external_reference || "").toLowerCase();
  const f = FAMILIAS.find((x) => ref.startsWith(x.prefixo));
  if (f) return f;
  // Prefixo desconhecido cai aqui. Tratado como FÍSICO de propósito: some da
  // lista um pedido que talvez precise ser enviado é pior do que mostrar um a
  // mais. Erro visível, não silencioso.
  if ((o?.shipping || {}).tipo === "revenda") return FAMILIAS[0];
  return { chave: "outro", rotulo: "Outro", prefixo: "", fisico: true };
}

/** Lista os pedidos, do mais novo pro mais velho. */
async function handlePedidos(req, res) {
  // "envio" (padrão) = tudo que tem caixa pra despachar: revenda + kit.
  // Antes o padrão era "revenda", então a tela abria escondendo justamente a
  // compra normal do site — a venda que mais acontece.
  const tipo = (req.query.tipo || "envio").toString();
  const status = (req.query.status || "").toString();
  const limite = Math.min(parseInt(req.query.limit, 10) || 60, 200);

  // ─────────────────────────────────────────────────────────
  // A JANELA DE LEITURA É MAIOR QUE A PÁGINA, e é o conserto do bug principal.
  // ─────────────────────────────────────────────────────────
  // Antes: `.limit(60)` no banco e o filtro de "kit" rodando DEPOIS, em JS.
  // Ou seja, pegava os 60 pedidos mais recentes de TODOS os tipos e só então
  // separava os de kit. Numa semana de muita revenda, os pedidos de kit ficavam
  // fora dos 60 e a tela dizia "Nenhum pedido com esses filtros" — afirmando que
  // não há venda quando o que houve foi a lista ter sido cortada antes da conta.
  //
  // A família mora num prefixo de texto e o projeto nunca usou `.like`/`.or` do
  // PostgREST; estrear essa sintaxe aqui, sem conseguir testá-la contra o banco,
  // trocaria um erro silencioso por outro. Então lê uma janela folgada, filtra
  // aqui, e AVISA quando a janela encheu — ver `truncado` no retorno.
  const JANELA = 500;

  let q = supabase.from("orders")
    .select("id, external_reference, status, total_cents, items, shipping, email, " +
            "created_at, paid_at, production_started_at, shipped_at, delivered_at, " +
            "cancelled_at, tracking_code, status_updated_at, status_updated_by, admin_note")
    .order("created_at", { ascending: false })
    .limit(JANELA);

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  const todas = data || [];

  // Contagem POR FAMÍLIA sempre, sobre a janela inteira e antes de qualquer
  // filtro de tipo: é o que deixa a tela mostrar "Kit (7)" e responder de
  // relance "existe pedido normal?" — sem obrigar a clicar em cada aba pra
  // descobrir que está vazia.
  const contagem = {};
  for (const o of todas) {
    const f = familiaDoPedido(o);
    contagem[f.chave] = (contagem[f.chave] || 0) + 1;
  }
  contagem.envio = FAMILIAS.filter((f) => f.fisico)
    .reduce((t, f) => t + (contagem[f.chave] || 0), 0) + (contagem.outro || 0);
  // `digital` é o RESTO, não uma segunda soma: assim envio + digital = todos
  // sempre, inclusive se amanhã surgir um prefixo que ninguém mapeou aqui.
  contagem.digital = todas.length - contagem.envio;
  contagem.todos = todas.length;

  const linhas = todas.filter((o) => {
    const f = familiaDoPedido(o);
    if (tipo === "envio")   return f.fisico;
    if (tipo === "digital") return !f.fisico;
    if (!tipo)              return true;          // "Todos"
    return f.chave === tipo;
  }).slice(0, limite);

  const pedidos = linhas.map((o) => {
    const fam = familiaDoPedido(o);
    const c = o.shipping || {};
    const cliente = dadosDoCliente(c);
    return {
      ...o,
      familia: fam.chave,
      familia_rotulo: fam.rotulo,
      // A TELA PRECISA SABER QUE NÃO HÁ CAIXA. Sem isto ela ofereceria "Postado"
      // pra uma assinatura e pediria rastreio de algo que não é despachado.
      fisico: fam.fisico,
      // `destinos` vem do servidor pra tela não precisar conhecer a regra — e
      // pra que mudar a regra não exija mexer em dois lugares. Pedido digital
      // perde os destinos de logística e fica só com o que faz sentido nele.
      destinos: destinosPossiveis(o.status)
        .filter((d) => fam.fisico || (d !== "postado" && d !== "entregue"))
        // `pula` viaja com o destino pra tela saber QUANDO confirmar sem
        // precisar conhecer a regra — mesma razão de `destinos` vir daqui.
        .map((d) => ({ estado: d, rotulo: ROTULO[d], pula: pulaEnvio(o.status, d) })),
      rotulo: ROTULO[o.status] || o.status,

      // TUDO O QUE A ETIQUETA PRECISA, já traduzido pro formato único. Antes a
      // tela lia `c.endereco` direto e a compra do site — que grava `address` —
      // aparecia sem endereço e sem CPF, embora os dados estivessem gravados.
      cli: { ...cliente, email: cliente.email || o.email || "" },
      etiqueta: textoDaEtiqueta(
        { ...cliente, email: cliente.email || o.email || "" }, o.external_reference),
      endereco_ok: enderecoCompleto(cliente),

      // Campos antigos, mantidos porque o cabeçalho do cartão os usa.
      cliente: cliente.razao || cliente.nome || null,
      contato: cliente.nome || null,
      email_cliente: o.email || cliente.email || null,
      whatsapp: cliente.telefone || null,
      cnpj: cliente.documento_tipo === "CNPJ" ? cliente.documento : null,
      eh_revenda: c.tipo === "revenda" || (o.external_reference || "").startsWith("revenda_"),
      transportadora: cliente.transportadora || null,
    };
  });

  return res.json({
    ok: true, pedidos, total: pedidos.length, tipo, contagem,
    // A JANELA ENCHEU = pode haver pedido antigo fora da conta. Vai pra tela
    // como aviso em vez de virar uma lista curta que parece completa — que era
    // exatamente o defeito que este handler tinha.
    truncado: todas.length >= JANELA,
  });
}

/** Avança (ou cancela) um pedido. A regra vive em _lib/pedido-estados.js. */
async function handlePedidoStatus(req, res, admin) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const { ref, destino, rastreio, nota } = req.body || {};
  if (!ref || !destino) return res.status(400).json({ error: "informe `ref` e `destino`" });

  const { data: pedido, error: e1 } = await supabase.from("orders")
    .select("id, status, external_reference, email, user_id, shipping")
    .eq("external_reference", ref).maybeSingle();
  if (e1) return res.status(500).json({ error: e1.message });
  if (!pedido) return res.status(404).json({ error: "pedido não encontrado" });

  const v = validaTransicao(pedido.status, destino, { rastreio });
  if (!v.ok) return res.status(400).json({ error: v.erro });

  // A MESMA REGRA AQUI, e não só no filtro da lista: esconder o botão some com
  // o caminho fácil, não com o caminho. Uma aba velha aberta antes deste deploy
  // ainda tem o botão "Postado" desenhado, e clicar nele mandaria pro cliente
  // de uma assinatura um e-mail "A caminho 📦" de uma caixa que não existe.
  const fam = familiaDoPedido(pedido);
  if (!fam.fisico && (destino === "postado" || destino === "entregue")) {
    return res.status(400).json({
      error: `"${ROTULO[destino]}" não se aplica a este pedido (${fam.rotulo}): não há nada a despachar.`,
    });
  }

  const patch = camposDaTransicao(destino, { rastreio, quem: admin?.email || null });
  if (typeof nota === "string") patch.admin_note = nota.slice(0, 500);

  // A GUARDA DO ESTADO ATUAL NO WHERE, e não só na validação acima: entre ler e
  // escrever, o webhook pode ter mexido no mesmo pedido. Sem isto, dois cliques
  // rápidos ou uma corrida com o Stripe gravariam por cima um do outro.
  const { data, error } = await supabase.from("orders")
    .update(patch)
    .eq("external_reference", ref)
    .eq("status", pedido.status)
    .select("external_reference, status, tracking_code, status_updated_at")
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(409).json({ error: "o pedido mudou de estado enquanto você olhava — recarregue" });

  console.log(`[admin/pedidos] ${ref}: ${pedido.status} -> ${destino} por ${admin?.email || "?"}`);

  // O CLIENTE SÓ EXISTE SE FICAR SABENDO. Sem este aviso, a tela de admin é um
  // diário particular: o pedido anda aqui dentro e quem está esperando a caixa
  // continua sem notícia — que foi exatamente a reclamação que originou tudo.
  //
  // DEPOIS da escrita, e com `await` de verdade: em serverless a função congela
  // no res.json e promessa solta morre pela metade. E se o e-mail falhar, a
  // virada de estado NÃO volta atrás — ela já aconteceu, e desfazer seria
  // mentir sobre o mundo físico. O erro vai pro log e pra resposta.
  let aviso = null;
  try {
    aviso = await avisaClienteDoPedido({ pedido, destino, rastreio, admin });
  } catch (e) {
    console.error(`[admin/pedidos] ${ref}: estado gravado, e-mail FALHOU:`, e?.message);
    aviso = { enviado: false, erro: e?.message || "falha no envio" };
  }

  return res.json({ ok: true, pedido: data, aviso });
}

/**
 * Avisa o cliente de que o pedido andou. Só três estados mandam e-mail — ver
 * o porquê em `pedidoAtualizadoEmail`.
 */
async function avisaClienteDoPedido({ pedido, destino, rastreio, admin }) {
  const c = pedido?.shipping || {};
  const to = pedido?.email || c.email;
  if (!to) return { enviado: false, erro: "pedido sem e-mail do cliente" };

  const corpo = pedidoAtualizadoEmail({
    nome: c.nome || c.name || null,
    ref: pedido.external_reference,
    estado: destino,
    rastreio: String(rastreio || "").trim().toUpperCase() || null,
    transportadora: c.frete?.transportadora || null,
    ehRevenda: c.tipo === "revenda" || (pedido.external_reference || "").startsWith("revenda_"),
  });
  if (!corpo) return { enviado: false, motivo: "estado não manda e-mail" };

  // `userId` vazio faz o sender PULAR o envio (email-sender.js:62), e pedido de
  // convidado não tem usuário — daí "guest". Custo: a desduplicação vira no-op
  // e o registro no email_log falha calado (pendência 3 do CLAUDE.md). Aqui o
  // risco de duplicata é baixo: quem dispara é um clique humano, não um webhook
  // que se repete sozinho.
  const r = await sendTransactionalEmail({
    userId: pedido.user_id || "guest",
    emailType: `pedido_${destino}`,
    to, subject: corpo.subject, html: corpo.html,
    dedupeByMetadata: { key: "ref", value: pedido.external_reference },
    metadata: { ref: pedido.external_reference, por: admin?.email || null },
  });
  if (r?.error) return { enviado: false, erro: r.error };
  if (r?.skipped) return { enviado: false, motivo: r.reason };
  return { enviado: true, para: to };
}
