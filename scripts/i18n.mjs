// ============================================================
// i18n.mjs — extrai textos pra traduzir e barra tradução quebrada (09/10/2026)
// ============================================================
// Par do public/i18n.js. Lá o português original É a chave da tradução; aqui
// garantimos que essas chaves continuam batendo com o português no ar.
//
//   node scripts/i18n.mjs extract landing   → JSON com tudo que falta traduzir
//                                             na página (pros dicionários)
//   node scripts/i18n.mjs check             → roda no `npm run build`
//
// O QUE O CHECK BARRA (pra cada public/i18n/<pagina>.<lingua>.json):
//   1. CHAVE ÓRFÃ — tradução cujo português não existe mais na página.
//      Alguém mexeu na frase e o estrangeiro voltou a ver português, calado.
//   2. TEXTO NOVO SEM TRADUÇÃO — frase visível do HTML que não está no
//      dicionário. Mesmo efeito, outra porta.
//   Conserto nos dois casos: `extract` mostra o que falta; traduzir e pôr
//   no JSON (as 3 línguas), apagando a chave velha.
//
// Texto escrito pelo JavaScript da página (carrinho, erros) não dá pra ver
// daqui com certeza — essas chaves só são conferidas contra o código-fonte,
// e o `?i18n-debug=1` no navegador lista o que escapou.
//
// Controles embutidos, como nas outras sondas: uma página-teste em que a
// sonda TEM que achar órfã e falta, e uma em que TEM que passar limpa.
// ============================================================
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHTML } from "linkedom";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PUB = join(ROOT, "public");
const DICTS = join(PUB, "i18n");

const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "TEMPLATE", "SVG"]);
const INLINE = new Set(["B", "STRONG", "EM", "I", "A", "SPAN", "BR", "SMALL", "U", "MARK", "SUP", "SUB", "S"]);
const ATTRS = ["placeholder", "title", "aria-label", "alt"];
const norm = (s) => String(s).replace(/\s+/g, " ").trim();
const hasWord = (s) => /[A-Za-zÀ-ÿ]/.test(s);

function skipped(el) {
  for (let n = el; n && n.nodeType === 1; n = n.parentNode) {
    if (SKIP.has(n.nodeName.toUpperCase())) return true;
    if (n.hasAttribute?.("data-i18n-skip") || n.getAttribute?.("translate") === "no") return true;
  }
  return false;
}

// Frase com negrito/link no meio: tem texto direto E só filhos inline.
function isMixed(el) {
  let text = false, inl = false;
  for (const c of el.childNodes) {
    if (c.nodeType === 3) { if (norm(c.nodeValue) && hasWord(c.nodeValue)) text = true; }
    else if (c.nodeType === 1) {
      if (!INLINE.has(c.nodeName.toUpperCase())) return false;
      if (c.nodeName.toUpperCase() !== "BR") inl = true;
    }
  }
  return text && inl;
}

// O que a página mostra, no mesmo recorte que o i18n.js usa no navegador.
export function candidates(html) {
  const { document } = parseHTML(html);
  const t = new Set(), h = new Map(), js = new Set();
  const title = document.querySelector("title");
  if (title && hasWord(title.textContent)) t.add(norm(title.textContent));
  const md = document.querySelector('meta[name="description"]');
  if (md && hasWord(md.getAttribute("content") || "")) t.add(norm(md.getAttribute("content")));
  const body = document.body;
  if (!body) return { t, h, js };
  const inH = new Set();
  for (const el of body.querySelectorAll("*")) {
    if (skipped(el)) continue;
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v && hasWord(v)) t.add(norm(v)); }
    if (el.nodeName === "INPUT" && /^(submit|button)$/i.test(el.getAttribute("type") || "") && hasWord(el.getAttribute("value") || "")) t.add(norm(el.getAttribute("value")));
    if ([...inH].some((p) => p.contains(el))) continue;
    if (isMixed(el)) { h.set(norm(el.textContent), el.innerHTML.trim()); inH.add(el); }
  }
  const walk = (node) => {
    for (const c of node.childNodes) {
      if (c.nodeType === 3) {
        const k = norm(c.nodeValue);
        if (k && hasWord(k) && !skipped(c.parentNode) && ![...inH].some((p) => p.contains(c))) t.add(k);
      } else if (c.nodeType === 1) walk(c);
    }
  };
  walk(body);
  // Strings dos <script> inline que parecem texto de tela (informativo).
  for (const s of document.querySelectorAll("script:not([src]):not([type='application/ld+json'])")) {
    for (const m of s.textContent.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.){3,}?)\1/g)) {
      const v = norm(m[2]);
      if (/[a-zà-ÿ]{3,} [a-zà-ÿ]/i.test(v) && !/[{}<>=;]|\$\{|^https?:|^\//.test(v)) js.add(v);
    }
  }
  return { t, h, js };
}

function present(html) {
  const c = candidates(html);
  const all = new Set([...c.t, ...c.h.keys(), ...c.js]);
  const flat = norm(html);
  return (k) => all.has(k) || flat.includes(k);
}

function audit(html, dict) {
  const c = candidates(html);
  const has = present(html);
  const keys = [...Object.keys(dict.t || {}), ...Object.keys(dict.h || {})];
  const pats = (dict.p || []).map((p) => new RegExp(p[0]));
  const orphan = keys.filter((k) => !has(k));
  const known = new Set(keys);
  const missing = [
    ...[...c.t].filter((k) => !known.has(k) && !pats.some((r) => r.test(k))),
    ...[...c.h.keys()].filter((k) => !known.has(k)),
  ];
  return { orphan, missing };
}

function selfTest() {
  const page = `<html><head><title>Olá mundo</title></head><body><p>Compre <b>agora</b> mesmo</p><button>Enviar pedido</button><span>Texto novo aqui</span></body></html>`;
  const bad = audit(page, { t: { "Olá mundo": "Hello world", "Enviar pedido": "Send order", "Frase que sumiu": "Gone" }, h: { "Compre agora mesmo": "Buy <b>now</b>" } });
  const good = audit(page, { t: { "Olá mundo": "Hello world", "Enviar pedido": "Send order", "Texto novo aqui": "New text" }, h: { "Compre agora mesmo": "Buy <b>now</b>" } });
  const ok =
    bad.orphan.length === 1 && bad.orphan[0] === "Frase que sumiu" &&
    bad.missing.length === 1 && bad.missing[0] === "Texto novo aqui" &&
    good.orphan.length === 0 && good.missing.length === 0;
  if (!ok) {
    console.error("[i18n] SONDA CEGA: os controles embutidos falharam.", JSON.stringify({ bad, good }));
    process.exit(1);
  }
}

const [, , cmd, arg] = process.argv;

if (cmd === "extract") {
  const html = readFileSync(join(PUB, `${arg}.html`), "utf8");
  const c = candidates(html);
  let have = { t: {}, h: {} };
  const en = join(DICTS, `${arg}.en.json`);
  if (existsSync(en)) have = JSON.parse(readFileSync(en, "utf8"));
  const out = { t: {}, h: {}, js: [] };
  for (const k of c.t) if (!(k in (have.t || {}))) out.t[k] = "";
  for (const [k, v] of c.h) if (!(k in (have.h || {}))) out.h[k] = v;
  for (const k of c.js) if (!(k in (have.t || {}))) out.js.push(k);
  console.log(JSON.stringify(out, null, 2));
} else if (cmd === "check") {
  selfTest();
  if (!existsSync(DICTS)) { console.log("[i18n] nenhum dicionário ainda"); process.exit(0); }
  let fail = 0, n = 0;
  for (const f of readdirSync(DICTS).filter((x) => x.endsWith(".json"))) {
    const m = f.match(/^(.+)\.(en|es|zh)\.json$/);
    if (!m) { console.error(`[i18n] nome fora do padrão <pagina>.<en|es|zh>.json: ${f}`); fail++; continue; }
    let dict;
    try { dict = JSON.parse(readFileSync(join(DICTS, f), "utf8")); }
    catch (e) { console.error(`[i18n] ${f}: JSON inválido — ${e.message}`); fail++; continue; }
    if (dict.source === "jsx") { n++; continue; } // painel React: conferido pelo ?i18n-debug=1
    const pagePath = join(PUB, `${m[1]}.html`);
    if (!existsSync(pagePath)) { console.error(`[i18n] ${f}: página public/${m[1]}.html não existe`); fail++; continue; }
    const { orphan, missing } = audit(readFileSync(pagePath, "utf8"), dict);
    n++;
    if (orphan.length || missing.length) {
      fail++;
      console.error(`\n[i18n] ${f}: ${orphan.length} chave(s) órfã(s), ${missing.length} texto(s) sem tradução`);
      orphan.slice(0, 10).forEach((k) => console.error(`   órfã:  ${k.slice(0, 110)}`));
      missing.slice(0, 10).forEach((k) => console.error(`   falta: ${k.slice(0, 110)}`));
    }
  }
  if (fail) {
    console.error(`\n[i18n] BUILD BARRADO. O português mudou e a tradução não acompanhou — o visitante`);
    console.error(`       estrangeiro veria português calado. Rode \`node scripts/i18n.mjs extract <pagina>\`,`);
    console.error(`       traduza nas 3 línguas e apague as chaves órfãs.`);
    process.exit(1);
  }
  console.log(`[i18n] ok — ${n} dicionário(s) batendo com as páginas`);
} else {
  console.error("uso: node scripts/i18n.mjs extract <pagina> | check");
  process.exit(1);
}
