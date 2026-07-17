// ============================================================
// StarTouch — FÁBRICA DE ARTIGOS (build step)
// ============================================================
// Gera as páginas de artigo das dicas JÁ PUBLICADAS (publishedTips),
// no molde exato dos artigos do site, e atualiza o índice + sitemap.
// Roda no build (npm run build, antes do vite) — o vite copia public/
// pro deploy. Idempotente: regenera do zero a cada build.
//
// Só mexe no que é AUTO-GERADO: escreve public/artigos/<slug>.html e
// substitui APENAS a região entre marcadores <!-- TIPS:START/END -->
// no index.html e no sitemap.xml. Não toca nos artigos escritos à mão.
//
// ARTICLES_ALL=1 → gera TODAS as dicas (ignora a agenda) — útil pra prever.
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  TIPS, publishedTips, publishDateOf, themeLabel, articleUrl,
} from "../api/_lib/tips-content.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ARTIGOS = join(ROOT, "public", "artigos");
const SITE = "https://startouch.com.br";

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");

function readingTime(tip) {
  const words = (tip.lead + " " + tip.paragraphs.join(" ")).split(/\s+/).length;
  return Math.max(2, Math.round(words / 200)); // ~200 palavras/min, mínimo 2
}

// Bloco "Continue lendo" — 3 links (mistura artigos-guia consagrados).
const RELATED = [
  { slug: "otimizar-google-meu-negocio", title: "Como otimizar o Google Meu Negócio: o guia completo", desc: "Seção por seção do perfil e o impacto de cada uma no ranking local." },
  { slug: "como-conseguir-mais-avaliacoes-no-google", title: "Como conseguir mais avaliações no Google: 7 estratégias", desc: "As estratégias que funcionam pra negócios locais, sem violar regras." },
  { slug: "como-responder-avaliacoes-negativas-no-google", title: "Como responder avaliações negativas (10 modelos)", desc: "Passo a passo pra responder crítica sem piorar a situação." },
];

function relatedFor(tip) {
  return RELATED.filter((r) => r.slug !== tip.slug).slice(0, 3);
}

function articleHtml(tip, i) {
  const url = SITE + articleUrl(tip);
  const pub = publishDateOf(i);
  const mins = readingTime(tip);
  const eyebrow = themeLabel(tip.tag);
  const prose = tip.paragraphs.map((p) => `  <p>${esc(p)}</p>`).join("\n\n");
  const related = relatedFor(tip).map((r) => `      <a class="art-related-card" href="/artigos/${r.slug}">
        <p class="art-related-card-title">${esc(r.title)}</p>
        <p class="art-related-card-desc">${esc(r.desc)}</p>
      </a>`).join("\n");

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: tip.seoTitle,
    description: tip.metaDescription,
    image: `${SITE}/og-image.png`,
    author: { "@type": "Organization", name: "StarTouch" },
    publisher: {
      "@type": "Organization",
      name: "StarTouch",
      logo: { "@type": "ImageObject", url: `${SITE}/startouch-logo.png` },
    },
    datePublished: pub,
    dateModified: pub,
    mainEntityOfPage: url,
    inLanguage: "pt-BR",
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '767972996338904');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=767972996338904&ev=PageView&noscript=1"/></noscript>
<!-- End Meta Pixel Code -->
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-HCLV0Z640L"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-HCLV0Z640L');
</script>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(tip.seoTitle)} | StarTouch</title>
<meta name="description" content="${escAttr(tip.metaDescription)}"/>
<link rel="canonical" href="${url}"/>

<meta property="og:type" content="article"/>
<meta property="og:title" content="${escAttr(tip.headline)}"/>
<meta property="og:description" content="${escAttr(tip.metaDescription)}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:image" content="${SITE}/og-image.png"/>
<meta property="og:site_name" content="StarTouch"/>
<meta property="og:locale" content="pt_BR"/>

<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${escAttr(tip.headline)}"/>
<meta name="twitter:description" content="${escAttr(tip.metaDescription)}"/>
<meta name="twitter:image" content="${SITE}/og-image.png"/>

<link rel="stylesheet" href="/startouch-vars.css"/>
<link rel="stylesheet" href="/artigos/article.css"/>
<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
<link rel="apple-touch-icon" href="/startouch-logo.png"/>

<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
</head>
<body>

<header class="art-header">
  <div class="art-header-inner">
    <a class="art-logo" href="/" aria-label="StarTouch — início">
      <img src="/startouch-logo-dark.png" alt="StarTouch"/>
    </a>
    <a class="art-header-cta" href="/app?from=web">Ver minha presença grátis</a>
  </div>
</header>

<main class="art-container">
  <p class="art-breadcrumb"><a href="/artigos">Artigos</a> · ${esc(eyebrow)}</p>

  <span class="art-eyebrow">${esc(eyebrow)}</span>
  <h1 class="art-h1">${esc(tip.headline)}</h1>
  <p class="art-lead">${esc(tip.lead)}</p>

  <div class="art-meta">
    <span>StarTouch</span>
    <span class="art-meta-dot"></span>
    <span>Leitura: ${mins} min</span>
  </div>

  <div class="art-prose">

${prose}

  <div class="art-cta">
    <h3>Veja como está a sua presença hoje</h3>
    <p>30 segundos, sem cadastro: sua nota, sua posição local e o que está te segurando.</p>
    <a class="art-cta-btn" href="/app?from=web">
      Ver minha presença grátis
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    </a>
  </div>

  </div>

  <aside class="art-related">
    <p class="art-related-title">Continue lendo</p>
    <div class="art-related-list">
${related}
    </div>
  </aside>
</main>

<footer class="art-footer">
  <p>© StarTouch — <a href="/">Início</a> · <a href="/artigos">Artigos</a> · <a href="/kit">Dispositivos</a></p>
</footer>

</body>
</html>
`;
}

// ── Card do índice (idx-grid) ───────────────────────────────
function indexCard(tip) {
  return `  <a class="idx-card" href="${articleUrl(tip)}">
    <span class="idx-card-tag">${esc(themeLabel(tip.tag))}</span>
    <h2 class="idx-card-title">${esc(tip.headline)}</h2>
    <p class="idx-card-desc">${esc(tip.metaDescription)}</p>
    <span class="idx-card-meta">Leitura: ${readingTime(tip)} min</span>
  </a>`;
}

// ── <url> do sitemap ────────────────────────────────────────
function sitemapUrl(tip, i) {
  return `  <url>
    <loc>${SITE}${articleUrl(tip)}</loc>
    <lastmod>${publishDateOf(i)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
}

// Substitui a região entre marcadores; se não houver marcadores, avisa.
function replaceRegion(text, startMark, endMark, inner, file) {
  const s = text.indexOf(startMark);
  const e = text.indexOf(endMark);
  if (s === -1 || e === -1) {
    console.warn(`[build-articles] marcadores ausentes em ${file} — pulei essa parte.`);
    return text;
  }
  return text.slice(0, s + startMark.length) + "\n" + inner + "\n" + text.slice(e);
}

// ── Run ─────────────────────────────────────────────────────
// À PROVA DE FALHA: roda no build do site. Qualquer erro aqui só loga um
// aviso — NUNCA derruba o build (o site tem que subir de qualquer jeito).
try {
  const all = process.env.ARTICLES_ALL === "1";
  const now = Date.now();
  const list = all ? TIPS : publishedTips(now);
  const indexOf = (tip) => TIPS.indexOf(tip);

  let wrote = 0;
  for (const tip of list) {
    try {
      writeFileSync(join(ARTIGOS, `${tip.slug}.html`), articleHtml(tip, indexOf(tip)), "utf8");
      wrote++;
    } catch (e) { console.warn(`[build-articles] artigo ${tip.slug}:`, e.message); }
  }

  // Índice: injeta os cards (mais novos primeiro) na região marcada.
  try {
    const idxPath = join(ARTIGOS, "index.html");
    let idx = readFileSync(idxPath, "utf8");
    const cards = [...list].reverse().map(indexCard).join("\n\n");
    idx = replaceRegion(idx, "<!-- TIPS:START -->", "<!-- TIPS:END -->", cards, "index.html");
    writeFileSync(idxPath, idx, "utf8");
  } catch (e) { console.warn("[build-articles] index:", e.message); }

  // Sitemap: injeta as <url> na região marcada.
  try {
    const smPath = join(ROOT, "public", "sitemap.xml");
    let sm = readFileSync(smPath, "utf8");
    const urls = list.map((tip) => sitemapUrl(tip, indexOf(tip))).join("\n");
    sm = replaceRegion(sm, "<!-- TIPS:START -->", "<!-- TIPS:END -->", urls, "sitemap.xml");
    writeFileSync(smPath, sm, "utf8");
  } catch (e) { console.warn("[build-articles] sitemap:", e.message); }

  console.log(`[build-articles] ${wrote} artigo(s) gerado(s)${all ? " (ARTICLES_ALL)" : ""}.`);
} catch (e) {
  console.warn("[build-articles] falha geral (build segue normalmente):", e && e.message);
}
process.exit(0);
