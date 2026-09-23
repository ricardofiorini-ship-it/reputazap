// ============================================================
// TRYBO — API do cartao de redes sociais (dispatcher por ?action=)
//   checar-codigo    GET   PUBLICA -- o codigo existe e da pra ativar?
//   ativar           POST  ativa o cartao, cria a conta se preciso, grava destinos
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
    linhas.push({ plate_id: cartao.id, posicao, kind, url });
  }

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
  const { error: ativErr } = await supabase
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
    .eq("status", "in_stock");     // trava de corrida: só ativa se ainda estiver em estoque
  if (ativErr) {
    console.error("[trybo.ativar] falha ao ativar:", ativErr);
    return res.status(500).json({ error: "Não consegui ativar o cartão. Tente de novo." });
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
    if (await limitou(req, res, { nome: "trybo-codigo", porIpHora: 40, globalDia: 2000 })) return;
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
      case "cartao":          return await handleCartao(req, res, auth.user);
      case "salvar-destinos": return await handleSalvarDestinos(req, res, auth.user);
      case "equipe":          return await handleEquipe(req, res, auth.user);
      case "membro":          return await handleMembro(req, res, auth.user);
      case "vincular-membro": return await handleVincularMembro(req, res, auth.user);
      default:
        return res.status(400).json({
          error: "Unknown action. Use ?action=checar-codigo|ativar|cartao|salvar-destinos|equipe|membro|vincular-membro"
        });
    }
  } catch (e) {
    console.error("[trybo] erro:", e);
    return res.status(500).json({ error: e.message || "Erro inesperado" });
  }
}
