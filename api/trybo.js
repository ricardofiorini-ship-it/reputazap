// ============================================================
// TRYBO — API do cartao de redes sociais (dispatcher por ?action=)
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

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const auth = await authUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const action = req.query.action;
  try {
    switch (action) {
      case "cartao":          return await handleCartao(req, res, auth.user);
      case "salvar-destinos": return await handleSalvarDestinos(req, res, auth.user);
      case "equipe":          return await handleEquipe(req, res, auth.user);
      case "membro":          return await handleMembro(req, res, auth.user);
      case "vincular-membro": return await handleVincularMembro(req, res, auth.user);
      default:
        return res.status(400).json({
          error: "Unknown action. Use ?action=cartao|salvar-destinos|equipe|membro|vincular-membro"
        });
    }
  } catch (e) {
    console.error("[trybo] erro:", e);
    return res.status(500).json({ error: e.message || "Erro inesperado" });
  }
}
