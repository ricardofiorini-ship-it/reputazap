// ============================================================
// StarTouch — FÁBRICA DAS PÁGINAS LEGAIS (build step)
// ============================================================
// Gera public/privacidade.html e public/termos.html a partir dos .md em
// docs/legal/. Roda no build (npm run build), então página e documento nunca
// divergem: editar o .md e dar deploy é o fluxo. NÃO editar o HTML à mão —
// ele é sobrescrito no próximo build. (Foi a divergência AGENTS.md/CLAUDE.md
// que ensinou isso aqui.)
//
// Regra dura: estas páginas NÃO levam GA4 nem Meta Pixel. Quem abre uma
// política de privacidade não pode ser rastreado por abri-la. Mesma decisão
// da /avaliar (ver CLAUDE.md).
//
// Enquanto o .md tiver o bloco "⚠️ RASCUNHO", a página sai com <meta
// robots=noindex> e o aviso visível no topo. A data de vigência entra no .md
// quando as travas do checklist (docs/legal/README.md) caírem — é o último
// passo, não um carimbo de deploy.
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SITE = "https://startouch.com.br";

const DOCS = [
  {
    md: "politica-de-privacidade.md",
    out: "privacidade.html",
    path: "/privacidade",
    title: "Política de Privacidade — StarTouch",
    desc: "Como a StarTouch trata dados pessoais de lojistas, consumidores finais e avaliadores: o que coletamos, com que base legal, com quem compartilhamos e por quanto tempo guardamos."
  },
  {
    md: "termos-de-uso.md",
    out: "termos.html",
    path: "/termos",
    title: "Termos de Uso — StarTouch",
    desc: "As regras de uso dos dispositivos NFC e da plataforma StarTouch: o que está incluído, o que é contratado à parte, garantia, entrega e responsabilidades."
  }
];

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");

// Inline: **negrito**, *itálico*, `código`, [texto](url). Escapa antes, então
// nada do .md vira HTML por acidente.
function inline(s) {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${escAttr(u)}">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

const isTableRow  = (l) => /^\|.*\|\s*$/.test(l);
const isTableSep  = (l) => /^\|[\s:|-]+\|\s*$/.test(l);
const cells = (l) => l.replace(/^\||\|\s*$/g, "").split("|").map((c) => c.trim());

// Subconjunto de markdown suficiente pros dois documentos: h1-h3, parágrafo,
// lista, tabela, citação (o bloco de rascunho), regra horizontal.
function mdToHtml(md) {
  const linhas = md.split(/\r?\n/);
  const out = [];
  let i = 0;

  while (i < linhas.length) {
    const l = linhas[i];

    if (!l.trim()) { i++; continue; }

    if (/^---+\s*$/.test(l)) { out.push("<hr/>"); i++; continue; }

    const h = l.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const n = h[1].length;
      // O h1 do .md vira o cabeçalho da página, não entra na prosa.
      if (n > 1) out.push(`<h${n}>${inline(h[2])}</h${n}>`);
      i++;
      continue;
    }

    // Citação — usada pelo bloco de rascunho. Vira callout.
    if (l.startsWith(">")) {
      const buf = [];
      while (i < linhas.length && linhas[i].startsWith(">")) {
        buf.push(linhas[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<div class="art-callout">${inline(buf.join(" ").trim())}</div>`);
      continue;
    }

    if (isTableRow(l) && isTableSep(linhas[i + 1] || "")) {
      const head = cells(l);
      i += 2;
      const corpo = [];
      while (i < linhas.length && isTableRow(linhas[i])) { corpo.push(cells(linhas[i])); i++; }
      const th = head.map((c) => `<th>${inline(c)}</th>`).join("");
      const tr = corpo.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("\n        ");
      // Cabeçalho vazio = tabela de duas colunas sem título (retenção). Sem thead.
      const thead = head.some((c) => c) ? `<thead><tr>${th}</tr></thead>` : "";
      out.push(`<div class="art-table-wrap"><table class="art-table">${thead}<tbody>\n        ${tr}\n      </tbody></table></div>`);
      continue;
    }

    if (/^[-*]\s+/.test(l)) {
      const itens = [];
      while (i < linhas.length && /^[-*]\s+/.test(linhas[i])) {
        itens.push(`<li>${inline(linhas[i].replace(/^[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>\n        ${itens.join("\n        ")}\n      </ul>`);
      continue;
    }

    // Parágrafo: junta até a linha em branco.
    const p = [];
    while (i < linhas.length && linhas[i].trim() && !/^[#>|-]/.test(linhas[i])) { p.push(linhas[i].trim()); i++; }
    if (p.length) out.push(`<p>${inline(p.join(" "))}</p>`);
    else i++;
  }
  return out.join("\n\n      ");
}

function pagina(doc, md) {
  const rascunho = md.includes("RASCUNHO — NÃO VIGENTE");
  const vigencia = (md.match(/vigente a partir de (.+)\*\*/) || [])[1] || "";
  const datado = vigencia && !vigencia.includes("[");
  // A versao vem do .md, nao chumbada aqui. Estava "1.0" fixa em dois lugares
  // (o rotulo impresso e a regex que tira a linha do corpo); na primeira
  // atualizacao da Politica a regex deixaria de casar e o documento sairia
  // com a versao repetida no corpo e a errada no topo -- sem erro nenhum.
  const versao = (md.match(/^\*\*Vers(?:ã|a)o\s+([\d.]+)\s*—/m) || [])[1] || "1.0";
  const h1 = (md.match(/^#\s+(.*)$/m) || [])[1] || doc.title;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<!-- SEM GA4 e SEM Meta Pixel nesta página, DE PROPÓSITO: quem abre uma
     política de privacidade não pode ser rastreado por abri-la. Mesma
     decisão da /avaliar. NÃO REINTRODUZIR.
     O consent.js entra em modo "data-prefs-only": NAO carrega tag nenhuma,
     só permite reabrir as preferências de cookies (revogação prometida no
     §6.1 da Política). Sem o atributo, ele carregaria GA4 e Pixel aqui. -->
<script src="/consent.js" data-prefs-only></script>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escAttr(doc.title)}</title>
<meta name="description" content="${escAttr(doc.desc)}"/>
<meta name="robots" content="${rascunho ? "noindex,nofollow" : "index,follow"}"/>
<link rel="canonical" href="${SITE}${doc.path}"/>
<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
<link rel="apple-touch-icon" href="/startouch-logo.png"/>
<link rel="stylesheet" href="/startouch-vars.css"/>
<link rel="stylesheet" href="/artigos/article.css"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${escAttr(doc.title)}"/>
<meta property="og:description" content="${escAttr(doc.desc)}"/>
<meta property="og:url" content="${SITE}${doc.path}"/>
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
  <p class="art-breadcrumb"><a href="/">Início</a> · Documentos legais</p>

  <h1 class="art-h1">${esc(h1)}</h1>
  ${datado ? `<p class="art-meta">Versão ${esc(versao)} — vigente a partir de ${esc(vigencia)}</p>` : ""}

  <div class="art-prose">
      ${mdToHtml(md.replace(/^#\s+.*$/m, "").replace(/^\*\*Vers(?:ã|a)o\s+[\d.]+.*$/m, ""))}
  </div>
</main>

<footer class="art-footer">
  <p>© StarTouch — <a href="/">Início</a> · <a href="/privacidade">Privacidade</a> · <a href="/termos">Termos</a> · <a href="#" onclick="window.stConsent&amp;&amp;window.stConsent.abrir();return false;">Preferências de cookies</a> · <a href="/artigos">Artigos</a></p>
</footer>

</body>
</html>
`;
}

let n = 0;
for (const doc of DOCS) {
  const md = readFileSync(join(ROOT, "docs", "legal", doc.md), "utf8");
  writeFileSync(join(ROOT, "public", doc.out), pagina(doc, md), "utf8");
  n++;
}
console.log(`✅  build-legal: ${n} páginas legais geradas a partir de docs/legal/.`);
