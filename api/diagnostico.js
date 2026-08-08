// ============================================================
// StarTouch — Diagnóstico público (isca de captação)
// ============================================================
// Endpoint PÚBLICO (sem auth). Usa o MESMO motor do app
// (fetchRankingByTerm) — ranqueia pela ordem real do Google
// (Text Search do termo). Assim o número do diagnóstico bate
// com o que o cliente vê depois de virar usuário.
//
// Uso: /api/diagnostico?place_id=XXX  (opcional &keyword= &radius=)
// É marketing — mostra nomes dos líderes (diferente do paywall do app).
// ============================================================
import { fetchRankingByTerm, fetchVisibilityLenses, applyNameLocking, suggestTerms, fetchPlaceSeed } from "./_lib/competitors.js";
import { fetchGridRankingCached } from "./_lib/ranking-grid-cache.js";
import { freshAutorizado, TTL } from "./_lib/places-cache.js";
import { limitou, LIMITES } from "./_lib/rate-limit.js";
import { createClient } from "@supabase/supabase-js";

// ── Plano de quem está perguntando (30/jul) ─────────────────
// A rota segue PÚBLICA: sem token, responde igual a sempre. O token só é lido
// pra decidir de quanto em quanto tempo a medição pode ser refeita:
//
//   anon  → 6h   (visitante no diagnóstico da landing: é o funil, não mexer)
//   free  → 7 dias  (uma medição por semana — o que o site promete)
//   pro   → 6h + pode forçar "medir agora"
//
// Free logado ficar mais lento que anônimo é uma brecha conhecida: dá pra sair
// da conta e remedir pelo diagnóstico público. Aceita de propósito — fechar
// custaria degradar o funil de captação, que vale mais. Os freios por IP/dia
// continuam limitando o estrago.
let _sbDiag = null;
function sbDiag() {
  if (_sbDiag) return _sbDiag;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _sbDiag = createClient(url, key, { auth: { persistSession: false } });
  return _sbDiag;
}

const ADMIN_EMAILS = ["ricardo.fiorini@gmail.com"];

const CTX_ANON = { plano: "anon", termoSalvo: null, placeIdDoDono: null };

/**
 * Quem está perguntando: plano ('anon'|'free'|'pro') + a BUSCA que o dono
 * escolheu no painel. Nunca lança: token podre vira 'anon'.
 *
 * O termo salvo vem junto de propósito (03/ago). Até aqui a grade media sempre
 * um termo derivado da categoria do Google e IGNORAVA o `category_override` —
 * então o botão "Trocar busca" do painel salvava a escolha, o rótulo mudava, e
 * os números da tela continuavam os mesmos. Um controle que não controla nada.
 * Ler o termo aqui custa zero: a consulta ao banco já acontecia pro plano.
 */
async function contextoDoRequest(req) {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return CTX_ANON;
  const supabase = sbDiag();
  if (!supabase) return CTX_ANON;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    const user = data?.user;
    if (error || !user) return CTX_ANON;
    const { data: biz } = await supabase
      .from("businesses")
      .select("plan, place_id, category_override")
      .eq("user_id", user.id)
      .maybeSingle();
    const admin = ADMIN_EMAILS.includes((user.email || "").toLowerCase());
    return {
      plano: admin || biz?.plan === "pro" ? "pro" : "free",
      termoSalvo: (biz?.category_override || "").trim() || null,
      // Só vale pro negócio DELE: com o place_id de outro na URL, o termo salvo
      // não pode vazar pra medição alheia.
      placeIdDoDono: biz?.place_id || null,
    };
  } catch {
    return CTX_ANON;  // falha de banco não pode derrubar o diagnóstico
  }
}

const gscore = (rt, rv) => (rt || 0) * Math.log10((rv || 0) + 1);

// Sugestões de termo relacionadas — viram botões clicáveis no diagnóstico.
const SUGGESTIONS = {
  "padaria": ["padaria", "padaria artesanal", "confeitaria"],
  "padaria artesanal": ["padaria artesanal", "padaria", "confeitaria"],
  "confeitaria": ["confeitaria", "doceria", "padaria"],
  "cafeteria": ["cafeteria", "padaria", "confeitaria"],
  "restaurante": ["restaurante", "restaurante japonês", "churrascaria", "pizzaria"],
  "restaurante japonês": ["restaurante japonês", "sushi", "restaurante"],
  "restaurante árabe": ["restaurante árabe", "esfiharia", "restaurante"],
  "restaurante italiano": ["restaurante italiano", "pizzaria", "restaurante"],
  "pizzaria": ["pizzaria", "pizzaria napolitana", "restaurante"],
  "pizzaria napolitana": ["pizzaria napolitana", "pizzaria"],
  "hamburgueria": ["hamburgueria", "hamburgueria artesanal", "lanchonete"],
  "hamburgueria artesanal": ["hamburgueria artesanal", "hamburgueria", "lanchonete"],
  "lanchonete": ["lanchonete", "hamburgueria", "pastelaria"],
  "churrascaria": ["churrascaria", "restaurante"],
  "açaí": ["açaí", "sorveteria"],
  "sorveteria": ["sorveteria", "gelateria", "açaí"],
  "gelateria": ["gelateria", "sorveteria"],
  "barbearia": ["barbearia", "salão de beleza"],
  "salão de beleza": ["salão de beleza", "barbearia", "estética"],
  "estética": ["estética", "salão de beleza"],
  "petshop": ["petshop", "pet shop"],
  "farmácia": ["farmácia", "drogaria"],
  "academia": ["academia", "crossfit"],
  "mercado": ["mercado", "hortifruti", "mercearia"],
  "hortifruti": ["hortifruti", "mercado"],
  "pastelaria": ["pastelaria", "lanchonete"],
  "esfiharia": ["esfiharia", "restaurante árabe"],
  "clínica": ["clínica", "clínica odontológica"],
  "clínica odontológica": ["clínica odontológica", "dentista"],
  "bakery": ["padaria", "padaria artesanal", "confeitaria"],
  "restaurant": ["restaurante", "restaurante japonês", "pizzaria"],
  "bar": ["bar", "boteco", "pub", "restaurante"],
  "cafe": ["cafeteria", "padaria"],
  "beauty_salon": ["salão de beleza", "estética"],
  "hair_care": ["barbearia", "salão de beleza"],
  "gym": ["academia"],
  "pharmacy": ["farmácia", "drogaria"],
  "meal_takeaway": ["lanchonete", "restaurante"],
  "meal_delivery": ["lanchonete", "restaurante"],
  "supermarket": ["mercado", "hortifruti"],
  "grocery_or_supermarket": ["mercado", "hortifruti"]
};
function suggestFor(term) {
  const base = SUGGESTIONS[term] || SUGGESTIONS[(term || "").toLowerCase()] || [];
  if (!base.length) return [];
  return [...new Set([term, ...base])].slice(0, 4);
}

// A grade é a única rota pública que queima Places em lote: 5 Text Search por
// termo frio (até 3 termos = 15 chamadas). O cache de 7 dias absorve as
// revisitas, mas nada impede alguém de varrer place_ids. Freio por IP.
// Ressalva: `Map` em memória vive por INSTÂNCIA de função — a Vercel roda
// várias, então o teto real é maior que RATE_LIMIT. Segura abuso casual, não
// ataque decidido.
const GRID_RATE_LIMIT = 12;
const GRID_RATE_WINDOW_MS = 60 * 60 * 1000;
const gridHits = new Map();
function gridRateLimited(ip) {
  const now = Date.now();
  const arr = (gridHits.get(ip) || []).filter((t) => now - t < GRID_RATE_WINDOW_MS);
  if (arr.length >= GRID_RATE_LIMIT) { gridHits.set(ip, arr); return true; }
  arr.push(now); gridHits.set(ip, arr); return false;
}
function getIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  return fwd ? fwd.split(",")[0].trim() : (req.socket?.remoteAddress || "unknown");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // CUIDADO: `public, max-age=600` deixa a CDN da Vercel guardar e reentregar a
  // MESMA resposta pra todo mundo que pedir a mesma URL. Desde que a resposta
  // passou a depender do plano (30/jul), isso vazaria a medição de um cliente
  // pro outro — a CDN não olha o header Authorization. Com token, a resposta é
  // privada e não entra em cache compartilhado.
  const autenticado = !!req.headers.authorization;
  res.setHeader("Cache-Control", autenticado ? "private, no-store" : "public, max-age=600");
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  const placeId = req.query.place_id || req.query.place;
  const keyword = (req.query.keyword || "").trim();
  // `?cep=` ainda pode chegar do front (é usado na BUSCA do negócio, em
  // searchbiz), mas aqui é ignorado de propósito: a medição ancora no endereço
  // do negócio no Google. Ver a nota "ÂNCORA" em _lib/competitors.js.
  // Diagnóstico trava em até 3km (recorte fiel ao que o cliente percorre).
  const rIn = parseInt(req.query.radius, 10);
  const radius = Number.isFinite(rIn) ? Math.min(Math.max(rIn, 500), 3000) : 3000;
  if (!placeId) return res.status(400).json({ error: "place_id obrigatório" });

  // Endpoint público e o mais caro do site: uma visita pode virar 5 chamadas ao
  // Places (grade) ou 3 (lentes). Freio por IP/hora + teto diário GLOBAL — este
  // segundo existe porque quem quer abusar troca de IP, e desde 26/jul a cota do
  // Google é finita: sem teto, um ataque consome a cota e derruba o painel de
  // quem paga. O 400 acima vem antes: request malformada não gasta cota.
  if (await limitou(req, res, LIMITES.diagnostico)) return;

  // Só custa uma ida ao banco quando vem token; visitante nem consulta.
  const ctx = autenticado ? await contextoDoRequest(req) : CTX_ANON;
  const plano = ctx.plano;
  const cadenciaMs = plano === "free" ? TTL.LENSES_FREE : TTL.LENSES;

  // Sugestão de termos (chips do formulário) a partir da categoria/nome do Google.
  if (req.query.suggest) {
    try {
      const seed = await fetchPlaceSeed(placeId);
      return res.json({
        ok: true,
        name: seed?.name || null,
        suggestions: suggestTerms(seed?.name, seed?.types, seed?.primaryDisplay, seed?.primaryType),
      });
    } catch (err) {
      return res.json({ ok: true, suggestions: [] });
    }
  }

  // Modo GRADE. PÚBLICO de propósito (decisão de 09/07: ranking é tudo free —
  // entregamos o diagnóstico e vendemos o conserto). Protegido por cache de 7
  // dias + freio por IP, não por login.
  if (req.query.grid) {
    try {
      if (gridRateLimited(getIp(req))) {
        return res.status(429).json({ error: "Muitas consultas seguidas. Tente de novo em alguns minutos." });
      }
      // ORDEM DA BUSCA MEDIDA — do mais explícito pro mais automático:
      //   1. `?terms=` na URL (convidado escolhendo os chips)
      //   2. a busca que o DONO salvou no painel ("Trocar busca")
      //   3. a categoria oficial do Google (chute inicial, primeira visita)
      // O passo 2 não existia: a escolha do dono era salva e ignorada.
      let terms = (req.query.terms || "").toString().split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3);
      if (!terms.length && ctx.termoSalvo && ctx.placeIdDoDono === placeId) {
        terms = [ctx.termoSalvo];
      }
      // Reservas pro caso do termo automático não achar o negócio (ver o bloco
      // "SEGUNDA TENTATIVA" abaixo). Só existem quando NINGUÉM escolheu o termo:
      // escolha explícita do convidado ou do dono é pra ser obedecida, mesmo que
      // dê "fora da lista" — trocar a busca dele por baixo seria mentir sobre o
      // que foi medido.
      let reservas = [];
      if (!terms.length) {
        const seed = await fetchPlaceSeed(placeId);
        const sugeridos = suggestTerms(seed?.name, seed?.types, seed?.primaryDisplay, seed?.primaryType);
        terms = sugeridos.slice(0, 1);
        reservas = sugeridos.slice(1, 3);
      }
      if (!terms.length) return res.json({ ok: true, grid: null });
      // ?fresh=1 fura o cache e mede na hora: 15 chamadas Places por request, sem
      // reaproveitar nada. É ferramenta de diagnóstico, NÃO pode ser pública —
      // um F5 repetido viraria conta no Google. Exige o segredo; sem a env, some.
      const segredo = process.env.GRID_FRESH_SECRET;
      // Pro também remede sob demanda (30/jul) — é o produto que ele comprou.
      // A grade custa 5 chamadas Places POR TERMO (até 15 numa request), então
      // aqui só entra com `remedir=1` explícito: nunca no carregamento normal
      // do painel, senão todo Pro que abre a tela queima a cota.
      const fresh = (!!req.query.fresh && !!segredo && req.query.secret === segredo)
        || (plano === "pro" && !!req.query.remedir);
      // O handler seta `max-age=600` no topo. Numa medição "sem cache" isso
      // devolveria uma resposta de até 10min do CDN — o bolor que viemos matar.
      if (fresh) res.setHeader("Cache-Control", "no-store");
      let grid = await fetchGridRankingCached({ placeId, terms, fresh });

      // SEGUNDA TENTATIVA — quando o termo automático dá "fora da lista".
      // Caso que originou isto (08/ago): "Limão e Brasa — Bar | Carnes | Peixes",
      // 4,9 com 463 avaliações, cadastrado só como "Restaurante". Em "restaurante"
      // ele não aparece em nenhum dos 5 pontos; em "bar e restaurante" é 3º de 19.
      // O painel abria em "Fora da lista" — verdade, mas a pior leitura possível
      // da vida do dono, e sem pista de que existe busca em que ele ganha.
      //
      // Só remede quando as três coisas valem:
      //   1. o termo foi ESCOLHIDO POR NÓS (`reservas` só é preenchido aí);
      //   2. o negócio ficou de fora DE VERDADE — `rank == null` com `measured>0`.
      //      `measured === 0` é falha do Places, não ausência: remedir aí seria
      //      gastar Places pra fugir de uma má notícia que nem existe;
      //   3. há chip reserva (especialidade lida no nome).
      // Custo: +5 chamadas Places, só no caso em que a resposta atual não vale
      // nada — e cacheadas por 7 dias como qualquer termo.
      const primeiro = grid?.terms?.[0];
      const foraDeVerdade = primeiro && primeiro.rank == null && primeiro.measured > 0;
      if (foraDeVerdade && reservas.length) {
        for (const reserva of reservas) {
          const alt = await fetchGridRankingCached({ placeId, terms: [reserva], fresh });
          if (alt?.terms?.[0]?.rank != null) {
            // Devolve a medição do termo que ACHOU o negócio, carimbando de onde
            // ela veio. O front precisa dizer isso na cara do dono — o número não
            // pode aparecer como se fosse da busca que ele imagina estar vendo.
            grid = { ...alt, termoTrocado: { de: primeiro.term, para: reserva } };
            break;
          }
        }
      }
      return res.json({ ok: true, grid, plano });
    } catch (err) {
      console.error("[diagnostico/grid] erro:", err);
      return res.status(500).json({ error: err.message || "Erro na grade" });
    }
  }

  // Modo VISIBILIDADE MULTI-LENTE: mesma busca (ordem real do Google) em raios
  // diferentes. Nomes de concorrente bloqueados (público), como no resto.
  if (req.query.lenses) {
    try {
      // As lentes têm cache de 6h no banco (places_cache). ?fresh=1 fura o
      // cache, mas só com o segredo — num caminho público, um F5 repetido
      // viraria conta no Google.
      // "Medir agora" é o que se vende: só Pro (ou o segredo de admin) fura o
      // cache. No grátis o pedido é ignorado em silêncio — devolve a medição da
      // semana, e a UI explica por quê em vez de dar erro na cara do dono.
      const fresh = freshAutorizado(req) || (plano === "pro" && !!req.query.remedir);
      if (fresh) res.setHeader("Cache-Control", "no-store");
      const vis = await fetchVisibilityLenses({ placeId, keyword, fresh, ttlMs: cadenciaMs });
      const lenses = (vis.lenses || []).map((L) => ({
        key: L.key,
        label: L.label,
        radiusKm: L.radiusKm,
        rank: L.rank,
        total: L.total,
        inResults: L.inResults,
        // Descartados por estarem além do raio (o radius do Google é bias, não cerca).
        beyondRadius: L.beyondRadius ?? 0,
        // Nomes liberados (sem blur) — concorrentes são free no projeto e o dono
        // precisa ver pra validar a fidelidade do ranking.
        top: (L.top || []).slice(0, 6).map((c, i) => ({
          pos: i + 1,
          name: c.name || null,
          rating: c.rating ?? null,
          reviews: c.reviews ?? 0,
          isMe: !!c.is_me
        }))
      }));
      return res.json({
        ok: true,
        term: vis.term,
        name: vis.me?.name || null,
        // Medição ancorada no endereço do negócio no Google (não no CEP digitado).
        anchoredAt: vis.anchoredAt || "negocio",
        lenses,
        cached: !!vis.cached,
        measuredAt: vis.measuredAt || null,
        // Quem perguntou e de quanto em quanto tempo essa medição se renova —
        // é o que a UI usa pra dizer "medido há X · próxima em Y" em vez de
        // fingir que o número é de agora.
        plano,
        proximaMedicao: vis.measuredAt
          ? new Date(new Date(vis.measuredAt).getTime() + cadenciaMs).toISOString()
          : null
      });
    } catch (err) {
      console.error("[diagnostico/lenses] erro:", err);
      return res.status(500).json({ error: err.message || "Erro ao gerar lentes" });
    }
  }

  try {
    const snap = await fetchRankingByTerm({ placeId, keyword, radius });

    if (!snap.enough) {
      return res.json({
        ok: true,
        enough: false,
        name: snap.me?.name || null,
        rating: snap.me?.rating ?? null,
        reviews: snap.me?.reviews ?? 0,
        category: snap.category || null,
        radius: snap.radius,
        total: snap.total || 0
      });
    }

    const myReviews = snap.me?.reviews || 0;
    const ahead = snap.ahead; // { reviews, rating, name } | null
    const reviewsToNext = ahead ? Math.max(0, (ahead.reviews || 0) - myReviews) : 0;

    // Concorrentes são FREE no projeto — nomes liberados (sem blur). Pra
    // reativar o paywall: applyNameLocking(snap.top || [], false).
    const lockedTop = applyNameLocking(snap.top || [], true);
    const top = lockedTop.slice(0, 5).map((c, i) => ({
      pos: i + 1,
      name: c.name || null,   // null = concorrente (borrado no front)
      rating: c.rating ?? null,
      reviews: c.reviews ?? 0,
      isMe: !!c.is_me
    }));

    return res.json({
      ok: true,
      enough: true,
      name: snap.me?.name || null,
      rating: snap.me?.rating ?? 0,
      reviews: myReviews,
      category: snap.category || null,
      radius: snap.radius,
      rank: snap.myRank,
      total: snap.total,
      inResults: snap.inResults,
      reviewsToNext,
      aheadName: null,         // nome do concorrente à frente não é revelado (Pro)
      ratingShortcut: null,
      suggestions: suggestFor(snap.category),
      top
    });
  } catch (err) {
    console.error("[diagnostico] erro:", err);
    return res.status(500).json({ error: err.message || "Erro ao gerar diagnóstico" });
  }
}
