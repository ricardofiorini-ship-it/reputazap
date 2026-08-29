// ============================================================
// StarTouch — API das experiências (dispatcher por ?action=)
// ============================================================
// FECHADO NO ADMINISTRADOR (29/08/2026): o Menu Inteligente ainda não está à
// venda, então nenhum cliente deveria conseguir criar um — nem pela tela, que
// é privada, nem pela API. Ver `podeUsar` abaixo: é o único lugar a mudar
// quando o Pro abrir.
//
// Actions (todas exigem token de administrador; tudo escopado ao negócio):
//   GET  ?action=list                 → experiências + dispositivos do negócio
//   POST ?action=create               → cria experiência (nome) e devolve o id
//   POST ?action=save-draft           → grava o rascunho (id, draft)
//   POST ?action=publish              → valida e copia rascunho → publicado
//   POST ?action=discard              → joga o rascunho fora (volta ao publicado)
//   POST ?action=archive              → arquiva (nunca apaga) / desarquiva
//   POST ?action=set-device           → vincula/desvincula e liga/desliga
//   POST ?action=rename               → nome interno da experiência
//
// A FRONTEIRA DAS DUAS CAMADAS VIVE AQUI:
//   `experiences.draft/published` só é escrito por AÇÃO DO LOJISTA (as actions
//   acima). Nenhuma rotina de cobrança, cron ou downgrade chega neste arquivo.
//   `plates.served_*` é sempre recalculado por `reimprimir()` — derivado,
//   descartável, reconstruível.
//
// INERTE ATÉ A FASE 2 TERMINAR: nada disso muda o que o consumidor encontra.
// O `api/r/[code].js` ainda não lê `served_mode` — ele passa a ler no ÚLTIMO
// commit da fase, sozinho. Até lá, publicar e ligar interruptor escrevem no
// banco e o mundo real segue idêntico.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import {
  normalizarExperiencia, validarParaPublicar, montarPublicado,
  rascunhoInicial, tamanhoOk, LIMITES, TIPOS
} from "./_lib/menu.js";
import { resolvePlano, decidirServido } from "./_lib/plan.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NOME = 60;
const MAX_EXPERIENCIAS = 20;   // teto de sanidade; não é limite de produto

// ── QUEM PODE USAR O MENU INTELIGENTE ───────────────────────
// Hoje: só o administrador. O painel V3 é privado, mas o portão de lá é da
// TELA — estes endpoints só pediam um token válido. Enquanto o /r/CODE não
// lia o snapshot, isso não tinha consequência; a partir do momento em que ele
// lê, um menu criado por fora passaria a ser SERVIDO de verdade, no balcão de
// um cliente. Trava aqui transforma "só o Ricardo, na prática" em "só o
// Ricardo, por construção".
//
// QUANDO O PRO ENTRAR À VENDA, é esta função que muda: sai a lista de
// e-mails, entra `resolvePlano(biz, email).proAtivo`. Um lugar só, de
// propósito — espalhar a regra por oito actions é como se esquece uma.
const ADMIN_EMAILS = new Set(["ricardo.fiorini@gmail.com"]);

function podeUsar(user) {
  return ADMIN_EMAILS.has((user?.email || "").toLowerCase().trim());
}

async function autenticar(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return { erro: "Token obrigatório", status: 401 };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { erro: "Token inválido", status: 401 };
  return { user: data.user };
}

// O negócio do usuário. Toda action passa por aqui — é o que garante que
// ninguém alcança experiência alheia mesmo conhecendo o id.
async function negocioDo(user) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, place_id, plan, stripe_current_period_end, trial_ends_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

// Busca a experiência CONFERINDO o dono. Devolve null pra experiência alheia —
// 404 e não 403, pelo mesmo motivo do feedback.js: 403 confirmaria que aquele
// id existe.
async function experienciaDo(biz, id) {
  if (!UUID_RE.test(String(id || ""))) return null;
  const { data, error } = await supabase
    .from("experiences").select("*").eq("id", id).eq("business_id", biz.id).maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

// ── Endereço público ────────────────────────────────────────
// Sufixo aleatório de propósito: slug adivinhável ("cafe-central") permite
// montar por tentativa a lista de todos os nossos clientes. O menu é público;
// a nossa carteira não é.
function gerarSlug(nome) {
  const base = String(nome || "menu")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 32) || "menu";
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  let sufixo = "";
  for (let i = 0; i < 6; i++) sufixo += a[Math.floor(Math.random() * a.length)];
  return `${base}-${sufixo}`;
}

// ============================================================
// A IMPRESSÃO (camada 1 → camada 2)
// ============================================================
// Recalcula `served_*` dos dispositivos do negócio. Único escritor desses
// campos em todo o produto. É idempotente por construção: rodar duas vezes
// seguidas dá o mesmo resultado, e apagar tudo e rodar de novo reconstrói
// igual — é o que prova que a camada 2 não guarda nada de autoral.
async function reimprimir(biz, user) {
  const resolucao = resolvePlano(biz, user?.email || null);

  const [{ data: plates, error: e1 }, { data: exps, error: e2 }] = await Promise.all([
    supabase.from("plates")
      .select("id, experience_id, experience_enabled, served_mode, served_slug, served_reason")
      .eq("business_id", biz.id),
    supabase.from("experiences").select("id, slug, published, published_mode, archived_at").eq("business_id", biz.id)
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const porId = new Map((exps || []).map((e) => [e.id, e]));
  let mudados = 0;

  for (const p of plates || []) {
    const alvo = decidirServido({
      experiencia: p.experience_id ? porId.get(p.experience_id) || null : null,
      dispositivo: p,
      resolucao
    });
    // Só escreve o que mudou: evita encher o banco de escrita à toa e mantém
    // `served_at` significando "quando o destino mudou", não "quando rodou".
    if (p.served_mode === alvo.served_mode &&
        p.served_slug === alvo.served_slug &&
        p.served_reason === alvo.served_reason) continue;

    const { error } = await supabase.from("plates")
      .update({ ...alvo, served_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) console.error("[experiences] falha ao reimprimir dispositivo", p.id, error.message);
    else mudados++;
  }
  return mudados;
}

// ============================================================
// Actions
// ============================================================
async function listar(req, res, biz, user) {
  const [{ data: exps, error: e1 }, { data: plates, error: e2 }] = await Promise.all([
    supabase.from("experiences")
      .select("id, name, slug, draft, published, published_mode, published_at, draft_updated_at, archived_at, created_at")
      .eq("business_id", biz.id).order("created_at", { ascending: true }),
    supabase.from("plates")
      .select("id, code, product_type, channel_name, status, experience_id, experience_enabled, served_mode, served_reason, total_taps, last_tapped_at")
      .eq("business_id", biz.id).eq("status", "active").order("activated_at", { ascending: false })
  ]);
  if (e1) return res.status(500).json({ error: e1.message });
  if (e2) return res.status(500).json({ error: e2.message });

  const resolucao = resolvePlano(biz, user.email);
  return res.json({
    ok: true,
    plano: resolucao,
    negocio: { id: biz.id, name: biz.name, place_id: biz.place_id },
    experiences: exps || [],
    devices: plates || [],
    limites: LIMITES,
    // A biblioteca viaja daqui pro editor de propósito: se o front tivesse a
    // própria cópia, um dia elas discordariam — e a que vale é esta, porque é
    // ela que valida na publicação.
    tipos: TIPOS
  });
}

async function criar(req, res, biz) {
  const { count } = await supabase.from("experiences")
    .select("id", { count: "exact", head: true })
    .eq("business_id", biz.id).is("archived_at", null);
  if ((count || 0) >= MAX_EXPERIENCIAS) {
    return res.status(400).json({ error: `Você já tem ${MAX_EXPERIENCIAS} experiências ativas. Arquive alguma para criar outra.` });
  }

  // O NOME É INTERNO — só o gestor vê, e serve pra diferenciar menus no
  // painel ("Menu da Mesa" x "Cartão da Mariana"). Não confundir com o
  // TÍTULO, que é o que o cliente lê no topo da página. Por isso o padrão é
  // numerado e neutro: nomear é decisão dele, não nossa.
  const nome = String(req.body?.name || "").trim().slice(0, MAX_NOME) || `Menu ${(count || 0) + 1}`;

  const draft = rascunhoInicial({ nomeDoNegocio: biz.name });

  // Colisão de slug é improvável (6 caracteres aleatórios), mas "improvável"
  // não é "impossível" — e o erro apareceria como falha genérica. Tenta 3x.
  let criada = null, ultimoErro = null;
  for (let i = 0; i < 3 && !criada; i++) {
    const { data, error } = await supabase.from("experiences").insert({
      business_id: biz.id, name: nome, slug: gerarSlug(nome), draft, published_mode: null
    }).select().single();
    if (error) { ultimoErro = error; continue; }
    criada = data;
  }
  if (!criada) return res.status(500).json({ error: ultimoErro?.message || "Não foi possível criar." });
  return res.json({ ok: true, experience: criada });
}

async function salvarRascunho(req, res, biz) {
  const exp = await experienciaDo(biz, req.body?.id);
  if (!exp) return res.status(404).json({ error: "Experiência não encontrada." });

  const draft = normalizarExperiencia(req.body?.draft);
  if (!tamanhoOk(draft)) return res.status(400).json({ error: "Este menu ficou grande demais. Remova alguma ação." });

  const { data, error } = await supabase.from("experiences")
    .update({ draft, draft_updated_at: new Date().toISOString() })
    .eq("id", exp.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  // Rascunho NÃO reimprime nada: o que está no ar continua sendo o publicado.
  return res.json({ ok: true, experience: data, validacao: validarParaPublicar(draft) });
}

async function publicar(req, res, biz, user) {
  const exp = await experienciaDo(biz, req.body?.id);
  if (!exp) return res.status(404).json({ error: "Experiência não encontrada." });

  const veredito = validarParaPublicar(exp.draft);
  if (!veredito.podePublicar) {
    // Recusa com a lista do que corrigir. Publicar removendo os quebrados em
    // silêncio faria o lojista ver cinco botões e o cliente encontrar quatro.
    return res.status(400).json({ error: "Corrija as ações abaixo antes de publicar.", validacao: veredito });
  }

  const published = montarPublicado(exp.draft);
  const { data, error } = await supabase.from("experiences").update({
    published,
    published_mode: published.mode,
    published_at: new Date().toISOString(),
    published_by: user.id
  }).eq("id", exp.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  const mudados = await reimprimir(biz, user);
  return res.json({ ok: true, experience: data, validacao: veredito, dispositivos_atualizados: mudados });
}

async function descartar(req, res, biz) {
  const exp = await experienciaDo(biz, req.body?.id);
  if (!exp) return res.status(404).json({ error: "Experiência não encontrada." });
  // Descartar volta ao publicado. Sem publicado, volta ao rascunho inicial —
  // nunca deixa a pessoa com uma tela vazia sem entender o que aconteceu.
  const draft = exp.published ? normalizarExperiencia(exp.published) : rascunhoInicial({ nomeDoNegocio: biz.name });
  const { data, error } = await supabase.from("experiences")
    .update({ draft, draft_updated_at: new Date().toISOString() })
    .eq("id", exp.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, experience: data });
}

async function arquivar(req, res, biz, user) {
  const exp = await experienciaDo(biz, req.body?.id);
  if (!exp) return res.status(404).json({ error: "Experiência não encontrada." });
  const arquivar = req.body?.undo !== true;
  const { data, error } = await supabase.from("experiences")
    .update({ archived_at: arquivar ? new Date().toISOString() : null })
    .eq("id", exp.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  // Arquivar NÃO apaga: os dispositivos apenas voltam ao Google Direto, com
  // motivo `experiencia_removida`, e desarquivar traz tudo de volta.
  const mudados = await reimprimir(biz, user);
  return res.json({ ok: true, experience: data, dispositivos_atualizados: mudados });
}

async function renomear(req, res, biz) {
  const exp = await experienciaDo(biz, req.body?.id);
  if (!exp) return res.status(404).json({ error: "Experiência não encontrada." });
  const nome = String(req.body?.name || "").trim().slice(0, MAX_NOME);
  if (!nome) return res.status(400).json({ error: "Dê um nome à experiência." });
  // Só o nome interno muda. O slug NUNCA muda depois de criado: ele já pode
  // estar gravado num chip, num QR impresso ou na bio de alguém.
  const { data, error } = await supabase.from("experiences")
    .update({ name: nome }).eq("id", exp.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, experience: data });
}

// Vincular/desvincular experiência e ligar/desligar o interruptor.
// As duas coisas na mesma action de propósito: "vincular e ligar" é um gesto
// só na cabeça do lojista, e separar viraria a chatice de dois passos que o
// DEFAULT false criaria.
async function definirDispositivo(req, res, biz, user) {
  const { plate_id, experience_id, enabled } = req.body || {};
  if (!UUID_RE.test(String(plate_id || ""))) return res.status(400).json({ error: "Dispositivo inválido." });

  const { data: plate, error: eP } = await supabase.from("plates")
    .select("id, business_id, experience_id").eq("id", plate_id).eq("business_id", biz.id).maybeSingle();
  if (eP) return res.status(500).json({ error: eP.message });
  if (!plate) return res.status(404).json({ error: "Dispositivo não encontrado." });

  const patch = {};
  if (experience_id !== undefined) {
    if (experience_id === null) {
      patch.experience_id = null;
      patch.experience_enabled = false;   // sem experiência, ligado não significa nada
    } else {
      const exp = await experienciaDo(biz, experience_id);
      if (!exp) return res.status(404).json({ error: "Experiência não encontrada." });

      // UM DISPOSITIVO SERVE UMA EXPERIÊNCIA. Não é política nossa: ele é um
      // ponto físico com um destino só. Mas roubar o dispositivo de outro menu
      // em silêncio faria o menu antigo perder um ponto de contato sem ninguém
      // dizer nada — e o dono só descobriria pelo gráfico caindo. Exige gesto
      // explícito (`mover: true`), pelo mesmo motivo do DEFAULT false: falhar
      // fechado quando a intenção não está clara.
      if (plate.experience_id && plate.experience_id !== exp.id && req.body?.mover !== true) {
        const { data: atual } = await supabase.from("experiences")
          .select("id, name").eq("id", plate.experience_id).maybeSingle();
        return res.status(409).json({
          error: `Este dispositivo já está vinculado a “${atual?.name || "outra experiência"}”.`,
          conflito: { experience_id: plate.experience_id, name: atual?.name || null }
        });
      }
      patch.experience_id = exp.id;
    }
  }
  if (enabled !== undefined) patch.experience_enabled = enabled === true;
  if (!Object.keys(patch).length) return res.status(400).json({ error: "Nada a alterar." });

  const { error } = await supabase.from("plates").update(patch).eq("id", plate.id);
  if (error) return res.status(500).json({ error: error.message });

  const mudados = await reimprimir(biz, user);
  const { data: atualizado } = await supabase.from("plates")
    .select("id, code, channel_name, product_type, experience_id, experience_enabled, served_mode, served_reason")
    .eq("id", plate.id).maybeSingle();
  return res.json({ ok: true, device: atualizado, dispositivos_atualizados: mudados });
}

// ============================================================
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action || req.query.a;

  try {
    const auth = await autenticar(req);
    if (auth.erro) return res.status(auth.status).json({ error: auth.erro });

    // 404 e não 403: 403 confirmaria que estes endereços existem e fazem algo.
    // Mesma escolha do feedback.js e dos diagnósticos do billing.
    if (!podeUsar(auth.user)) {
      console.warn(`[experiences] acesso negado a "${action}" para ${auth.user?.email || "?"}`);
      return res.status(404).json({ error: "Not found" });
    }

    const biz = await negocioDo(auth.user);
    if (!biz) return res.status(404).json({ error: "Nenhum negócio cadastrado nesta conta." });

    if (action === "list"       && req.method === "GET")  return await listar(req, res, biz, auth.user);
    if (action === "create"     && req.method === "POST") return await criar(req, res, biz);
    if (action === "save-draft" && req.method === "POST") return await salvarRascunho(req, res, biz);
    if (action === "publish"    && req.method === "POST") return await publicar(req, res, biz, auth.user);
    if (action === "discard"    && req.method === "POST") return await descartar(req, res, biz);
    if (action === "archive"    && req.method === "POST") return await arquivar(req, res, biz, auth.user);
    if (action === "rename"     && req.method === "POST") return await renomear(req, res, biz);
    if (action === "set-device" && req.method === "POST") return await definirDispositivo(req, res, biz, auth.user);

    return res.status(400).json({
      error: "Action não reconhecida. Use list | create | save-draft | publish | discard | archive | rename | set-device."
    });
  } catch (err) {
    console.error("[experiences] erro não tratado:", err);
    if (!res.headersSent) return res.status(500).json({ error: err?.message || "Erro interno" });
  }
}
