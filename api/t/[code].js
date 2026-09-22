// ============================================================
// TRYBO — Redirect do cartao de redes sociais (/t/:code -> /api/t/:code)
// Servida por trybo.co. Endpoint publico: qualquer um que encosta o celular
// no cartao cai aqui.
//
// ESTA E A PECA IRREVERSIVEL DO PROJETO. A URL `trybo.co/t/CODIGO` vai
// gravada dentro do chip NFC e impressa no QR. Cartao impresso nao se
// reimprime, chip gravado nao se regrava. Tudo o mais aqui pode ser
// reescrito; o endereco, nao.
//
// IRMA DA /api/r/[code].js, de proposito: mesma blindagem (retentativa de
// banco, no-store, falha de banco nunca vira "cartao invalido"). O que muda e
// so o destino — la e o Google, aqui e a rede social.
//
// O QUE ELA *NAO* FAZ, e o motivo:
//   - nao consulta plano, nao faz JOIN, nao chama funcao do banco.
//     A resposta ja vem pronta em `plates.served_destinations`, gravada
//     quando o lojista salvou. O toque custa UMA leitura.
//   - nao carrega fonte externa, script de terceiro, GA4 nem Pixel.
//     Quem atravessa esta pagina e o cliente do lojista: nao tem relacao
//     com a gente e nao teve onde consentir. Mesma regra da /avaliar.
//   - nao grava IP nem User-Agent, nem em hash. As colunas existem
//     (plate_taps.ip_hash/ua_hash) e ficam VAZIAS ate a Politica de
//     Privacidade ser revisada. Consequencia assumida: sem dedupe de 60s.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ATIVAR = "https://trybo.co/ativar";

// ── Contexto do toque (sem nada pessoal) ────────────────────
function firstStr(v) {
  const s = Array.isArray(v) ? v[0] : v;
  if (s == null || String(s) === "") return null;
  return String(s).slice(0, 120);
}

function tapMedium(query) {
  const m = (firstStr(query.utm_medium) || "").toLowerCase();
  if (m === "nfc" || m === "qr" || m === "link") return m;
  return m ? "outro" : "nfc";   // cartao gravado sem parametro: o toque e o caso comum
}

function deviceKind(ua) {
  const s = String(ua || "").toLowerCase();
  if (!s) return null;
  if (/mobile|android|iphone|ipad|ipod/.test(s)) return "mobile";
  return "desktop";
}

function deviceOs(ua) {
  const s = String(ua || "").toLowerCase();
  if (!s) return null;
  if (/iphone|ipad|ipod/.test(s)) return "ios";
  if (/android/.test(s)) return "android";
  return "outro";
}

function refererHost(ref) {
  if (!ref) return null;
  try { return new URL(String(ref)).hostname.slice(0, 120); } catch { return null; }
}

// ── Robo e prefetch ─────────────────────────────────────────
// Link colado no WhatsApp/iMessage e pre-carregado pelo app ANTES de alguem
// tocar. Sem este filtro, o lojista veria toques que nunca aconteceram — e o
// ranking entre atendentes premiaria quem manda mais link, nao quem oferece
// mais o cartao. Robo entra no banco marcado (`is_bot`) e fica fora da conta;
// nao e ignorado, porque sumir com ele esconderia um pico estranho.
const BOT_UA = /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|telegram|slackbot|discord|preview|monitor|curl|wget|python-requests|headless|lighthouse|pingdom|uptime/i;

function looksLikeBot(req) {
  if (req.method === "HEAD") return true;
  const purpose = String(
    req.headers["sec-purpose"] || req.headers["purpose"] || req.headers["x-purpose"] || ""
  ).toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("preview")) return true;
  return BOT_UA.test(String(req.headers["user-agent"] || ""));
}

// Navegador interno do Instagram/Facebook: o "Seguir" ali costuma pedir login
// de novo. Nao da pra sair dele por codigo — o que da e AVISAR, com o botao
// de copiar o link. Toque por NFC nao cai neste caso; QR lido de dentro do
// app, sim.
function isInAppBrowser(ua) {
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger/i.test(String(ua || ""));
}

// Tenta a consulta ate `tries` vezes. Um solucao de banco NAO pode virar
// "cartao invalido" na mao de um cliente que esta de pe no balcao.
async function queryWithRetry(buildQuery, tries = 3) {
  let last = { data: null, error: null };
  for (let i = 0; i < tries; i++) {
    last = await buildQuery();
    if (!last.error) return last;
    console.error(`[t/code] tentativa ${i + 1}/${tries} falhou:`, last.error?.message || last.error);
    if (i < tries - 1) await new Promise((r) => setTimeout(r, 150 * (i + 1)));
  }
  return last;
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// So http(s). Sem isto, um destino gravado errado poderia virar `javascript:`
// na pagina que a gente serve.
function safeUrl(u) {
  const s = String(u || "");
  return /^https?:\/\//i.test(s) ? s : null;
}

// ── Registro do toque ───────────────────────────────────────
// `await` e nao "fire and forget": na Vercel a funcao morre junto com a
// resposta e a promise orfa e cortada no meio. Mas NUNCA derruba o cliente —
// se o banco tropecar, a pessoa segue pro perfil e a gente perde a linha.
async function registrarToque(plate, req, { bot }) {
  const tappedAt = new Date().toISOString();
  const ua = req.headers["user-agent"];

  if (!bot) {
    try {
      await supabase
        .from("plates")
        .update({ total_taps: (plate.total_taps || 0) + 1, last_tapped_at: tappedAt })
        .eq("id", plate.id);
    } catch (e) {
      console.error("[t/code] falha ao incrementar taps:", e);
    }
  }

  try {
    const { error } = await supabase.from("plate_taps").insert({
      plate_id: plate.id,
      business_id: plate.business_id,
      member_id: plate.member_id || null,
      code: plate.code,
      tapped_at: tappedAt,
      medium: tapMedium(req.query),
      source: firstStr(req.query.utm_source) || "trybo",
      campaign: firstStr(req.query.utm_campaign),
      device: deviceKind(ua),
      device_os: deviceOs(ua),
      is_bot: !!bot,
      referer_host: refererHost(req.headers.referer || req.headers.referrer)
    });
    // O supabase-js devolve o erro em vez de estourar excecao. Sem este check
    // a falha seria silenciosa e o painel mostraria "0 toques" como se
    // ninguem tivesse encostado no cartao.
    if (error) console.error("[t/code] falha ao registrar toque:", error.message || error);
  } catch (e) {
    console.error("[t/code] falha ao registrar toque:", e);
  }
}

// O encaminhamento efetivo: a pessoa foi mesmo parar no perfil.
// toques x encaminhamentos = a taxa que diz se a pagina de escolha funciona.
async function registrarEncaminhamento(plate, destino, metodo, req) {
  try {
    const { error } = await supabase.from("experience_events").insert({
      business_id: plate.business_id,
      plate_id: plate.id,
      code: plate.code,
      kind: "click",
      button_id: metodo,                       // auto | escolha_1 | escolha_2
      action: destino?.kind || "outro",
      happened_at: new Date().toISOString(),
      medium: tapMedium(req.query),
      device: deviceKind(req.headers["user-agent"]),
      referer_host: refererHost(req.headers.referer || req.headers.referrer)
    });
    if (error) console.error("[t/code] falha ao registrar encaminhamento:", error.message || error);
  } catch (e) {
    console.error("[t/code] falha ao registrar encaminhamento:", e);
  }
}

// ============================================================
// A PAGINA DE ESCOLHA
// ============================================================
// Regras que nao sao estilo, sao requisito:
//   - abaixo de 15 KB e ZERO request externo (sem fonte, sem icone, sem
//     script de fora). Cada request a mais e meio segundo no 4G da loja.
//   - dois botoes, nunca tres. A trava real esta no banco (posicao in 1,2);
//     aqui e so nao inventar um terceiro.
//
// >>> VISUAL PROVISORIO <<<  Os tokens abaixo (cor, fonte, raio) sao neutros
// e serao trocados pelos do site da Trybo quando o export chegar. E um bloco
// so, de proposito: trocar identidade nao pode exigir mexer na logica.
const TOKENS = `
  --tinta:#111114; --apagado:#6b6b76; --linha:#e6e6ec; --fundo:#ffffff;
  --realce:#111114; --sobre-realce:#ffffff; --raio:14px;
`;

function paginaEscolha({ destinos, code, avisoInApp }) {
  const botoes = destinos.map((d, i) => `
      <a class="b" href="/t/${encodeURIComponent(code)}?ir=${i + 1}" rel="noopener">
        <span>${escapeHtml(d.label || d.kind)}</span>
      </a>`).join("");

  const aviso = avisoInApp ? `
    <p class="aviso">Está abrindo dentro de outro aplicativo. Se o perfil não
    carregar, toque nos três pontinhos e escolha <b>Abrir no navegador</b>.</p>` : "";

  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>Escolha onde seguir</title>
<style>
:root{${TOKENS}}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--fundo);color:var(--tinta)}
body{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px 16px;
 font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.c{width:100%;max-width:380px;text-align:center}
h1{font-size:20px;line-height:1.25;margin:0 0 24px;font-weight:700;letter-spacing:-.01em}
.b{display:flex;align-items:center;justify-content:center;min-height:56px;margin:0 0 12px;
 padding:14px 18px;border:1px solid var(--linha);border-radius:var(--raio);
 background:var(--realce);color:var(--sobre-realce);text-decoration:none;font-weight:650;font-size:17px}
.b:active{opacity:.82}
.b+.b{background:var(--fundo);color:var(--tinta)}
.aviso{margin:18px 0 0;font-size:13px;line-height:1.5;color:var(--apagado)}
.rodape{margin:28px 0 0;font-size:12px;color:var(--apagado)}
</style>
</head><body>
<div class="c">
  <h1>Onde você quer seguir?</h1>
  ${botoes}
  ${aviso}
  <p class="rodape">Trybo, uma solução StarTouch</p>
</div>
</body></html>`;
}

// Pagina de aviso. Existe para os casos em que um 302 mentiria e um codigo de
// status seco (410) deixaria uma pessoa de pe na loja olhando uma tela branca.
function paginaAviso({ titulo, texto, acao }) {
  const botao = acao
    ? `<a href="${escapeHtml(acao.href)}">${escapeHtml(acao.texto)}</a>`
    : "";
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${escapeHtml(titulo)}</title>
<style>
:root{${TOKENS}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--fundo);color:var(--tinta)}
body{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px 16px;
 font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;text-align:center}
.c{max-width:380px}
h1{font-size:20px;margin:0 0 10px;font-weight:700}
p{color:var(--apagado);margin:0 0 20px}
a{display:inline-block;padding:13px 22px;border-radius:var(--raio);
 background:var(--realce);color:var(--sobre-realce);text-decoration:none;font-weight:650}
.rodape{margin:26px 0 0;font-size:12px;color:var(--apagado)}
</style>
</head><body><div class="c">
  <h1>${escapeHtml(titulo)}</h1>
  <p>${escapeHtml(texto)}</p>
  ${botao}
  <p class="rodape">Trybo, uma solução StarTouch</p>
</div></body></html>`;
}

function paginaSemDestino() {
  return paginaAviso({
    titulo: "Cartão ativo, sem destino",
    texto: "Este cartão ainda não aponta para nenhuma rede. Quem configura é o dono da loja, no painel.",
    acao: { href: "https://startouch.com.br/app", texto: "Configurar agora" }
  });
}

// ============================================================
export default async function handler(req, res) {
  // NUNCA cachear: o destino muda com o status (estoque -> ativo) e com o que
  // o lojista configura. Sem isto o celular memoriza o redirect antigo e o
  // cartao fica preso nele — ja aconteceu na /r/.
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Referrer-Policy", "no-referrer");

  const code = String(req.query.code || "").trim().toUpperCase();
  const ir = firstStr(req.query.ir);              // clique num botao da escolha
  const bot = looksLikeBot(req);

  if (!code) return res.redirect(302, `${ATIVAR}?error=invalida`);

  try {
    const { data: plate, error } = await queryWithRetry(() =>
      supabase
        .from("plates")
        .select("id, code, status, linha, business_id, member_id, total_taps, served_destinations, replaced_by")
        .eq("code", code)
        .maybeSingle()
    );

    // Banco fora depois de 3 tentativas. NAO e "cartao invalido": o cartao
    // pode estar ativo e mandar a pessoa pra tela de erro seria mentira.
    if (error) {
      console.error("[t/code] busca falhou apos retries:", error.message || error);
      return res.redirect(302, `${ATIVAR}?error=instavel&code=${encodeURIComponent(code)}`);
    }

    if (!plate) return res.redirect(302, `${ATIVAR}?error=invalida`);

    // Cartao perdido e substituido: o antigo aponta pro novo. 301 porque a
    // troca e permanente — quem tiver o link velho passa a chegar no certo.
    if (plate.replaced_by) {
      const { data: novo } = await supabase
        .from("plates").select("code").eq("id", plate.replaced_by).maybeSingle();
      if (novo?.code) return res.redirect(301, `/t/${encodeURIComponent(novo.code)}`);
    }

    // Bloqueado (cartao perdido, sem substituto). 410 e o status correto — o
    // recurso existiu e nao existe mais — mas quem esta olhando e uma pessoa
    // com o cartao na mao, entao o 410 vem com pagina, nao seco.
    if (plate.status === "disabled") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(410).send(paginaAviso({
        titulo: "Este cartão foi bloqueado",
        texto: "O dono da loja desativou este cartão. Se ele foi entregue a você por engano, procure a loja.",
        acao: null
      }));
    }

    // Ainda em estoque / a caminho: quem chegou aqui acabou de receber o
    // cartao e quer ativa-lo.
    if (plate.status !== "active") {
      return res.redirect(302, `${ATIVAR}?code=${encodeURIComponent(plate.code)}`);
    }

    const destinos = Array.isArray(plate.served_destinations) ? plate.served_destinations : [];

    // ── Robo / prefetch: grava marcado e NAO redireciona ──
    // 204 em vez de 302 de proposito: o robo nao "visitou" o perfil do
    // cliente, e mandar um crawler pro Instagram dele nao ajuda ninguem.
    if (bot) {
      await registrarToque(plate, req, { bot: true });
      return res.status(204).end();
    }

    // ── Clique num botao da pagina de escolha ──
    // Nao conta toque de novo: e a mesma visita. So o encaminhamento.
    if (ir) {
      const idx = parseInt(ir, 10);
      const destino = destinos[idx - 1];
      const url = safeUrl(destino?.url);
      if (!url) return res.redirect(302, `/t/${encodeURIComponent(plate.code)}`);
      await registrarEncaminhamento(plate, destino, `escolha_${idx}`, req);
      return res.redirect(302, url);
    }

    await registrarToque(plate, req, { bot: false });

    // ── Nenhum destino configurado ──
    if (destinos.length === 0) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(paginaSemDestino());
    }

    // ── Um destino: 302 direto. E o que mais converte. ──
    if (destinos.length === 1) {
      const url = safeUrl(destinos[0]?.url);
      if (url) {
        await registrarEncaminhamento(plate, destinos[0], "auto", req);
        return res.redirect(302, url);
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(paginaSemDestino());
    }

    // ── Dois destinos: pagina de escolha ──
    const validos = destinos.filter((d) => safeUrl(d?.url)).slice(0, 2);
    if (validos.length === 0) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(paginaSemDestino());
    }
    if (validos.length === 1) {
      await registrarEncaminhamento(plate, validos[0], "auto", req);
      return res.redirect(302, safeUrl(validos[0].url));
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(paginaEscolha({
      destinos: validos,
      code: plate.code,
      avisoInApp: isInAppBrowser(req.headers["user-agent"])
    }));
  } catch (e) {
    // Erro inesperado nunca vira 500 na cara de quem encostou o celular.
    console.error("[t/code] erro inesperado:", e);
    return res.redirect(302, `${ATIVAR}?error=instavel&code=${encodeURIComponent(code)}`);
  }
}
