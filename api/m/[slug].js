// ============================================================
// StarTouch — A página do Menu Inteligente (/m/:slug)
// ============================================================
// É a página que o CONSUMIDOR abre. Não é tela de painel: é o que aparece no
// celular de alguém que encostou numa placa no balcão, muitas vezes com
// internet ruim e pressa. Três consequências que governam este arquivo:
//
//  1. HTML montado no servidor, sem framework e sem bundle. Uma leitura de
//     banco e o HTML sai. Nada de baixar JavaScript pra ver quatro botões.
//
//  2. NENHUM RASTREAMENTO. Sem GA4, sem Meta Pixel, sem fonte de terceiro —
//     nem para carregar tipografia. Quem atravessa esta página é o cliente do
//     LOJISTA: não tem relação com a StarTouch e não teve onde consentir. É a
//     mesma regra que tirou as tags do /avaliar em 22/08/2026 (Política §4.2),
//     e ela vale aqui igual. NÃO REINTRODUZIR.
//
//  3. O que medimos é evento anônimo em `experience_events`: abriu, clicou em
//     qual botão. Sem IP, sem identificador de aparelho — mesma disciplina do
//     plate_taps.
//
// SÓ LÊ O PUBLICADO. O rascunho do lojista nunca aparece aqui: quem decide o
// que vai ao ar é o botão Publicar dele, não o fato de ter digitado algo.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { comCachePlaces, TTL } from "../_lib/places-cache.js";
import { fetchWithTimeout } from "../_lib/fetch-timeout.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const soDigitos = (v) => String(v == null ? "" : v).replace(/\D/g, "");

// Telefone brasileiro pro formato do WhatsApp. Sem país, assume 55 — quem
// digita "11 99999-9999" no painel não está pensando em código de país.
function paraWhats(tel) {
  const d = soDigitos(tel);
  if (!d) return null;
  return d.length <= 11 ? "55" + d : d;
}

// ── Destino de cada tipo ────────────────────────────────────
// `google` e `location` são montados AQUI, na hora, a partir do cadastro do
// negócio — nunca guardados no publicado. É o que faz o botão continuar certo
// quando o lojista corrige o cadastro no Google, sem precisarmos reescrever o
// que ele publicou (o que a arquitetura proíbe).
export function destino(b, biz, slug) {
  const v = b.value || {};
  switch (b.type) {
    case "google":
      return biz.place_id
        ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(biz.place_id)}`
        : null;
    case "location":
      return biz.place_id
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(biz.name || "")}&query_place_id=${encodeURIComponent(biz.place_id)}`
        : null;
    case "whatsapp": {
      const n = paraWhats(v.telefone);
      if (!n) return null;
      const t = v.mensagem ? `?text=${encodeURIComponent(v.mensagem)}` : "";
      return `https://wa.me/${n}${t}`;
    }
    case "phone": {
      const d = soDigitos(v.telefone);
      return d ? `tel:+${d.length <= 11 ? "55" + d : d}` : null;
    }
    case "contact":
      // Não é redirecionamento: abre uma sub-tela desta mesma página.
      return `/m/${encodeURIComponent(slug)}?c=${encodeURIComponent(b.id)}`;
    default:
      return v.url || null;
  }
}

// Ícone em SVG inline. Sem biblioteca e sem fonte de ícone: são nove desenhos
// e qualquer arquivo externo é um pedido de rede a mais numa página que abre
// no 3G de alguém.
const ICONES = {
  google:     '<path d="m12 3 2.5 5.6 6.1.5-4.6 4 1.4 6L12 16l-5.4 3.1 1.4-6-4.6-4 6.1-.5z"/>',
  whatsapp:   '<path d="M20 11.5a8 8 0 0 1-11.7 7.1L4 20l1.5-4.2A8 8 0 1 1 20 11.5z"/>',
  instagram:  '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.5"/><circle cx="17" cy="7" r="1"/>',
  food_menu:  '<path d="M5 3h14v18H5z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  phone:      '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
  location:   '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  website:    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>',
  contact:    '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6"/>',
  custom_url: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 6.8"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 1 0 11 18.7l1.4-1.4"/>'
};
const CORES = {
  google: "#F5A623", whatsapp: "#1E8E3E", instagram: "#7B4BC4", food_menu: "#B06000",
  phone: "#1557B0", location: "#4A5666", website: "#1557B0", contact: "#B3261E", custom_url: "#4A5666"
};
const icone = (t) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="${CORES[t] || "#4A5666"}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONES[t] || ICONES.custom_url}</svg>`;

// ── Registro de evento ──────────────────────────────────────
// Nunca pode derrubar a página: se a tabela não existir ou o banco tropeçar,
// o cliente segue para o destino e a gente perde a linha do log. Mas perde
// GRITANDO — falha silenciosa aqui viraria "ninguém clicou".
async function registrar({ exp, plate, kind, botao, req }) {
  try {
    const ua = String(req.headers["user-agent"] || "").toLowerCase();
    const { error } = await supabase.from("experience_events").insert({
      experience_id: exp.id,
      business_id: exp.business_id,
      plate_id: plate?.id || null,
      code: plate?.code || null,
      kind,
      button_id: botao?.id || null,
      action: botao?.type || null,
      medium: plate ? "nfc" : "link",
      device: ua ? (/mobile|android|iphone|ipad|ipod/.test(ua) ? "mobile" : "desktop") : null,
      referer_host: (() => {
        try { return new URL(String(req.headers.referer || "")).hostname.slice(0, 120); }
        catch { return null; }
      })()
    });
    if (error) console.error("[m/slug] falha ao registrar evento:", error.message || error);
  } catch (e) {
    console.error("[m/slug] falha ao registrar evento:", e);
  }
}

// ── Foto do negócio ─────────────────────────────────────────
// A URL de foto do Google carrega a NOSSA CHAVE de API. Numa página pública
// isso publicaria a chave no HTML de todo mundo que encosta numa placa, e
// cada exibição seria uma chamada cobrada. Por isso a imagem passa por aqui:
// a chave fica no servidor e a resposta é cacheada com folga, então o Google é
// consultado de vez em quando, não a cada abertura.
async function referenciaDaFoto(placeId) {
  const API_KEY = process.env.PLACES_API_KEY;
  if (!API_KEY || !placeId) return null;
  try {
    const { data } = await comCachePlaces({
      key: `menufoto:v1:${placeId}`,
      ttlMs: TTL.BIZINFO,
      produce: async () => {
        const r = await fetchWithTimeout(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${API_KEY}`,
          {}, 4000
        );
        const j = await r.json();
        return { ref: j?.result?.photos?.[0]?.photo_reference || null };
      }
    });
    return data?.ref || null;
  } catch { return null; }
}

// ============================================================
// HTML
// ============================================================
export function pagina({ exp, biz, temFoto, slug, plateCode }) {
  const p = exp.published || {};
  const marca = p.brand || {};
  const botoes = (p.buttons || []).filter((b) => b.enabled !== false);
  const titulo = marca.titulo || biz.name || "";
  const q = plateCode ? `&d=${encodeURIComponent(plateCode)}` : "";

  const linhas = botoes.map((b) => {
    const href = destino(b, biz, slug);
    // Botão sem destino resolvível simplesmente não aparece. Melhor uma ação a
    // menos do que um botão que não leva a lugar nenhum.
    if (!href) return "";
    const externo = /^https?:/i.test(href) && b.type !== "contact";
    return `<a class="bt" href="/m/${esc(slug)}?go=${esc(b.id)}${q}"${externo ? ' rel="noopener"' : ""}>
      <span class="ic">${icone(b.type)}</span><span class="lb">${esc(b.label)}</span>
      <span class="ch">›</span>
    </a>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#F7F9FC">
<!-- SEM GA4, SEM META PIXEL, SEM FONTE DE TERCEIRO. Quem abre esta página é o
     cliente do lojista: não tem relação com a StarTouch e não teve onde
     consentir. Mesma regra do /avaliar (Política §4.2). Não reintroduzir. -->
<style>
*{box-sizing:border-box}
body{margin:0;background:#F2F6FC;color:#131A24;
 font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,system-ui,sans-serif;
 font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}
.w{max-width:440px;margin:0 auto;padding:28px 18px 40px;min-height:100vh;
 display:flex;flex-direction:column}
.logo{width:74px;height:74px;border-radius:20px;margin:6px auto 14px;display:block;object-fit:cover;
 box-shadow:0 2px 10px rgba(19,26,36,.10)}
h1{font-size:22px;font-weight:700;text-align:center;margin:0;letter-spacing:-.02em}
.sb{text-align:center;font-size:14px;color:#65707E;margin:5px 0 22px}
.semfoto{margin-top:14px}
.bt{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #E3E9F0;
 border-radius:13px;padding:15px 16px;margin-bottom:10px;text-decoration:none;color:#131A24;
 box-shadow:0 1px 2px rgba(19,26,36,.05);-webkit-tap-highlight-color:transparent}
.bt:active{transform:scale(.985);background:#F7F9FC}
.bt .ic{width:24px;height:24px;flex:none}
.bt .ic svg{width:24px;height:24px;display:block}
.bt .lb{flex:1;font-size:15.5px;font-weight:500}
.bt .ch{color:#B6C0CC;font-size:20px;line-height:1}
.vazio{text-align:center;color:#8892A0;font-size:14px;padding:36px 0}
.rod{margin-top:auto;padding-top:28px;text-align:center;font-size:11.5px;color:#9AA5B1}
.rod a{color:#9AA5B1;text-decoration:none}
.volta{display:inline-flex;align-items:center;gap:6px;color:#65707E;text-decoration:none;
 font-size:14px;margin-bottom:16px}
.card{background:#fff;border:1px solid #E3E9F0;border-radius:14px;padding:22px 18px;text-align:center;
 box-shadow:0 1px 2px rgba(19,26,36,.05)}
.card .nome{font-size:19px;font-weight:700;letter-spacing:-.01em}
.card .cargo{font-size:13.5px;color:#65707E;margin-top:2px}
.card .dado{font-size:14px;color:#4A5666;margin-top:14px;line-height:1.7}
.card .dado a{color:#1A73E8;text-decoration:none}
.pri{display:block;background:#1A73E8;color:#fff;border-radius:12px;padding:14px;margin-top:18px;
 text-decoration:none;font-weight:600;font-size:15.5px;text-align:center}
@media(prefers-reduced-motion:reduce){.bt:active{transform:none}}
</style>
</head>
<body>
<div class="w">
  ${temFoto
    ? `<img class="logo" src="/m/${esc(slug)}?foto=1" alt="" width="74" height="74">`
    : '<div class="semfoto"></div>'}
  <h1>${esc(titulo)}</h1>
  ${marca.subtitulo ? `<div class="sb">${esc(marca.subtitulo)}</div>` : '<div style="height:14px"></div>'}
  ${linhas || '<div class="vazio">Este menu ainda não tem ações disponíveis.</div>'}
  <div class="rod"><a href="https://startouch.com.br" rel="noopener">StarTouch</a></div>
</div>
</body>
</html>`;
}

// Sub-tela do contato. É o primeiro tipo que ENTREGA algo em vez de mandar a
// pessoa embora — e por isso não é um download solto: o navegador embutido do
// Instagram, do Facebook e do WhatsApp costuma bloquear download de arquivo, e
// é justamente ali que o cartão de um vendedor mais é aberto. Com os dados na
// tela, quem não conseguir salvar ainda sai com o telefone na mão.
export function paginaContato({ exp, biz, b, slug, plateCode }) {
  const v = b.value || {};
  const zap = paraWhats(v.telefone);
  const q = plateCode ? `&d=${encodeURIComponent(plateCode)}` : "";
  const titulo = (exp.published?.brand?.titulo) || biz.name || "";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(v.nome || "Contato")}</title>
<meta name="robots" content="noindex">
<!-- Sem rastreamento, pelo mesmo motivo da página principal. -->
<style>
*{box-sizing:border-box}
body{margin:0;background:#F2F6FC;color:#131A24;
 font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,system-ui,sans-serif;font-size:16px;line-height:1.5}
.w{max-width:440px;margin:0 auto;padding:22px 18px 40px}
.volta{display:inline-flex;align-items:center;gap:6px;color:#65707E;text-decoration:none;font-size:14px;margin-bottom:16px}
.card{background:#fff;border:1px solid #E3E9F0;border-radius:14px;padding:24px 18px;text-align:center;
 box-shadow:0 1px 2px rgba(19,26,36,.05)}
.nome{font-size:20px;font-weight:700;letter-spacing:-.01em}
.cargo{font-size:13.5px;color:#65707E;margin-top:3px}
.dado{font-size:14.5px;color:#4A5666;margin-top:16px;line-height:1.75}
.dado a{color:#1A73E8;text-decoration:none}
.pri{display:block;background:#1A73E8;color:#fff;border-radius:12px;padding:14px;margin-top:20px;
 text-decoration:none;font-weight:600;font-size:15.5px}
.sec{display:block;background:#fff;color:#1A73E8;border:1px solid #E3E9F0;border-radius:12px;padding:13px;
 margin-top:9px;text-decoration:none;font-weight:500;font-size:14.5px}
.ajuda{font-size:11.5px;color:#8892A0;margin-top:14px;line-height:1.5}
</style>
</head>
<body>
<div class="w">
  <a class="volta" href="/m/${esc(slug)}${plateCode ? `?d=${esc(plateCode)}` : ""}">‹ Voltar</a>
  <div class="card">
    <div class="nome">${esc(v.nome || "")}</div>
    ${v.cargo ? `<div class="cargo">${esc(v.cargo)}${titulo ? " · " + esc(titulo) : ""}</div>`
              : (titulo ? `<div class="cargo">${esc(titulo)}</div>` : "")}
    <div class="dado">
      ${v.telefone ? `<a href="tel:+${esc(paraWhats(v.telefone))}">${esc(v.telefone)}</a><br>` : ""}
      ${v.email ? `<a href="mailto:${esc(v.email)}">${esc(v.email)}</a>` : ""}
    </div>
    <a class="pri" href="/m/${esc(slug)}?v=${esc(b.id)}${q}">Salvar nos contatos</a>
    ${zap ? `<a class="sec" href="https://wa.me/${esc(zap)}" rel="noopener">Chamar no WhatsApp</a>` : ""}
    <div class="ajuda">Se o arquivo de contato não abrir no seu celular, os dados acima continuam aqui.</div>
  </div>
</div>
</body>
</html>`;
}

// vCard 3.0 — mais compatível que o 4.0 em Android antigo. Sem foto embutida:
// peso e problemas de codificação sem retorno.
export function vcard(v, org) {
  const linha = (s) => String(s || "").replace(/[\r\n]+/g, " ").replace(/([,;\\])/g, "\\$1");
  const tel = soDigitos(v.telefone);
  const partes = [
    "BEGIN:VCARD", "VERSION:3.0",
    `N:;${linha(v.nome)};;;`, `FN:${linha(v.nome)}`,
    org ? `ORG:${linha(org)}` : null,
    v.cargo ? `TITLE:${linha(v.cargo)}` : null,
    tel ? `TEL;TYPE=CELL:+${tel.length <= 11 ? "55" + tel : tel}` : null,
    v.email ? `EMAIL;TYPE=INTERNET:${linha(v.email)}` : null,
    "END:VCARD"
  ].filter(Boolean);
  return partes.join("\r\n") + "\r\n";
}

// ============================================================
export default async function handler(req, res) {
  const slug = String(req.query.slug || "").trim().toLowerCase();
  // Nunca cachear o HTML: o lojista publica e espera ver o resultado agora, e
  // o registro de abertura precisa acontecer de verdade a cada visita.
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

  if (!slug) return res.status(404).send(naoEncontrado());

  try {
    const { data: exp, error } = await supabase
      .from("experiences")
      .select("id, business_id, slug, published, published_mode, archived_at")
      .eq("slug", slug).maybeSingle();

    if (error) {
      // Banco fora não é "menu não existe". Pedir pra tentar de novo é honesto;
      // dizer "não encontrado" seria mentir sobre o menu do cliente.
      console.error("[m/slug] falha ao buscar experiência:", error.message || error);
      return res.status(503).send(instavel());
    }
    if (!exp || exp.archived_at || !exp.published) return res.status(404).send(naoEncontrado());

    const { data: biz } = await supabase
      .from("businesses").select("id, name, place_id").eq("id", exp.business_id).maybeSingle();
    if (!biz) return res.status(404).send(naoEncontrado());

    // Qual dispositivo trouxe a pessoa até aqui (quando veio de um toque).
    // Sem `d`, veio pelo link compartilhado — que é o §7 do briefing.
    const code = String(req.query.d || "").trim().toUpperCase();
    let plate = null;
    if (code) {
      const { data } = await supabase.from("plates").select("id, code").eq("code", code).maybeSingle();
      plate = data || null;
    }

    const botoes = (exp.published.buttons || []).filter((b) => b.enabled !== false);
    const acha = (id) => botoes.find((b) => b.id === String(id || "")) || null;

    // ── Foto (intermediada; a chave nunca sai do servidor) ──
    if (req.query.foto) {
      const ref = await referenciaDaFoto(biz.place_id);
      if (!ref) return res.status(404).end();
      const r = await fetchWithTimeout(
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=220&photo_reference=${encodeURIComponent(ref)}&key=${process.env.PLACES_API_KEY}`,
        {}, 5000
      );
      if (!r.ok) return res.status(404).end();
      const buf = Buffer.from(await r.arrayBuffer());
      // Cache longo de propósito: é a borda que absorve as visitas, e não o
      // Google — que cobra por exibição.
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
      res.setHeader("Content-Type", r.headers.get("content-type") || "image/jpeg");
      return res.status(200).send(buf);
    }

    // ── vCard ──
    if (req.query.v) {
      const b = acha(req.query.v);
      if (!b || b.type !== "contact") return res.status(404).end();
      await registrar({ exp, plate, kind: "click", botao: b, req });
      const nome = (b.value?.nome || "contato").normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "contato";
      res.setHeader("Content-Type", "text/vcard; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${nome}.vcf"`);
      return res.status(200).send(vcard(b.value || {}, biz.name));
    }

    // ── Clique: registra e encaminha ──
    // O registro acontece no SERVIDOR, e não por script na página, porque
    // evento não gravado não volta — e é este número que a tela de Resultados
    // vai mostrar. Um salto a mais, e o cliente já estava navegando.
    if (req.query.go) {
      const b = acha(req.query.go);
      if (!b) return res.redirect(302, `/m/${encodeURIComponent(slug)}`);
      const url = destino(b, biz, slug);
      if (!url) return res.redirect(302, `/m/${encodeURIComponent(slug)}`);
      await registrar({ exp, plate, kind: "click", botao: b, req });
      return res.redirect(302, url);
    }

    // ── Sub-tela do contato ──
    if (req.query.c) {
      const b = acha(req.query.c);
      if (!b || b.type !== "contact") return res.redirect(302, `/m/${encodeURIComponent(slug)}`);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(paginaContato({ exp, biz, b, slug, plateCode: plate?.code || null }));
    }

    // ── A página ──
    await registrar({ exp, plate, kind: "open", botao: null, req });
    const temFoto = (exp.published.brand?.logo === "google") && !!(await referenciaDaFoto(biz.place_id));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(pagina({ exp, biz, temFoto, slug, plateCode: plate?.code || null }));
  } catch (err) {
    console.error("[m/slug] erro:", err);
    return res.status(500).send(instavel());
  }
}

// ── Páginas de exceção ──────────────────────────────────────
// Escritas pro CONSUMIDOR, que não sabe o que é um menu nem quem somos: dizem
// o que fazer, não o que falhou.
const casca = (titulo, texto) => `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title><meta name="robots" content="noindex"><style>
body{margin:0;background:#F2F6FC;color:#131A24;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,system-ui,sans-serif;
display:grid;place-items:center;min-height:100vh;padding:24px;text-align:center}
h1{font-size:19px;margin:0 0 8px}p{color:#65707E;font-size:14.5px;margin:0;max-width:32ch;line-height:1.6}
</style></head><body><div><h1>${titulo}</h1><p>${texto}</p></div></body></html>`;

const naoEncontrado = () => casca("Página não encontrada", "Este endereço não está mais disponível. Se você chegou aqui por uma placa ou cartão, avise o estabelecimento.");
const instavel = () => casca("Não foi possível abrir agora", "Tente de novo em alguns instantes.");
