// ============================================================
// TRYBO — API do cartao de redes sociais (dispatcher por ?action=)
//   checar-codigo    GET   PUBLICA -- o codigo existe e da pra ativar?
//   ativar           POST  ativa o cartao, cria a conta se preciso, grava destinos
//   painel           GET   a tela inteira do painel: cartoes, toques, redes
//   renomear         POST  apelido do cartao ("Camila · cadeira 2")
//   bloquear         POST  cartao perdido: bloqueia / desbloqueia
//   transferir       POST  cartao novo herda a config; o antigo aponta pro novo
//   cartao           GET   dados da tela de configuracao de um cartao
//   salvar-destinos  POST  grava ate DOIS destinos e recalcula o cartao
//   equipe           GET   atendentes + ranking de toques
//   membro           POST  cria ou atualiza um atendente
//   vincular-membro  POST  diz de qual atendente e o cartao
//
// Arquivo PROPRIO, ao lado do api/plates.js e nao dentro dele. A StarTouch
// esta em producao com venda diaria: codigo novo mora em arquivo novo, pra
// que um erro aqui nao tenha como derrubar a ativacao de placa de avaliacao.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { montarUrl, destinoExiste, recalcularCartao } from "./_lib/trybo.js";
import { limitou } from "./_lib/rate-limit.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function authUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return { error: "Token obrigatório", status: 401 };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { error: "Token inválido", status: 401 };
  return { user: data.user };
}

// O negocio do usuario. Hoje e um so por conta (businesses tem UNIQUE
// user_id); o dia em que forem varios, muda so aqui.
async function negocioDo(user) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Não consegui ler seu negócio: " + error.message);
  return data || null;
}

// Busca o cartao E confere que ele e do usuario, numa coisa so.
//
// Responde "não encontrado" tambem quando o cartao existe mas e de outra
// pessoa — de proposito. Dizer "esse cartão não é seu" confirmaria, pra quem
// esta testando codigos, que aquele codigo existe. Mesma disciplina ja usada
// no feedback.js.
async function cartaoDoUsuario(code, negocio) {
  const normalizado = String(code || "").trim().toUpperCase();
  if (!normalizado) return null;
  const { data, error } = await supabase
    .from("plates")
    .select("id, code, status, linha, business_id, member_id, channel_name, served_destinations, served_reason")
    .eq("code", normalizado)
    .maybeSingle();
  if (error) throw new Error("Não consegui ler o cartão: " + error.message);
  if (!data || data.business_id !== negocio.id) return null;
  return data;
}

// Os status em que um cartão ainda não tem dono e pode ser ativado. Fonte
// única pra conferência, ativação e transferência — as três dizerem coisas
// diferentes foi o que deixou um cartão 'sent' passar na conferência e
// falhar calado na ativação.
const STATUS_ATIVAVEIS = ["in_stock", "assigned", "sent"];

async function temDesbloqueio(negocioId) {
  const { data, error } = await supabase
    .rpc("has_entitlement", { p_business: negocioId, p_feature: "destinos" });
  if (error) throw new Error("Não consegui checar o desbloqueio: " + error.message);
  return data === true;
}

async function catalogo() {
  const { data, error } = await supabase
    .from("destination_kinds")
    .select("kind, label, is_free, ordem")
    .order("ordem");
  if (error) throw new Error("Não consegui ler o catálogo de destinos: " + error.message);
  return data || [];
}

// ── GET ?action=cartao&code= ────────────────────────────────
// Uma chamada so pra montar a tela inteira: o que o cartao aponta hoje, o
// que o consumidor esta vendo agora, o catalogo e se a conta tem o
// desbloqueio. Tela que precisa de quatro chamadas pisca em 4G de loja.
async function handleCartao(req, res, user) {
  const negocio = await negocioDo(user);
  if (!negocio) return res.status(404).json({ error: "Você ainda não tem um negócio cadastrado" });

  const cartao = await cartaoDoUsuario(req.query.code, negocio);
  if (!cartao) return res.status(404).json({ error: "Cartão não encontrado" });

  const { data: destinos, error: dErr } = await supabase
    .from("plate_destinations")
    .select("posicao, kind, url")
    .eq("plate_id", cartao.id)
    .order("posicao");
  if (dErr) return res.status(500).json({ error: dErr.message });

  return res.json({
    ok: true,
    cartao: {
      code: cartao.code,
      status: cartao.status,
      linha: cartao.linha,
      apelido: cartao.channel_name,
      member_id: cartao.member_id
    },
    // o que o lojista configurou
    destinos: destinos || [],
    // o que o consumidor encontra AGORA (ja filtrado por plano)
    servidos: Array.isArray(cartao.served_destinations) ? cartao.served_destinations : [],
    motivo: cartao.served_reason,
    catalogo: await catalogo(),
    desbloqueado: await temDesbloqueio(negocio.id)
  });
}

// ── POST ?action=salvar-destinos ────────────────────────────
// body: { code, destinos: [ { posicao: 1|2, kind, valor }, ... ] }
// `valor` e o @ (ou o telefone, ou a URL inteira nos destinos livres).
async function handleSalvarDestinos(req, res, user) {
  const negocio = await negocioDo(user);
  if (!negocio) return res.status(404).json({ error: "Você ainda não tem um negócio cadastrado" });

  const { code, destinos } = req.body || {};
  const cartao = await cartaoDoUsuario(code, negocio);
  if (!cartao) return res.status(404).json({ error: "Cartão não encontrado" });
  if (cartao.linha !== "social") {
    return res.status(400).json({ error: "Esse dispositivo não é um cartão Trybo" });
  }

  if (!Array.isArray(destinos) || destinos.length === 0) {
    return res.status(400).json({ error: "Escolha pelo menos um destino" });
  }
  // O banco tambem recusa (check posicao in 1,2), mas a mensagem de la e
  // criptica. Aqui o lojista entende o porque.
  if (destinos.length > 2) {
    return res.status(400).json({
      error: "Cada cartão mostra no máximo dois destinos. Mais que isso e as pessoas param de escolher."
    });
  }

  const cat = await catalogo();
  const porKind = new Map(cat.map((c) => [c.kind, c]));
  const desbloqueado = await temDesbloqueio(negocio.id);

  const linhas = [];
  const usadas = new Set();
  for (let i = 0; i < destinos.length; i++) {
    const d = destinos[i] || {};
    const posicao = Number(d.posicao || i + 1);
    if (posicao !== 1 && posicao !== 2) {
      return res.status(400).json({ error: "Posição inválida (só existe 1 e 2)" });
    }
    if (usadas.has(posicao)) {
      return res.status(400).json({ error: "Dois destinos na mesma posição" });
    }
    usadas.add(posicao);

    const kind = String(d.kind || "");
    const info = porKind.get(kind);
    if (!info || !destinoExiste(kind)) {
      return res.status(400).json({ error: `Destino "${kind}" não existe` });
    }

    // A trava do plano acontece em DOIS lugares, e isso e de proposito.
    // Aqui, pra dar uma resposta clara a quem esta configurando. E de novo
    // na hora de resolver o que o cartao serve, porque um destino pago pode
    // deixar de ser permitido DEPOIS de salvo (estorno, cortesia vencida) —
    // e ai nao ha tela nenhuma envolvida.
    if (!info.is_free && !desbloqueado) {
      return res.status(403).json({
        error: `${info.label} faz parte do desbloqueio de destinos avançados.`,
        precisa_desbloqueio: true
      });
    }

    let url;
    try {
      url = montarUrl(kind, d.valor);
    } catch (e) {
      return res.status(400).json({ error: `${info.label}: ${e.message}` });
    }
    linhas.push({ plate_id: cartao.id, posicao, kind, url, valor: String(d.valor || "").trim() });
  }
  const perfisNovos = linhas.map(({ kind, url, valor }) => ({ kind, url, valor }));
  for (const l of linhas) delete l.valor;

  // Troca o conjunto inteiro. Apagar e reinserir e mais simples e mais seguro
  // do que casar posicao a posicao: o estado final e exatamente o que o
  // lojista viu na tela, sem sobra de uma configuracao anterior.
  const { error: delErr } = await supabase
    .from("plate_destinations").delete().eq("plate_id", cartao.id);
  if (delErr) return res.status(500).json({ error: "Não consegui limpar os destinos antigos: " + delErr.message });

  const { error: insErr } = await supabase.from("plate_destinations").insert(linhas);
  if (insErr) return res.status(500).json({ error: "Não consegui salvar os destinos: " + insErr.message });

  // O elo com o cartao no balcao. Se isto falhar, a resposta e ERRO — o
  // lojista NAO pode ver "salvo" enquanto o cartao ainda serve o destino
  // velho.
  let resultado;
  try {
    resultado = await recalcularCartao(supabase, cartao.id);
  } catch (e) {
    console.error("[trybo.salvar-destinos] recalculo falhou:", e);
    return res.status(500).json({ error: e.message });
  }

  // A conta lembra o @ que foi usado, pra que o próximo cartão (ou a troca
  // de destino deste) já venha preenchido. Conveniência: se falhar, o cartão
  // já está certo e o lojista só digita de novo da próxima vez.
  for (const p of perfisNovos) {
    try {
      await supabase.from("social_profiles").delete()
        .eq("business_id", negocio.id).is("member_id", null).eq("kind", p.kind);
      const { error } = await supabase.from("social_profiles").insert({
        business_id: negocio.id, member_id: null, kind: p.kind,
        handle: p.valor.replace(/^@/, "").slice(0, 80), url: p.url, is_active: true
      });
      if (error) console.warn("[trybo.salvar-destinos] perfil não gravado:", p.kind, error.message);
    } catch (e) {
      console.warn("[trybo.salvar-destinos] perfil não gravado:", p.kind, e.message);
    }
  }

  return res.json({ ok: true, ...resultado });
}

// ── GET ?action=equipe ──────────────────────────────────────
async function handleEquipe(req, res, user) {
  const negocio = await negocioDo(user);
  if (!negocio) return res.status(404).json({ error: "Você ainda não tem um negócio cadastrado" });

  const { data, error } = await supabase
    .from("v_trybo_ranking_equipe")
    .select("member_id, name, toques_30d")
    .eq("business_id", negocio.id)
    .order("toques_30d", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ ok: true, equipe: data || [] });
}

// ── POST ?action=membro ─────────────────────────────────────
// body: { id?, name, is_active? }   sem id = cria
async function handleMembro(req, res, user) {
  const negocio = await negocioDo(user);
  if (!negocio) return res.status(404).json({ error: "Você ainda não tem um negócio cadastrado" });

  const { id, name, is_active } = req.body || {};
  const nome = String(name || "").trim().slice(0, 80);
  if (!id && !nome) return res.status(400).json({ error: "Digite o nome do atendente" });

  if (!id) {
    const { data, error } = await supabase
      .from("members")
      .insert({ business_id: negocio.id, name: nome })
      .select("id, name, is_active")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, membro: data });
  }

  const patch = {};
  if (nome) patch.name = nome;
  if (typeof is_active === "boolean") patch.is_active = is_active;
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Nada para alterar" });

  // O .eq('business_id') e o que impede renomear o atendente de outra loja.
  const { data, error } = await supabase
    .from("members")
    .update(patch)
    .eq("id", id)
    .eq("business_id", negocio.id)
    .select("id, name, is_active")
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Atendente não encontrado" });
  return res.json({ ok: true, membro: data });
}

// ── POST ?action=vincular-membro ────────────────────────────
// body: { code, member_id }   member_id null = cartao da loja
async function handleVincularMembro(req, res, user) {
  const negocio = await negocioDo(user);
  if (!negocio) return res.status(404).json({ error: "Você ainda não tem um negócio cadastrado" });

  const { code, member_id } = req.body || {};
  const cartao = await cartaoDoUsuario(code, negocio);
  if (!cartao) return res.status(404).json({ error: "Cartão não encontrado" });

  if (member_id) {
    const { data: m, error } = await supabase
      .from("members")
      .select("id")
      .eq("id", member_id)
      .eq("business_id", negocio.id)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!m) return res.status(404).json({ error: "Atendente não encontrado" });
  }

  const { error: updErr } = await supabase
    .from("plates")
    .update({ member_id: member_id || null })
    .eq("id", cartao.id);
  if (updErr) return res.status(500).json({ error: updErr.message });

  // O historico ja gravado NAO muda de dono. Cada linha de plate_taps carrega
  // o member_id de quando o toque aconteceu — se a gente reescrevesse, o
  // ranking do mes passado mudaria sozinho toda vez que um cartao trocasse
  // de cadeira, e ninguem confiaria mais no numero.
  return res.json({ ok: true, member_id: member_id || null });
}

// ── GET ?action=painel&dias=7|30 ────────────────────────────
// A tela inteira do painel numa chamada: os cartões da conta, o que cada um
// serve, os toques por dia e pra onde as pessoas foram.
//
// TOQUE x ENCAMINHAMENTO — são números diferentes e a tela mostra os dois
// com nomes diferentes. Toque = alguém encostou o celular (plate_taps, sem
// robô). Encaminhamento = a pessoa chegou mesmo na rede (experience_events).
// Nenhum dos dois é "seguidor novo": o Instagram não conta isso pra ninguém.
const DIA_MS = 86400000;
const FUSO_BR_MS = 3 * 3600000;   // Brasil sem horário de verão desde 2019

function diaBR(iso) {
  return new Date(new Date(iso).getTime() - FUSO_BR_MS).toISOString().slice(0, 10);
}

async function handlePainel(req, res, user) {
  const negocio = await negocioDo(user);
  // Conta sem negócio: logou, mas nunca ativou cartão. Não é erro — é a
  // tela de "ative seu primeiro cartão".
  if (!negocio) return res.json({ ok: true, negocio: null, cartoes: [], serie: [], redes: [] });

  const dias = req.query.dias === "30" ? 30 : 7;

  const { data: cartoes, error: cErr } = await supabase
    .from("plates")
    .select("id, code, status, channel_name, total_taps, last_tapped_at, activated_at, served_destinations, served_reason, replaced_by")
    .eq("business_id", negocio.id)
    .eq("linha", "social")
    .order("activated_at", { ascending: true });
  if (cErr) return res.status(500).json({ error: "Não consegui ler seus cartões: " + cErr.message });

  const lista = cartoes || [];
  const ids = lista.map((c) => c.id);

  // Janela alinhada ao dia brasileiro: "7 dias" = hoje e os 6 anteriores,
  // inteiros. Começar 7×24h atrás cortaria o primeiro dia no meio.
  const hojeBR = diaBR(new Date().toISOString());
  const inicioBR = new Date(Date.parse(hojeBR + "T00:00:00Z") - (dias - 1) * DIA_MS);
  const desde = new Date(inicioBR.getTime() + FUSO_BR_MS).toISOString();

  const porDia = new Map();
  for (let i = 0; i < dias; i++) {
    porDia.set(new Date(inicioBR.getTime() + i * DIA_MS).toISOString().slice(0, 10), 0);
  }
  const toquesPorCartao = new Map();
  const redes = new Map();

  if (ids.length) {
    const { data: toques, error: tErr } = await supabase
      .from("plate_taps")
      .select("plate_id, tapped_at")
      .in("plate_id", ids)
      .eq("is_bot", false)
      .gte("tapped_at", desde)
      .limit(20000);
    // Não derruba a tela: sem os números, o lojista ainda precisa conseguir
    // trocar o @ — que é o motivo nº 1 de ele abrir o painel. Mas avisa.
    if (tErr) console.error("[trybo.painel] toques:", tErr.message);
    for (const t of toques || []) {
      const d = diaBR(t.tapped_at);
      if (porDia.has(d)) porDia.set(d, porDia.get(d) + 1);
      toquesPorCartao.set(t.plate_id, (toquesPorCartao.get(t.plate_id) || 0) + 1);
    }

    const { data: cliques, error: eErr } = await supabase
      .from("experience_events")
      .select("action")
      .in("plate_id", ids)
      .eq("kind", "click")
      .gte("happened_at", desde)
      .limit(20000);
    if (eErr) console.error("[trybo.painel] encaminhamentos:", eErr.message);
    for (const c of cliques || []) {
      redes.set(c.action, (redes.get(c.action) || 0) + 1);
    }
  }

  const { data: perfis } = await supabase
    .from("social_profiles")
    .select("kind, handle, url")
    .eq("business_id", negocio.id)
    .is("member_id", null)
    .eq("is_active", true);

  const { data: destinos, error: dErr } = ids.length
    ? await supabase.from("plate_destinations").select("plate_id, posicao, kind, url").in("plate_id", ids).order("posicao")
    : { data: [], error: null };
  if (dErr) return res.status(500).json({ error: "Não consegui ler os destinos: " + dErr.message });

  // A conta também usa a StarTouch? Aí o painel explica que os cartões Trybo
  // ficam SEPARADOS das placas de avaliação e oferece o caminho de volta —
  // sem isso, quem entra com o login da StarTouch acha que caiu no lugar
  // errado. Não traz nenhum dado da StarTouch pra cá: só o sim/não.
  const { count: placasStartouch } = await supabase
    .from("plates").select("id", { count: "exact", head: true })
    .eq("business_id", negocio.id).eq("linha", "avaliacao");
  const { data: bizGoogle } = await supabase
    .from("businesses").select("place_id").eq("id", negocio.id).maybeSingle();

  return res.json({
    ok: true,
    dias,
    negocio: { nome: negocio.name },
    tambem_startouch: (placasStartouch || 0) > 0 || !!bizGoogle?.place_id,
    desbloqueado: await temDesbloqueio(negocio.id),
    catalogo: await catalogo(),
    perfis: perfis || [],
    cartoes: lista.map((c) => ({
      code: c.code,
      status: c.status,
      apelido: c.channel_name,
      toques_periodo: toquesPorCartao.get(c.id) || 0,
      toques_total: c.total_taps || 0,
      ultimo_toque: c.last_tapped_at,
      ativado_em: c.activated_at,
      substituido: !!c.replaced_by,
      configurados: (destinos || []).filter((d) => d.plate_id === c.id).map(({ posicao, kind, url }) => ({ posicao, kind, url })),
      servidos: Array.isArray(c.served_destinations) ? c.served_destinations : [],
      motivo: c.served_reason
    })),
    serie: [...porDia].map(([dia, toques]) => ({ dia, toques })),
    redes: [...redes].map(([kind, cliques]) => ({ kind, cliques })).sort((a, b) => b.cliques - a.cliques)
  });
}

// ── POST ?action=renomear ───────────────────────────────────
// body: { code, apelido }   "Camila · cadeira 2". Vazio = sem apelido.
async function handleRenomear(req, res, user) {
  const negocio = await negocioDo(user);
  if (!negocio) return res.status(404).json({ error: "Cartão não encontrado" });
  const { code, apelido } = req.body || {};
  const cartao = await cartaoDoUsuario(code, negocio);
  if (!cartao || cartao.linha !== "social") return res.status(404).json({ error: "Cartão não encontrado" });

  const nome = String(apelido || "").trim().slice(0, 60) || null;
  const { error } = await supabase.from("plates").update({ channel_name: nome }).eq("id", cartao.id);
  if (error) return res.status(500).json({ error: "Não consegui renomear: " + error.message });
  return res.json({ ok: true, apelido: nome });
}

// ── POST ?action=bloquear ───────────────────────────────────
// body: { code, bloquear: true|false }
// Cartão perdido: quem encostar cai em "este cartão foi bloqueado" (a /t/
// já responde isso). Desbloquear devolve os mesmos destinos — nada é apagado.
async function handleBloquear(req, res, user) {
  const negocio = await negocioDo(user);
  if (!negocio) return res.status(404).json({ error: "Cartão não encontrado" });
  const { code, bloquear } = req.body || {};
  const cartao = await cartaoDoUsuario(code, negocio);
  if (!cartao || cartao.linha !== "social") return res.status(404).json({ error: "Cartão não encontrado" });

  const { data: atual } = await supabase.from("plates").select("replaced_by").eq("id", cartao.id).maybeSingle();
  if (!bloquear && atual?.replaced_by) {
    return res.status(400).json({ error: "Esse cartão já foi trocado por outro. Quem encostar nele vai direto pro cartão novo." });
  }

  const status = bloquear ? "disabled" : "active";
  const { error } = await supabase.from("plates").update({ status }).eq("id", cartao.id);
  if (error) return res.status(500).json({ error: "Não consegui mudar o cartão: " + error.message });
  return res.json({ ok: true, status });
}

// ── POST ?action=transferir ─────────────────────────────────
// body: { code (o antigo), novo (o código do cartão novo, ainda sem dono) }
//
// O cartão novo herda apelido, atendente e destinos; o antigo fica bloqueado
// e apontando pro novo (`replaced_by`), então quem ainda tiver o antigo na
// mão — ou um QR impresso num cartaz — chega no lugar certo. O histórico de
// toques fica com o antigo: é o que aconteceu, e reescrever mudaria o passado.
//
// A ordem é escolhida pra que qualquer parada no meio deixe um estado
// consertável: primeiro o NOVO passa a funcionar, só depois o antigo se
// desliga. Na ordem inversa, uma queda no meio deixaria a loja sem cartão
// nenhum funcionando.
async function handleTransferir(req, res, user) {
  const negocio = await negocioDo(user);
  if (!negocio) return res.status(404).json({ error: "Cartão não encontrado" });
  const { code, novo } = req.body || {};
  const antigo = await cartaoDoUsuario(code, negocio);
  if (!antigo || antigo.linha !== "social") return res.status(404).json({ error: "Cartão não encontrado" });

  const codNovo = String(novo || "").trim().toUpperCase();
  if (!codNovo) return res.status(400).json({ error: "Digite o código do cartão novo" });
  if (codNovo === antigo.code) return res.status(400).json({ error: "Esse é o mesmo cartão" });

  const { data: alvo, error: aErr } = await supabase
    .from("plates").select("id, code, status, linha").eq("code", codNovo).maybeSingle();
  if (aErr) return res.status(503).json({ error: "Não consegui consultar o cartão novo agora." });
  // Mesmas frases do passo 1 da ativação, pela mesma razão: cada situação
  // tem uma saída diferente, e "código inválido" pra tudo não ensina nenhuma.
  if (!alvo) return res.status(404).json({ error: "Não encontrei o cartão novo. Confira o código no verso." });
  if (alvo.linha !== "social") return res.status(400).json({ error: "Esse código é de outro produto da casa, não de um cartão Trybo." });
  if (!STATUS_ATIVAVEIS.includes(alvo.status)) {
    return res.status(400).json({ error: "O cartão novo já está em uso. Use um cartão que ainda não foi ativado." });
  }

  const agora = new Date().toISOString();
  const { data: ok, error: uErr } = await supabase
    .from("plates")
    .update({
      business_id: negocio.id,
      channel_name: antigo.channel_name,
      member_id: antigo.member_id,
      status: "active",
      activated_at: agora,
      served_mode: "social",
      served_reason: "padrao",
      served_destinations: [],
      served_at: agora
    })
    .eq("id", alvo.id)
    .in("status", STATUS_ATIVAVEIS)
    .select("id");
  if (uErr) return res.status(500).json({ error: "Não consegui ativar o cartão novo: " + uErr.message });
  if (!ok || ok.length === 0) return res.status(409).json({ error: "O cartão novo acabou de ser ativado por outra pessoa." });

  const { data: dests, error: dErr } = await supabase
    .from("plate_destinations").select("posicao, kind, url").eq("plate_id", antigo.id);
  if (dErr) return res.status(500).json({ error: "O cartão novo foi ativado, mas não consegui copiar os destinos. Configure no painel." });
  if (dests && dests.length) {
    const { error: iErr } = await supabase
      .from("plate_destinations")
      .insert(dests.map((d) => ({ plate_id: alvo.id, posicao: d.posicao, kind: d.kind, url: d.url })));
    if (iErr) return res.status(500).json({ error: "O cartão novo foi ativado, mas não consegui copiar os destinos. Configure no painel." });
  }

  try {
    await recalcularCartao(supabase, alvo.id);
  } catch (e) {
    console.error("[trybo.transferir] recalculo:", e);
    return res.status(500).json({ error: "O cartão novo foi ativado, mas não consegui publicar os destinos. Abra ele no painel e salve." });
  }

  // Só agora o antigo sai de cena.
  const { error: oErr } = await supabase
    .from("plates").update({ status: "disabled", replaced_by: alvo.id }).eq("id", antigo.id);
  if (oErr) {
    console.error("[trybo.transferir] antigo não bloqueado:", oErr);
    return res.status(500).json({ error: "O cartão novo está funcionando, mas o antigo continua ativo. Bloqueie o antigo no painel." });
  }

  return res.json({ ok: true, novo: alvo.code });
}

// ── GET ?action=checar-codigo&code= ─────────────────────────
// PÚBLICO, sem login. É o primeiro passo da ativação: quem acabou de receber
// o cartão digita o código ANTES de ter conta.
//
// Só responde uma de quatro palavras. Nunca diz de quem é o cartão, nem o
// nome da loja, nem nada que ele carregue — a resposta serve pra mostrar a
// tela certa, não pra contar a vida de ninguém.
//
// Tem freio por IP porque é o único jeito de descobrir se um código existe
// sem tê-lo na mão. Não é uma porta valiosa (são 33 milhões de combinações
// por letra de produto, e código ativado não é reivindicável), mas laço
// solto em rota pública é o tipo de coisa que a gente descobre pela conta.
async function handleCheckarCodigo(req, res) {
  const code = String(req.query.code || "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "Informe o código" });

  const { data, error } = await supabase
    .from("plates")
    .select("code, status, linha")
    .eq("code", code)
    .maybeSingle();
  if (error) {
    console.error("[trybo.checar-codigo]", error);
    return res.status(503).json({ error: "Não consegui consultar agora. Tente de novo em instantes." });
  }

  if (!data)                     return res.json({ ok: true, situacao: "nao_existe" });
  if (data.linha !== "social")   return res.json({ ok: true, situacao: "outro_produto" });
  if (data.status === "disabled")return res.json({ ok: true, situacao: "bloqueado" });
  if (data.status === "active")  return res.json({ ok: true, situacao: "ja_ativo" });
  if (!STATUS_ATIVAVEIS.includes(data.status)) return res.json({ ok: true, situacao: "nao_existe" });
  return res.json({ ok: true, situacao: "pronto", code: data.code });
}

// ── POST ?action=ativar ─────────────────────────────────────
// body: { code, nome, perfis: { instagram, tiktok, whatsapp, youtube }, apelido? }
//
// Faz a ativação inteira numa chamada só. Não é capricho: em quatro chamadas,
// uma queda de sinal no meio deixaria o cartão ativado e sem destino, ou a
// conta criada e o cartão preso. Aqui a ordem é escolhida pra que QUALQUER
// parada no meio deixe um estado que a pessoa consegue consertar sozinha no
// painel, e nunca um cartão que mente pro cliente dela.
const REDES_DA_ARTE = ["instagram", "tiktok", "whatsapp", "youtube"];

async function handleAtivar(req, res, user) {
  const { code, nome, perfis, apelido } = req.body || {};
  const normalizado = String(code || "").trim().toUpperCase();
  if (!normalizado) return res.status(400).json({ error: "Informe o código do cartão" });

  // ── 1. o cartão ──
  const { data: plate, error: plateErr } = await supabase
    .from("plates")
    .select("id, code, status, linha, business_id")
    .eq("code", normalizado)
    .maybeSingle();
  if (plateErr) return res.status(503).json({ error: "Não consegui consultar o cartão agora." });
  if (!plate) return res.status(404).json({ error: "Código não encontrado. Confira o que está impresso no verso." });
  if (plate.linha !== "social") {
    return res.status(400).json({ error: "Esse código não é de um cartão Trybo." });
  }
  if (plate.status === "disabled") {
    return res.status(400).json({ error: "Esse cartão está bloqueado. Fale com a gente." });
  }
  if (plate.status === "active") {
    // Saber o código NÃO é ter permissão de reivindicá-lo: o código viaja na
    // URL de quem encosta o celular, então qualquer cliente da loja poderia
    // ter anotado. Cartão já ativo só volta a ser ativável se o dono o
    // desvincular.
    const { data: dono } = await supabase
      .from("businesses").select("user_id").eq("id", plate.business_id).maybeSingle();
    if (dono?.user_id === user.id) {
      return res.status(400).json({ error: "Esse cartão já está ativado na sua conta." });
    }
    return res.status(403).json({ error: "Esse cartão já foi ativado por outra pessoa. Se você comprou recentemente, fale com a gente." });
  }

  // ── 2. a conta ──
  // A Trybo não pede o Google: quem compra um cartão de redes sociais pode
  // nem ter ficha lá, e pedir isso aqui seria cobrar uma coisa que não tem a
  // ver com o que a pessoa comprou, no passo mais frágil do funil.
  let negocio = await negocioDo(user);
  if (!negocio) {
    const nomeNegocio = String(nome || "").trim().slice(0, 80);
    if (!nomeNegocio) return res.status(400).json({ error: "Diga o nome que o cliente vê" });

    const meta = user.user_metadata || {};
    await supabase.from("profiles").upsert(
      { id: user.id, name: meta.name || nomeNegocio, phone: meta.phone || "" },
      { onConflict: "id" }
    );

    const { data: criado, error: bizErr } = await supabase
      .from("businesses")
      .insert({ user_id: user.id, name: nomeNegocio, plan: "free" })
      .select("id, name")
      .single();
    if (bizErr) {
      console.error("[trybo.ativar] falha ao criar negócio:", bizErr);
      // Mensagem específica pro caso que a gente sabe que pode acontecer:
      // o SQL trybo-003 não foi rodado e a coluna do Google ainda é
      // obrigatória. Erro genérico aqui viraria meia hora de investigação.
      const pista = /place_id/.test(bizErr.message || "")
        ? " (rode supabase/trybo-003-conta-sem-google.sql)"
        : "";
      return res.status(500).json({ error: "Não consegui criar sua conta" + pista });
    }
    negocio = criado;
  }

  // ── 3. ativa o cartão ──
  // ANTES dos destinos, de propósito: se algo falhar depois, o cartão fica
  // ativo e sem destino — e a rota /t/ mostra "cartão ativo, sem destino",
  // que é honesto e o dono resolve no painel. Na ordem inversa, uma falha
  // deixaria destinos gravados num cartão de ninguém.
  const agora = new Date().toISOString();
  const { data: ativadas, error: ativErr } = await supabase
    .from("plates")
    .update({
      business_id: negocio.id,
      channel_name: String(apelido || nome || "").trim().slice(0, 60) || null,
      status: "active",
      activated_at: agora,
      served_mode: "social",
      served_reason: "padrao",
      served_destinations: [],
      served_at: agora
    })
    .eq("id", plate.id)
    // Trava de corrida: só ativa se ninguém ativou no meio do caminho. A
    // lista é a MESMA que o checar-codigo chama de "pronto" — com só
    // 'in_stock' aqui, um cartão 'sent' passava na conferência e o update
    // não pegava linha nenhuma, calado.
    .in("status", STATUS_ATIVAVEIS)
    .select("id");
  if (ativErr) {
    console.error("[trybo.ativar] falha ao ativar:", ativErr);
    return res.status(500).json({ error: "Não consegui ativar o cartão. Tente de novo." });
  }
  // Zero linhas = alguém ativou entre a leitura e a escrita. Seguir em frente
  // gravaria destinos num cartão que é de outra pessoa.
  if (!ativadas || ativadas.length === 0) {
    return res.status(409).json({ error: "Esse cartão acabou de ser ativado. Se foi você, abra o painel." });
  }

  // ── 4. os perfis da conta ──
  // A conta guarda TODOS os perfis que a pessoa preencheu. O cartão mostra
  // no máximo dois — são coisas diferentes, e é o que permite trocar o
  // destino depois sem digitar o @ de novo.
  const preenchidos = [];
  for (const kind of REDES_DA_ARTE) {
    const valor = String((perfis || {})[kind] || "").trim();
    if (!valor) continue;
    let url;
    try {
      url = montarUrl(kind, valor);
    } catch (e) {
      return res.status(400).json({ error: `${kind}: ${e.message}` });
    }
    preenchidos.push({ kind, valor, url });
  }
  if (preenchidos.length === 0) {
    return res.status(400).json({ error: "Preencha pelo menos uma rede" });
  }

  for (const p of preenchidos) {
    // Apaga-e-insere em vez de `upsert`: a unicidade de social_profiles é um
    // índice por EXPRESSÃO (usa COALESCE no member_id, porque em Postgres
    // NULL nunca é igual a NULL). O ON CONFLICT do upsert não alcança índice
    // assim — ele pediria um constraint por lista de colunas, que não existe.
    await supabase.from("social_profiles")
      .delete()
      .eq("business_id", negocio.id)
      .is("member_id", null)
      .eq("kind", p.kind);

    const { error } = await supabase.from("social_profiles").insert({
      business_id: negocio.id,
      member_id: null,
      kind: p.kind,
      handle: p.valor.replace(/^@/, "").slice(0, 80),
      url: p.url,
      is_active: true
    });
    // Não derruba a ativação: o perfil da conta é conveniência pra depois.
    // O que precisa estar certo é o destino DO CARTÃO, logo abaixo.
    if (error) console.warn("[trybo.ativar] perfil não gravado:", p.kind, error.message);
  }

  // ── 5. os dois destinos do cartão ──
  // Os dois primeiros preenchidos, na ordem impressa na arte. A pessoa troca
  // depois no painel — perguntar "quais dois?" agora seria uma decisão a mais
  // num momento em que ela só quer ver o cartão funcionando.
  const doisPrimeiros = preenchidos.slice(0, 2).map((p, i) => ({
    plate_id: plate.id, posicao: i + 1, kind: p.kind, url: p.url
  }));
  await supabase.from("plate_destinations").delete().eq("plate_id", plate.id);
  const { error: destErr } = await supabase.from("plate_destinations").insert(doisPrimeiros);
  if (destErr) {
    console.error("[trybo.ativar] destinos não gravados:", destErr);
    return res.status(500).json({
      error: "O cartão foi ativado, mas não consegui salvar os destinos. Abra o painel e configure."
    });
  }

  let resultado;
  try {
    resultado = await recalcularCartao(supabase, plate.id);
  } catch (e) {
    console.error("[trybo.ativar] recálculo falhou:", e);
    return res.status(500).json({
      error: "O cartão foi ativado, mas não consegui publicar os destinos. Abra o painel e salve de novo."
    });
  }

  return res.json({
    ok: true,
    code: plate.code,
    url: `https://trybo.co/t/${encodeURIComponent(plate.code)}`,
    negocio: negocio.name,
    destinos: resultado.destinos,
    sobraram: preenchidos.slice(2).map((p) => p.kind)
  });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const action = req.query.action;

  // Ação pública: quem acabou de receber o cartão ainda não tem conta.
  if (action === "checar-codigo") {
    // 120/hora e não 40: o freio aqui defende contra laço burro, não contra
    // atacante determinado — com 33 milhões de combinações por letra, nenhum
    // teto realista torna a sondagem viável, então apertar só atrapalha gente
    // de verdade. E há gente de verdade em volume: o cliente do Mercado Livre
    // compra um lote e distribui pra equipe, ativando vários cartões do mesmo
    // wi-fi da loja, em sequência. Um teto de 40 transformaria isso em
    // "sistema fora do ar" no pior momento possível — o primeiro contato.
    if (await limitou(req, res, { nome: "trybo-codigo", porIpHora: 120, globalDia: 2000 })) return;
    try {
      return await handleCheckarCodigo(req, res);
    } catch (e) {
      console.error("[trybo] erro:", e);
      return res.status(500).json({ error: "Erro inesperado" });
    }
  }

  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    switch (action) {
      case "ativar":          return await handleAtivar(req, res, auth.user);
      case "painel":          return await handlePainel(req, res, auth.user);
      case "renomear":        return await handleRenomear(req, res, auth.user);
      case "bloquear":        return await handleBloquear(req, res, auth.user);
      case "transferir":      return await handleTransferir(req, res, auth.user);
      case "cartao":          return await handleCartao(req, res, auth.user);
      case "salvar-destinos": return await handleSalvarDestinos(req, res, auth.user);
      case "equipe":          return await handleEquipe(req, res, auth.user);
      case "membro":          return await handleMembro(req, res, auth.user);
      case "vincular-membro": return await handleVincularMembro(req, res, auth.user);
      default:
        return res.status(400).json({
          error: "Unknown action. Use ?action=checar-codigo|ativar|painel|renomear|bloquear|transferir|cartao|salvar-destinos|equipe|membro|vincular-membro"
        });
    }
  } catch (e) {
    console.error("[trybo] erro:", e);
    return res.status(500).json({ error: e.message || "Erro inesperado" });
  }
}
