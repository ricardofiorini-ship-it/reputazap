// ============================================================
// StarTouch — Cron: RESUMO SEMANAL (digest) pra TODOS os clientes
// ============================================================
// Schedule: Vercel Cron — segunda-feira 12:00 UTC (~09:00 BRT) (vercel.json).
//
// Itera todos os businesses com place_id e manda o resumo semanal
// (nota, veredito, Score, marco, últimas avaliações, artigo, indicação).
// Score COMPLETO e IGUAL ao painel de verdade: a conta vem de score-core.js
// (compartilhada com src/AppV2.jsx) e a posição sai do cache da grade — nunca
// de medição nova, pra o envio semanal não virar uma conta de Places.
// Manda TAMBÉM o alerta de avaliação negativa, com as avaliações que já busca
// aqui (o cron diário que fazia isso saiu do ar em 02/ago).
//
// Respeita alert_preferences.email_enabled (default ON; opt-out via link de
// 1 clique no rodapé). Dedupe por semana (email_log) — re-rodar não duplica.
//
// Auth: Bearer ${CRON_SECRET} OU header x-vercel-cron. Chamada manual permitida.
// Params de teste: ?dry=1 (não envia, só lista) · ?limit=N (cap) ·
//   ?to=email (manda TUDO pra esse email, ignora destinatário real — debug).
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "../_lib/email-sender.js";
import {
  weeklyDigestEmail, pickWeeklyTip, emailScore, nextMilestone, latestArticle,
  // O alerta de nota baixa agora sai daqui (ver nota no loop) — o cron diário morreu.
  negativeReviewEmail
} from "../_lib/email-templates.js";
import { unsubUrl } from "../_lib/unsubscribe.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CRON_SECRET = process.env.CRON_SECRET;
const ORIGIN = process.env.PUBLIC_BASE_URL || "https://startouch.com.br";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function checkAuth(req) {
  if (req.headers["x-vercel-cron"] === "1") return true;
  if (!CRON_SECRET) return false;
  return (req.headers.authorization || "") === `Bearer ${CRON_SECRET}`;
}

// Segunda-feira (UTC) da semana atual — chave de dedupe por semana.
function weekKey() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Dom..6=Sáb
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Cabeçalho que identifica a chamada como nossa (ver _lib/rate-limit.js).
// Sem ele, 108 negócios = 108 chamadas por endpoint contra um teto de 120/hora.
const CABECALHO_INTERNO = process.env.CRON_SECRET
  ? { "x-startouch-internal": process.env.CRON_SECRET }
  : {};

// Devolve o corpo, ou um objeto com `__erro` quando a pergunta NÃO FOI FEITA.
//
// Antes isto devolvia `{}` pra qualquer falha, e o chamador traduzia o vazio
// como "sem dados do Google" — ou seja, um freio nosso, um timeout ou um 500
// viravam "esse negócio não existe no Google" e o cliente era pulado com um
// motivo errado no relatório. É a mesma confusão que já custou caro aqui
// (429 do Google virando "sem concorrente"): quem não conseguiu PERGUNTAR
// não pode reportar como se tivesse recebido um NÃO.
async function fetchJson(url) {
  try {
    const r = await fetch(url, { headers: CABECALHO_INTERNO });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) return { __erro: `HTTP ${r.status}`, __freio: r.status === 429 };
    return corpo;
  } catch (e) {
    return { __erro: e?.message || String(e) };
  }
}

// Nota <= isto conta como avaliação negativa (mesmo corte do robô diário antigo).
const NEG_MAX = 2;
// Quantas avaliações o Google devolve por negócio. É o teto que cria o risco de
// medir semanalmente: chegando mais que isso na semana, as mais antigas somem da
// lista antes de a gente olhar.
const LISTA_CHEIA = 5;

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Não autorizado. Use Bearer ${CRON_SECRET}." });
  }

  const dry = req.query.dry === "1" || req.query.dry === "true";
  const forceTo = (req.query.to || "").trim() || null;
  const limit = parseInt(req.query.limit, 10);
  const week = weekKey();
  const tip = pickWeeklyTip();
  const article = latestArticle();

  const stats = {
    week, dry, started_at: new Date().toISOString(),
    businesses: 0, sent: 0, alerts_sent: 0, lista_cheia: 0, skipped_disabled: 0, skipped_dedupe: 0,
    skipped_no_email: 0, nao_consegui_perguntar: 0, barrados_pelo_freio: 0, serie_gravada: 0, serie_pronta: null, marco_contraditorio: 0, freio_do_resend: 0,
    errors: [], recipients: [], took_ms: 0
  };
  const t0 = Date.now();

  // Businesses com place_id
  const { data: businesses, error: bizErr } = await supabase
    .from("businesses")
    // `total_reviews` e o MARCO ZERO: quantas avaliacoes o negocio tinha no dia
    // em que foi vinculado a conta. Gravado pelo savebiz e nunca mais tocado por
    // ninguem (varrido em api/ e src/ em 11/09/2026) — por isso serve de partida.
    .select("id, place_id, name, user_id, plan, total_reviews, rating, created_at")
    .not("place_id", "is", null);
  if (bizErr) return res.status(500).json({ error: bizErr.message });

  // Emails dos donos + preferências
  const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map((usersList?.users || []).map((u) => [u.id, u.email]));
  const userIds = [...new Set((businesses || []).map((b) => b.user_id))];
  const { data: prefsRows } = await supabase
    .from("alert_preferences")
    .select("user_id, email_enabled, email_to")
    .in("user_id", userIds);
  const prefsById = new Map((prefsRows || []).map((p) => [p.user_id, p]));

  // ── TOQUES DA SEMANA + quem tem dispositivo ─────────────────────────
  // Tudo de uma vez, ANTES do laço. Uma consulta por negócio acrescentaria 108
  // idas ao banco numa função que já roda a ~1,8s por cliente e tem duas
  // paredes à vista (5 min de execução; 120 chamadas/hora). Aqui o custo é
  // fixo: não cresce quando a base cresce.
  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  // Paginado de propósito: o cliente do Supabase corta em 1.000 linhas e não
  // avisa. Sem paginar, a partir de 1.000 toques por semana o número do e-mail
  // começaria a ser MENOR que a verdade, em silêncio, e ninguém suspeitaria de
  // um número plausível.
  async function todasAsLinhas(nome, monta) {
    const linhas = [];
    for (let pagina = 0; pagina < 50; pagina++) {
      const de = pagina * 1000;
      const { data, error } = await monta().range(de, de + 999);
      if (error) {
        console.warn(`[weekly-digest] ${nome} indisponível: ${error.message} — o bloco de dispositivos sai do e-mail desta semana.`);
        return { linhas, falhou: true };
      }
      linhas.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    return { linhas, falhou: false };
  }

  const rToques = await todasAsLinhas("toques", () =>
    supabase.from("plate_taps").select("business_id").gte("tapped_at", seteDiasAtras));
  const rPlacas = await todasAsLinhas("dispositivos", () =>
    supabase.from("plates").select("business_id, activated_at").eq("status", "active"));

  const tapsPorBiz = new Map();
  for (const l of rToques.linhas) {
    if (!l.business_id) continue;
    tapsPorBiz.set(l.business_id, (tapsPorBiz.get(l.business_id) || 0) + 1);
  }
  const comDispositivo = new Set(rPlacas.linhas.map((l) => l.business_id).filter(Boolean));

  // Se a leitura falhou, o bloco NÃO SAI — em vez de sair dizendo "nenhum
  // toque registrado" pra quem teve toques. Número errado num boletim semanal
  // custa mais caro que bloco ausente: o cliente que sabe que teve movimento
  // conclui que a medição não presta, e aí não acredita em mais nada no e-mail.
  // Primeira ativacao de cada negocio — decide a FRASE do marco zero.
  const primeiraAtivacao = new Map();
  for (const l of rPlacas.linhas) {
    if (!l.business_id || !l.activated_at) continue;
    const atual = primeiraAtivacao.get(l.business_id);
    if (!atual || l.activated_at < atual) primeiraAtivacao.set(l.business_id, l.activated_at);
  }

  const dadosDeDispositivoOk = !rToques.falhou && !rPlacas.falhou;
  stats.com_dispositivo = comDispositivo.size;
  stats.toques_na_semana = rToques.linhas.length;

  let list = businesses || [];
  if (Number.isFinite(limit) && limit > 0) list = list.slice(0, limit);

  // Log de PARTIDA. O relatório final só é escrito na última linha do handler:
  // se a função for cortada no meio (tempo máximo de execução), ele não sai, e
  // a ausência fica idêntica a um dia normal. Com esta linha, "começou 108 e
  // nunca concluiu" é visível no log — que é como a truncagem vai aparecer
  // quando a base crescer o bastante pra encostar nos 5 minutos.
  console.log(`[cron/weekly-digest] começando: ${list.length} negócios, semana ${week}${dry ? " (dry)" : ""}`);

  // ── A SERIE (11/09/2026) ────────────────────────────────────────────
  // Este cron ja pergunta ao Google a nota e o total de CADA negocio toda
  // segunda — e jogava fora depois de montar o e-mail. Agora grava. Nenhuma
  // chamada nova, nenhum gasto novo: e o mesmo aproveitamento que aposentou o
  // robo diario de avaliacoes em agosto.
  //
  // Por que importa: `businesses.total_reviews` da a ponta de LA e o Google da
  // a ponta de CA — e nao existia nada no meio. A tabela que teria o meio
  // (`competitor_snapshots`) depende de um cron PAUSADO desde 21/06/2026.
  // Passado nao volta; o que da pra fazer e parar de perder o presente.
  const diaDaMedicao = new Date().toISOString().slice(0, 10);
  let avisouSerie = false;

  // PROVA QUE A TABELA EXISTE, e prova ANTES de precisar dela. Sem esta sonda,
  // a unica forma de descobrir que o SQL nao foi rodado seria na segunda de
  // manha — com uma semana de historico ja perdida. Uma leitura de uma linha
  // custa nada e responde a pergunta "esta ligado?" logo na abertura, que e o
  // padrao da casa: protecao que nao prova que esta de pe nao e protecao.
  //
  // Vale tambem como preflight: `?dry=1&limit=1` passa por aqui e devolve
  // `serie_pronta` sem enviar um unico e-mail.
  {
    const { error } = await supabase.from("review_history").select("id").limit(1);
    stats.serie_pronta = !error;
    if (error) {
      console.warn(
        `[weekly-digest] review_history INDISPONIVEL: ${error.message}. ` +
        `Rode supabase/schema-historico-avaliacoes.sql — a serie nao sera gravada esta semana.`
      );
    }
  }

  async function gravaSerie(businessId, rating, reviews) {
    if (dry || stats.serie_pronta === false) return;
    const { error } = await supabase
      .from("review_history")
      .upsert(
        { business_id: businessId, on_date: diaDaMedicao, rating: rating ?? null, reviews },
        { onConflict: "business_id,on_date", ignoreDuplicates: true }
      );
    if (error) {
      // GRITA UMA VEZ, e nao a cada negocio. Sem a tabela o grafico de evolucao
      // nasce vazio meses depois, sem ninguem lembrar do dia em que parou de
      // gravar — que e exatamente como esse tipo de coisa custa caro aqui.
      if (!avisouSerie) {
        avisouSerie = true;
        console.warn(
          `[weekly-digest] NAO CONSEGUI GRAVAR A SERIE: ${error.message}. ` +
          `Rode supabase/schema-historico-avaliacoes.sql — sem a tabela, cada ` +
          `segunda-feira que passa e uma semana de historico perdida pra sempre.`
        );
      }
      return;
    }
    stats.serie_gravada++;
  }

  // ── DUAS VELOCIDADES (11/09/2026) ───────────────────────────────────
  // Medido hoje: 118 negocios x ~1,8s em fila indiana = ~212s de um teto de
  // 300s. 70% gasto, e a base cresceu 10 SO HOJE. Quando estourar, a funcao e
  // cortada no meio: os ultimos da fila nao recebem nada e o relatorio final
  // nem chega a ser escrito — so o log de partida denuncia.
  //
  // As duas metades do trabalho tem limites OPOSTOS, e por isso correm em
  // velocidades diferentes:
  //
  //   BUSCAR no Google  → o gargalo e a espera da rede. Cinco ao mesmo tempo
  //                        cortam o tempo por cinco e nao incomodam ninguem.
  //   ENVIAR pelo Resend → o gargalo e a COTA DELES (~2 por segundo). Cinco ao
  //                        mesmo tempo viram 429, e um 429 aqui nao e lentidao:
  //                        e cliente que nao recebe o e-mail da semana.
  //
  // Por isso a busca ganha um pool e o envio ganha um FREIO — uma fila unica,
  // espacada, com uma retentativa quando o Resend reclamar. Nunca paralelizar
  // o envio junto com a busca: era esse o erro obvio a evitar aqui.
  const CONCORRENCIA = 5;
  const INTERVALO_ENVIO_MS = 220;

  async function comPool(itens, n, fn) {
    let proximo = 0;
    const linhas = Array.from({ length: Math.min(n, itens.length) }, async () => {
      while (proximo < itens.length) await fn(itens[proximo++]);
    });
    await Promise.all(linhas);
  }

  let filaEnvio = Promise.resolve();
  let ultimoEnvio = 0;

  // Serializa TODO envio num canal so, espacado. Vale tambem pro alerta de
  // avaliacao negativa, que sai pelo mesmo Resend e entraria na disputa.
  function enviaComFreio(opts) {
    const tarefa = filaEnvio.then(async () => {
      const espera = INTERVALO_ENVIO_MS - (Date.now() - ultimoEnvio);
      if (espera > 0) await sleep(espera);
      ultimoEnvio = Date.now();
      let r = await sendTransactionalEmail(opts);
      // 429 do Resend vira e-mail perdido em silencio se ninguem reagir. Uma
      // retentativa mais lenta resolve o caso comum (rajada) sem mascarar um
      // problema real: se falhar de novo, o erro vai pro relatorio como antes.
      if (r?.error && /rate|429|too many/i.test(String(r.error))) {
        stats.freio_do_resend++;
        await sleep(1200);
        ultimoEnvio = Date.now();
        r = await sendTransactionalEmail(opts);
      }
      return r;
    });
    // A fila nao pode morrer num erro: sem este catch, uma falha isolada
    // deixaria todos os proximos envios pendurados pra sempre.
    filaEnvio = tarefa.then(() => {}, () => {});
    return tarefa;
  }

  await comPool(list, CONCORRENCIA, async (biz) => {
    stats.businesses++;
    try {
      // As duas razoes pra NAO mandar e-mail sao resolvidas aqui, mas so
      // aplicadas la embaixo, DEPOIS de medir e gravar a serie. "Nao quero
      // e-mail" nao e "nao quero que meu negocio seja medido": o historico
      // alimenta o painel dele, nao a caixa de entrada. Preco: 2 consultas ao
      // Google por negocio que optou por sair — hoje sao zero pessoas.
      const prefs = prefsById.get(biz.user_id);
      const optOut = !!(prefs && prefs.email_enabled === false);
      const to = forceTo || (prefs?.email_to || "").trim() || emailById.get(biz.user_id);

      // Dados reais (mesmas fontes do painel).
      //
      // A POSIÇÃO saiu do `/api/diagnostico` (02/ago). Aquela é a arena antiga —
      // um raio só, ordem crua do Google — que o painel parou de usar por se
      // contradizer com a tela. Era a causa de o email dizer Score 59 enquanto o
      // painel mostrava 74 pro mesmo negócio.
      //
      // Agora lê a GRADE, mas SÓ DO CACHE, nunca disparando medição nova: um
      // `?grid=1` aqui custaria 5 consultas por negócio por semana (55 negócios
      // = ~R$48 por envio) e jogaria fora justamente a economia que esta
      // mudança busca. Sem cache fresco → o email simplesmente não fala de
      // posição, em vez de inventar um número.
      const pid = encodeURIComponent(biz.place_id);
      const [rv, bi, gridRow] = await Promise.all([
        fetchJson(`${ORIGIN}/api/reviews?place_id=${pid}`),
        fetchJson(`${ORIGIN}/api/bizinfo?place_id=${pid}`),
        supabase.from("ranking_grid_cache")
          .select("result, created_at")
          .eq("place_id", biz.place_id)
          .order("created_at", { ascending: false })
          .limit(1).maybeSingle()
          .then((r) => {
            if (r.error) { console.warn(`[weekly-digest] cache da grade indisponível: ${r.error.message}`); return null; }
            if (!r.data) return null;
            // Mais velho que 7 dias é medição vencida — trata como "não sei".
            if (Date.now() - new Date(r.data.created_at).getTime() > 7 * 24 * 3600 * 1000) return null;
            return r.data.result || null;
          })
          .catch(() => null),
      ]);
      // `score` E NAO `avg` — corrigido em 06/09/2026. A grade devolve os dois
      // (ver _lib/competitors.js:1336): `avg` e a media crua dos pontos em que
      // o negocio APARECE, e `score` conta cada ausencia como 21a posicao.
      //
      // Com `avg`, este e-mail era CEGO AO DESAPARECIMENTO. Medido: com nota e
      // avaliacoes fixas, um negocio que aparece em 5 de 5 pontos e outro que
      // aparece em 1 de 5 recebiam o MESMO score (78), porque a media de quem
      // some de quatro lugares e calculada so no lugar que sobrou. O painel,
      // que usa `score`, dava 78 e 63 nos mesmos casos.
      //
      // Ou seja: o resumo semanal — a peca que chega sozinha ao cliente toda
      // semana — dizia "esta tudo bem" justamente para quem estava sumindo do
      // Google. Nao era so divergir do painel; era elogiar o problema.
      const gridAvg = (gridRow && gridRow.coverage > 0 && gridRow.score != null) ? gridRow.score : null;
      const gridSemCobertura = !!(gridRow && gridRow.measured > 0 && gridRow.coverage === 0);
      // Cobertura parcial: sem isto, quem some de ALGUNS pontos ve o numero
      // cair sem uma linha explicando por que.
      const gridCobertura = gridRow?.coverage ?? null;
      const gridMedidos = gridRow?.measured ?? null;
      // Duas coisas MUITO diferentes, que antes eram a mesma linha:
      //   1. não consegui perguntar  → problema NOSSO, o cliente existe
      //   2. perguntei e não voltou nada → ficha do Google sumiu/place_id errado
      if (rv?.__erro) {
        stats.nao_consegui_perguntar++;
        if (rv.__freio) {
          stats.barrados_pelo_freio++;
          if (stats.barrados_pelo_freio === 1) {
            console.warn(
              `[weekly-digest] LEVEI 429 DO NOSSO PRÓPRIO SITE. O cabeçalho interno ` +
              `não está sendo aceito (CRON_SECRET ausente ou diferente do que o ` +
              `endpoint espera). A partir daqui os clientes começam a ser PULADOS.`
            );
          }
        }
        stats.errors.push({ business_id: biz.id, error: `não consegui consultar: ${rv.__erro}` });
        return;
      }
      if (!rv.name && !rv.rating) {
        stats.errors.push({ business_id: biz.id, error: "sem dados do Google" });
        return;
      }

      const reviews = Array.isArray(rv.reviews) ? rv.reviews : [];
      const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
      const newThisWeek = reviews.filter((r) => Number(r.id) >= weekAgo).length;
      const totalReviews = rv.total ?? bi.total ?? 0;

      // Grava ANTES de qualquer desistencia de envio — ver comentario acima.
      await gravaSerie(biz.id, rv.rating ?? bi.rating ?? null, totalReviews);

      if (optOut) { stats.skipped_disabled++; return; }
      if (!to) { stats.skipped_no_email++; return; }

      // ── ALERTA DE AVALIAÇÃO NEGATIVA (02/ago) ────────────────────────
      // Antes um cron separado rodava TODO DIA e pedia ao Google as avaliações
      // de cada negócio — exatamente as mesmas que este resumo já busca aqui em
      // cima. Duas consultas pagas pelo mesmo dado. Agora o alerta pega carona:
      // custo marginal ZERO, e o robô diário sai do ar (R$206 → ~R$30/mês).
      //
      // Preço da mudança: o aviso passa a chegar em até 7 dias em vez de 24h.
      // Foi decisão do dono (02/ago) — o serviço é grátis e nunca prometemos
      // aviso imediato. O aviso no mesmo dia fica como diferencial do Pro.
      //
      // Destinatário é o MESMO `to` do resumo: as duas coisas já eram gateadas
      // pela mesma preferência (`alert_preferences.email_enabled`), então juntar
      // não muda quem recebe o quê.
      //
      // A idempotência é por `review_id` no email_log e o emailType continua
      // "negative_review" — de propósito: assim as avaliações que o robô antigo
      // já avisou NÃO são avisadas de novo na primeira rodada deste.
      const negativas = reviews.filter((r) => (r.rating || 0) <= NEG_MAX && Number(r.id) >= weekAgo);
      if (negativas.length >= LISTA_CHEIA && newThisWeek >= LISTA_CHEIA) {
        // O Google só devolve ~5 avaliações. Se TODAS as 5 são da semana, a
        // lista encheu e pode ter sobrado avaliação de fora dela — inclusive
        // negativa. Não dá pra saber, então avisa alto em vez de fingir que viu
        // tudo. É o risco real de medir semanalmente em vez de diariamente.
        console.warn(
          `[weekly-digest] LISTA CHEIA em "${rv.name}" (${biz.place_id}): ` +
          `${newThisWeek} avaliações novas e o Google só mostra ${LISTA_CHEIA}. ` +
          `Pode ter negativa que não vimos — este negócio precisa de medição mais frequente.`
        );
        stats.lista_cheia = (stats.lista_cheia || 0) + 1;
      }
      for (const neg of negativas) {
        const t = negativeReviewEmail({
          bizName: rv.name, author: neg.author, rating: neg.rating,
          text: neg.text, placeId: biz.place_id,
        });
        if (dry) { stats.alerts_sent++; continue; }
        const ra = await enviaComFreio({
          userId: biz.user_id,
          emailType: "negative_review",
          to,
          subject: t.subject,
          html: t.html,
          metadata: { review_id: String(neg.id), place_id: biz.place_id, rating: neg.rating },
          dedupeByMetadata: { key: "review_id", value: String(neg.id) },
        });
        if (ra?.sent) stats.alerts_sent++;
      }
      const score = emailScore({
        rating: rv.rating ?? bi.rating, reviews: totalReviews,
        gridAvg, gridSemCobertura, gridCobertura, gridMedidos,
        photo: bi.photoUrl, phone: bi.phone, category: bi.category,
      });
      // MARCO ZERO. A data mostrada e sempre a do dia em que o numero foi
      // tirado (`businesses.created_at`), nunca outra — assim a frase e
      // literalmente verdadeira. O que muda e a PALAVRA: so diz "instalou"
      // quem ativou o primeiro dispositivo NO MESMO DIA em que o negocio
      // entrou, que e o caminho do Mercado Livre (a conta nasce na ativacao).
      // Quem veio pelo site criou conta em junho e recebeu o cartao em julho:
      // dizer "desde que instalou" creditaria ao cartao avaliacoes que
      // chegaram antes de ele existir.
      const ativouEm = primeiraAtivacao.get(biz.id) || null;
      const mesmoDia = !!ativouEm && String(ativouEm).slice(0, 10) === String(biz.created_at).slice(0, 10);
      //
      // O ZERO E AMBIGUO, e sao 5 contas hoje (medido em 11/09/2026). Ele pode
      // significar "o negocio nao tinha avaliacao nenhuma quando entrou" — a
      // melhor historia que existe, sair de zero — ou "o savebiz gravou zero
      // por falha", e ai o cliente le "+32 avaliacoes novas" tendo ja 32 antes.
      //
      // O proprio banco desempata: NEGOCIO NAO TEM NOTA SEM TER AVALIACAO. Zero
      // com nota junto e contradicao, logo e falha de gravacao — e some. Zero
      // sem nota e verdade, e a frase vale.
      const zeroContradito = biz.total_reviews === 0 && Number(biz.rating) > 0;
      const marcoZero = (biz.total_reviews != null && biz.created_at && !zeroContradito)
        ? { total: biz.total_reviews, data: biz.created_at, desde: mesmoDia ? "instalacao" : "conta" }
        : null;
      if (zeroContradito) stats.marco_contraditorio++;

      const unsub = unsubUrl(biz.user_id);
      const tmpl = weeklyDigestEmail({
        bizName: rv.name, rating: rv.rating, total: totalReviews,
        newThisWeek, recentReviews: reviews, tip, score,
        milestone: nextMilestone(totalReviews), article, unsubUrl: unsub,
        marcoZero,
        taps7d: tapsPorBiz.get(biz.id) || 0,
        temDispositivo: dadosDeDispositivoOk && comDispositivo.has(biz.id),
      });

      if (dry) {
        stats.recipients.push({ business: rv.name, to, score: score.score, new_this_week: newThisWeek });
      } else {
        const r = await enviaComFreio({
          userId: biz.user_id,
          emailType: "weekly_digest",
          to,
          subject: tmpl.subject,
          html: tmpl.html,
          metadata: { week, business_id: biz.id },
          dedupeByMetadata: { key: "week", value: week },
          headers: {
            "List-Unsubscribe": `<${unsub}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        if (r?.sent) { stats.sent++; stats.recipients.push({ business: rv.name, to }); }
        else if (r?.skipped) stats.skipped_dedupe++;
        else if (r?.error) stats.errors.push({ business_id: biz.id, error: r.error });
      }

      // Sobrou um respiro curto so pra alisar a rajada contra o Google — a
      // espera longa de antes existia pra segurar UMA fila indiana, e agora
      // quem segura o ritmo do envio e o freio do Resend.
      await sleep(60);
    } catch (e) {
      stats.errors.push({ business_id: biz.id, error: e.message || String(e) });
    }
  });

  // A fila de envio e independente do pool: o ultimo negocio pode ter terminado
  // a busca e ainda ter e-mail esperando a vez. Sem esta linha, o relatorio
  // sairia antes dos ultimos envios e o `sent` contaria menos do que foi.
  await filaEnvio;

  stats.took_ms = Date.now() - t0;
  console.log("[cron/weekly-digest] concluído:", JSON.stringify({ ...stats, recipients: stats.recipients.length }));
  return res.status(200).json(stats);
}
