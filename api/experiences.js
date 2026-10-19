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
//   `plates.served_*` é sempre recalculado por `reimprimir()` (mora em
//   _lib/imprimir.js, compartilhado com a varredura) — derivado,
//   descartável, reconstruível.
//
// INERTE ATÉ A FASE 2 TERMINAR: nada disso muda o que o consumidor encontra.
// O `api/r/[code].js` ainda não lê `served_mode` — ele passa a ler no ÚLTIMO
// commit da fase, sozinho. Até lá, publicar e ligar interruptor escrevem no
// banco e o mundo real segue idêntico.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import {
  normalizarExperiencia, validarParaPublicar, montarPublicado, estaPendente,
  rascunhoInicial, tamanhoOk, LIMITES, TIPOS
} from "./_lib/menu.js";
import { resolvePlano, podeUsarMenu } from "./_lib/plan.js";
import { reimprimir } from "./_lib/imprimir.js";
import { soStartouch, LINHA_STARTOUCH } from "./_lib/linha.js";
import { contarComMenu, exigeConfirmacao, sincronizarExtras, resumoDoLimite } from "./_lib/menu-extras.js";
import { sendTransactionalEmail } from "./_lib/email-sender.js";
import { iniciarTesteSemCheckout } from "./_lib/stripe-pro.js";

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

// ── O INTERRUPTOR DE LANÇAMENTO ──
// `true` = só o administrador entra (beta fechado, estado atual).
// `false` = qualquer cliente logado MONTA o menu; publicar exige Pro.
//
// Trocar esta linha é o ato que coloca o Menu Inteligente à venda. Está
// sozinha aqui, e não espalhada por oito actions, porque regra de acesso
// espalhada é regra da qual um dia se esquece um pedaço.
const BETA_SO_ADMIN = false;

// Contas que entram no beta SEM ser administrador. Existe por um motivo
// específico: o administrador é sempre Pro (atalho no resolvePlano), então
// ele nunca vê a caixa da assinatura nem passa pelo pagamento — a única
// coisa que não dá pra testar sendo dono da casa é justamente a cobrança.
//
// Esta lista é temporária e não é um plano gratuito disfarçado: quem está
// aqui é cliente comum para todos os efeitos, cai no paywall e paga de
// verdade. Some quando BETA_SO_ADMIN virar false.
const BETA_TESTERS = new Set(["ricardo@gt6.com.br"]);

function podeUsar(user) {
  if (!BETA_SO_ADMIN) return true;
  const email = (user?.email || "").toLowerCase().trim();
  return ADMIN_EMAILS.has(email) || BETA_TESTERS.has(email);
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
    .select("id, name, place_id, plan, stripe_current_period_end, trial_ends_at, stripe_subscription_id, stripe_cancel_at_period_end, stripe_customer_id")
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

// ── AVISO AO ADMIN: QUEM ESTÁ MEXENDO NO MENU (14/10/2026) ──
// O aviso do Pro (billing.js) só sai quando alguém INICIA o teste no Stripe.
// Quem monta o menu e para na cobrança não deixava rastro nenhum — e em
// 14/10 a consulta mostrou 19 negócios assim, invisíveis. São os contatos
// mais quentes da base: já mostraram que querem o produto.
// Um aviso por negócio por tipo (dedupe por biz_id). Nunca derruba a ação
// do cliente: qualquer falha vira log.
const AVISO_MENU = {
  criou:    { tipo: "admin_menu_criado",   emoji: "🧩", titulo: "Montou um Menu Inteligente" },
  cobranca: { tipo: "admin_menu_cobranca", emoji: "💳", titulo: "Tentou publicar o Menu e parou na cobrança" },
  teste:    { tipo: "admin_menu_teste",    emoji: "🧪", titulo: "Publicou o Menu — teste de 7 dias começou" },
};
const escHtml = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function avisaAdminMenu(qual, { biz, user, exp, detalhe = "" }) {
  try {
    const to = process.env.ADMIN_NOTIFICATIONS_EMAIL;
    if (!to) { console.warn(`[experiences/admin] ADMIN_NOTIFICATIONS_EMAIL não setado — aviso "${qual}" pulado`); return; }
    if (!user?.id || ADMIN_EMAILS.has(String(user.email || "").toLowerCase())) return;
    const cfg = AVISO_MENU[qual];

    const { count: dispositivos } = await soStartouch(supabase.from("plates").select("id", { count: "exact", head: true }))
      .eq("business_id", biz.id).eq("status", "active");
    const meta = user.user_metadata || {};
    const nome = meta.name || meta.full_name || "—";
    const fone = meta.phone || "";
    const digitos = String(fone).replace(/\D/g, "");
    const zap = digitos.length >= 10 ? `https://wa.me/${digitos.startsWith("55") ? digitos : "55" + digitos}` : null;

    const html = `<h2>${cfg.emoji} ${cfg.titulo}</h2>
<p><strong>Negócio:</strong> ${escHtml(biz.name || "—")}</p>
<p><strong>Cliente:</strong> ${escHtml(nome)} &lt;${escHtml(user.email || "—")}&gt;</p>
<p><strong>Telefone:</strong> ${escHtml(fone || "—")}${zap ? ` — <a href="${zap}">abrir no WhatsApp</a>` : ""}</p>
<p><strong>Menu:</strong> ${escHtml(exp?.name || "—")}</p>
<p><strong>Dispositivos ativos:</strong> ${dispositivos ?? "—"}</p>
${qual === "cobranca" ? "<p>O rascunho está salvo. Falta assinar o Pro pra ir ao ar.</p>"
  : qual === "teste" ? "<p>O menu já está no ar, sem cartão. Se não cadastrar o cartão até o fim dos 7 dias, a assinatura se encerra sozinha e o menu volta pro Google.</p>"
  : "<p>Ainda não publicou.</p>"}
${detalhe ? `<p><strong>Atenção:</strong> ${escHtml(detalhe)}</p>` : ""}`;

    const r = await sendTransactionalEmail({
      userId: user.id, emailType: cfg.tipo, to,
      subject: `${cfg.emoji} ${cfg.titulo} — ${biz.name || nome}`,
      html,
      metadata: { biz_id: biz.id, experience_id: exp?.id || null },
      dedupeByMetadata: { key: "biz_id", value: biz.id },
    });
    console.log(`[experiences/admin] ${qual} (${biz.name || biz.id}): ${r?.sent ? "enviado" : (r?.reason || r?.error || "não enviado")}`);
  } catch (e) {
    console.error(`[experiences/admin] aviso "${qual}" falhou (${biz?.id}): ${e?.message}`);
  }
}

// ============================================================
// Actions
// ============================================================
async function listar(req, res, biz, user) {
  const [{ data: exps, error: e1 }, { data: plates, error: e2 }] = await Promise.all([
    supabase.from("experiences")
      .select("id, name, slug, draft, published, published_mode, published_at, draft_updated_at, archived_at, created_at")
      .eq("business_id", biz.id).order("created_at", { ascending: true }),
    // Cartão Trybo não recebe menu: ele tem destino próprio (as redes).
    soStartouch(supabase.from("plates")
      .select("id, code, product_type, channel_name, status, experience_id, experience_enabled, served_mode, served_reason, total_taps, last_tapped_at"))
      .eq("business_id", biz.id).eq("status", "active").order("activated_at", { ascending: false })
  ]);
  if (e1) return res.status(500).json({ error: e1.message });
  if (e2) return res.status(500).json({ error: e2.message });

  const resolucao = resolvePlano(biz, user.email);
  // Quantos dispositivos o Pro cobre e quantos estão em uso (_lib/menu-extras).
  const emUso = (plates || []).filter((p) => p.served_mode === "menu").length;
  return res.json({
    ok: true,
    plano: { ...resolucao, menu: resumoDoLimite(biz, user.email, emUso) },
    negocio: { id: biz.id, name: biz.name, place_id: biz.place_id },
    // `pendente` vem do servidor porque é ele quem monta o publicado. Se a
    // tela tentasse deduzir isso comparando rascunho com publicado, erraria
    // sempre — o publicado é uma versão filtrada do rascunho.
    experiences: (exps || []).map((e) => ({ ...e, pendente: estaPendente(e.draft, e.published) })),
    devices: plates || [],
    limites: LIMITES,
    // A biblioteca viaja daqui pro editor de propósito: se o front tivesse a
    // própria cópia, um dia elas discordariam — e a que vale é esta, porque é
    // ela que valida na publicação.
    tipos: TIPOS
  });
}

async function criar(req, res, biz, user) {
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
  await avisaAdminMenu("criou", { biz, user, exp: criada });
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
  return res.json({
    ok: true,
    experience: { ...data, pendente: estaPendente(data.draft, data.published) },
    validacao: validarParaPublicar(draft)
  });
}

// PUBLICAR É A ÚNICA AÇÃO PAGA. Criar, editar, salvar rascunho e ver a prévia
// seguem livres de propósito: é montando o menu que a pessoa entende o que
// está comprando, e é com ele montado que ela decide pagar. Trancar antes
// disso seria cobrar por uma coisa que ninguém viu funcionar.
//
// A trava mora AQUI, no servidor, e não na caixa que a tela abre. Modal é
// aviso; quem impede é isto. Sem esta função, bastaria chamar a API direto.
async function publicar(req, res, biz, user) {
  const exp = await experienciaDo(biz, req.body?.id);
  if (!exp) return res.status(404).json({ error: "Experiência não encontrada." });

  // Validação e limite de dispositivos vêm ANTES do teste: abrir uma
  // assinatura pra um menu que nem vai ao ar seria cobrança sem produto.
  const veredito = validarParaPublicar(exp.draft);
  if (!veredito.podePublicar) {
    // Recusa com a lista do que corrigir. Publicar removendo os quebrados em
    // silêncio faria o lojista ver cinco botões e o cliente encontrar quatro.
    return res.status(400).json({ error: "Corrija as ações abaixo antes de publicar.", validacao: veredito });
  }

  // Passaria de 5 dispositivos com o Menu? Pergunta antes de cobrar.
  const projetado = await contarComMenu(supabase, biz.id, { publicar: exp.id });
  const pergunta = exigeConfirmacao({
    biz, email: user?.email, proAtivo: true, total: projetado, aceitaExtra: req.body?.aceitaExtra
  });
  if (pergunta) return res.status(409).json(pergunta);

  // ── SEM PRO? O TESTE COMEÇA AQUI (19/10/2026, Ricardo) ──
  // Antes: Publicar → caixa da assinatura → página do Stripe → volta. Agora:
  // Publicar → no ar, com 7 dias de teste sem cartão. O cartão só é pedido
  // pra continuar depois (painel e e-mail do Stripe 3 dias antes). Regra do
  // teste intacta — ver _lib/stripe-pro.js.
  //
  // A trava continua sendo esta função: quem já usou o teste, ou quando o
  // Stripe falha, recebe 402 e a tela abre a caixa da assinatura, como antes.
  let testeIniciado = null;
  if (!podeUsarMenu(resolvePlano(biz, user?.email || null))) {
    const { count: dispositivos } = await soStartouch(supabase.from("plates").select("id", { count: "exact", head: true }))
      .eq("business_id", biz.id).eq("status", "active");
    // Sem dispositivo, não abre assinatura (12/10, Ricardo): vender o Pro pra
    // quem não tem onde usar é reembolso e reclamação na certa. A tela já
    // barra antes; isto é a trava de verdade.
    if (!dispositivos) {
      return res.status(409).json({ error: "Para publicar, ative um dispositivo StarTouch primeiro.", semDispositivo: true });
    }

    const t = await iniciarTesteSemCheckout({ biz, user });
    if (!t.ok) {
      await avisaAdminMenu("cobranca", {
        biz, user, exp,
        detalhe: t.motivo === "erro" ? `O teste automático FALHOU no Stripe (${t.erro}). O cliente viu a caixa da assinatura.` : "Já usou o teste grátis antes: só volta pagando."
      });
      return res.status(402).json({
        error: "Publicar o Menu Inteligente exige o plano Pro.",
        precisaPro: true,
        testeUsado: t.motivo === "teste_usado",
        plano: resolvePlano(biz, user?.email || null)
      });
    }

    const fimPeriodo = t.sub?.items?.data?.[0]?.current_period_end ?? t.sub?.current_period_end ?? t.sub?.trial_end ?? null;
    const patchPlano = {
      plan: "pro",
      stripe_customer_id: t.customerId,
      stripe_subscription_id: t.sub.id,
      stripe_subscription_status: t.sub.status,
      stripe_current_period_end: fimPeriodo ? new Date(fimPeriodo * 1000).toISOString() : null,
      stripe_cancel_at_period_end: false,
    };
    const { error: ePlano } = await supabase.from("businesses").update(patchPlano).eq("id", biz.id);
    if (ePlano) {
      // O teste existe no Stripe, mas o banco não sabe: o webhook não escuta
      // `subscription.created`, então ninguém mais grava isto até o teste
      // acabar. O /m/ seguiria servindo o Google. Grita — corrigir à mão pelo
      // /admin/assinaturas, que lê o Stripe direto.
      console.error(`[experiences/teste] teste ${t.sub.id} ABERTO no Stripe mas o plano NÃO foi gravado (biz=${biz.id}): ${ePlano.message}`);
    }
    Object.assign(biz, patchPlano);
    testeIniciado = { fimDoTeste: t.fimDoTeste };
    await avisaAdminMenu("teste", { biz, user, exp });
  }

  const published = montarPublicado(exp.draft);
  const { data, error } = await supabase.from("experiences").update({
    published,
    published_mode: published.mode,
    published_at: new Date().toISOString(),
    published_by: user.id
  }).eq("id", exp.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  const mudados = await reimprimir(supabase, biz, user?.email || null);
  await sincronizarExtras(supabase, biz, user?.email || null);
  return res.json({
    ok: true,
    experience: { ...data, pendente: estaPendente(data.draft, data.published) },
    validacao: veredito,
    // Preenchido só quando ESTE publicar abriu o teste: a tela diz "seu teste
    // de 7 dias começou" em vez de só "publicado".
    teste_iniciado: testeIniciado,
    dispositivos_atualizados: mudados,
    // Quantos dispositivos passaram a abrir este menu agora — é o que a tela
    // usa pra confirmar o efeito, em vez de só dizer "publicado".
    dispositivos_com_este_menu: await (async () => {
      // linha-ok: conta dispositivos servindo menu — cartão Trybo nunca serve 'menu'
      const { count } = await supabase.from("plates")
        .select("id", { count: "exact", head: true })
        .eq("business_id", biz.id).eq("experience_id", exp.id).eq("served_mode", "menu");
      return count || 0;
    })()
  });
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
  return res.json({ ok: true, experience: { ...data, pendente: estaPendente(data.draft, data.published) } });
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
  const mudados = await reimprimir(supabase, biz, user?.email || null);
  await sincronizarExtras(supabase, biz, user?.email || null);
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
    .select("id, business_id, experience_id, linha").eq("id", plate_id).eq("business_id", biz.id).maybeSingle();
  if (eP) return res.status(500).json({ error: eP.message });
  // Ligar o menu num cartão Trybo tiraria dele o Instagram do lojista.
  if (!plate || plate.linha !== LINHA_STARTOUCH) return res.status(404).json({ error: "Dispositivo não encontrado." });

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

  // Ligar aqui passaria de 5 dispositivos com o Menu? Pergunta antes de cobrar.
  // Desligar nunca pergunta: só reduz.
  if (patch.experience_enabled === true || (patch.experience_id && patch.experience_enabled !== false)) {
    const projetado = await contarComMenu(supabase, biz.id, {
      plateId: plate.id,
      experienceId: patch.experience_id !== undefined ? patch.experience_id : undefined,
      ligado: patch.experience_enabled !== undefined ? patch.experience_enabled : undefined,
    });
    const pergunta = exigeConfirmacao({
      biz, email: user?.email, proAtivo: podeUsarMenu(resolvePlano(biz, user?.email || null)),
      total: projetado, aceitaExtra: req.body?.aceitaExtra
    });
    if (pergunta) return res.status(409).json(pergunta);
  }

  const { error } = await supabase.from("plates").update(patch).eq("id", plate.id);
  if (error) return res.status(500).json({ error: error.message });

  const mudados = await reimprimir(supabase, biz, user?.email || null);
  await sincronizarExtras(supabase, biz, user?.email || null);
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
    if (action === "create"     && req.method === "POST") return await criar(req, res, biz, auth.user);
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
