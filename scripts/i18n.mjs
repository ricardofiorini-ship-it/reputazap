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
import { parse as parseJs } from "@babel/parser";
import { dirname, resolve, relative } from "node:path";

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

// ============================================================
// PAINÉIS REACT. Não há HTML pra ler: os textos moram no código. A lista
// de arquivos vem SEGUINDO OS IMPORTS a partir da entrada (nunca escolhida
// a dedo) — tela nova importada no painel entra na vigilância sozinha.
//
// Todo texto candidato precisa estar no dicionário em `t` (traduzido), em
// `p` (frase montada com variável: a chave é a regex que este script gera)
// ou em `ignore` (string que não aparece na tela: nome de evento, valor de
// lógica...). Sem uma das três, o build para.
//
// No navegador só existe troca de texto solto (nada de `h`): trocar
// innerHTML por baixo do React quebraria a reconciliação dele.
// ============================================================
const APPS = {
  app: { entry: "src/main-v2.jsx", shell: "index-v2.html" },
};

function parseCode(code, file) {
  try {
    return parseJs(code, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  } catch (e) {
    throw new Error(`[i18n] não consegui ler ${file}: ${e.message}`);
  }
}

function appFiles(entry) {
  const seen = new Set();
  const queue = [join(ROOT, entry)];
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f)) continue;
    seen.add(f);
    const ast = parseCode(readFileSync(f, "utf8"), f);
    for (const node of ast.program.body) {
      const src = /^(ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration)$/.test(node.type) && node.source?.value;
      if (!src || !src.startsWith(".")) continue;
      const base = resolve(dirname(f), src);
      const hit = [base, base + ".jsx", base + ".js", join(base, "index.jsx"), join(base, "index.js")]
        .find((x) => /\.(jsx?|mjs)$/.test(x) && existsSync(x));
      if (hit) queue.push(hit);
    }
  }
  return [...seen];
}

// Atributos cujo valor nunca é texto de tela.
const NOT_TEXT_ATTR = /^(className|style|key|id|href|src|type|name|rel|target|role|htmlFor|d|viewBox|fill|stroke|width|height|variant|icon|size|color|tone|as|method|autoComplete|inputMode|mode|pattern|accept|ref|points|x|y|cx|cy|r|rx|ry|x1|x2|y1|y2|transform|strokeWidth|strokeLinecap|strokeLinejoin|xmlns|loading|decoding|lang|dir|to|value|defaultValue|min|max|step|sizes|srcSet|fetchPriority|referrerPolicy|allow|sandbox|data-[\w-]+|aria-(?!label)[\w-]+)$/;
// Funções cujos argumentos nunca são texto de tela.
const NOT_TEXT_CALL = new Set(["log", "warn", "error", "info", "debug", "fetch", "gtag", "fbq", "track", "trackEvent", "getItem", "setItem", "removeItem", "from", "select", "eq", "neq", "in", "order", "querySelector", "querySelectorAll", "getElementById", "addEventListener", "removeEventListener", "setAttribute", "getAttribute", "removeAttribute", "toLocaleString", "toLocaleDateString", "toLocaleTimeString", "NumberFormat", "DateTimeFormat", "postMessage", "matchMedia", "startsWith", "endsWith", "split", "match", "test", "includes", "indexOf", "padStart", "padEnd", "createElement", "api", "get", "post", "del", "put", "require", "RegExp", "URL", "URLSearchParams", "has", "delete", "replaceState", "pushState", "open"]);

const LETTER = /[A-Za-zÀ-ÿ]/;
const DISPLAY_KEY = /^(a|b|t|d|label|title|titulo|desc|descricao|text|texto|sub|subtitle|hint|msg|mensagem|nome|cta|badge|placeholder|help|ajuda|tip|dica|legenda|caption|rotulo|frase|resumo|detalhe|note|nota)$/;
function uiLike(s) {
  s = norm(s);
  if (s.length < 2 || !LETTER.test(s)) return false;
  if (/^(https?:|\/|#|\.|data:|mailto:|tel:|wa\.me|@)/.test(s)) return false;
  // Minúsculas sem acento: id, classe, chave... a não ser que tenha cara de frase.
  if (/^[a-z0-9_\-\s.:\/#,()%+*|&]*$/.test(s) && !/(^| )(de|do|da|dos|das|em|no|na|nos|nas|com|para|pra|sem|seu|sua|seus|suas|os|as|um|uma|que|mais|por|e|ou|ao|aos)( |$)/.test(s)) return false;
  if (/^[A-Z0-9_]{2,}$/.test(s)) return false;                           // CONSTANTE
  if (/^[a-z]+[A-Z][A-Za-z0-9]*$/.test(s)) return false;                // camelCase
  if (/[{}=<>]|[a-z-]+\s*:\s*[^;\s]+;|#[0-9A-Fa-f]{3,8}\b|\b\d+(px|deg|ms|vh|vw|em|rem)\b|rgba?\(|var\(--|cubic-bezier|linear-gradient/.test(s)) return false; // CSS/código
  if (/^[\w.-]+@[\w.-]+$/.test(s)) return false;                         // e-mail
  return true;
}
// O painel guarda avisos como "ok:Salvo" / "err:Falhou" e tira o prefixo na
// hora de mostrar (AppV2: notice.replace(/^(ok|err):/, '')). A chave é o que
// aparece na tela, então o prefixo sai aqui também.
const stripTag = (s) => String(s).replace(/^(ok|err):/, "");
function rxFromQuasis(quasis) {
  const joined = norm(quasis.map((q) => q.value.cooked ?? q.value.raw).join("\u0000"));
  return "^" + joined.split("\u0000").map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.+?)") + "$";
}

function jsxFromCode(code, file, t = new Map(), p = new Map()) {
  const where = (line) => `${relative(ROOT, file).replace(/\\/g, "/")}:${line}`;
  const add = (map, k, line) => { if (!map.has(k)) map.set(k, where(line)); };
  const ast = parseCode(code, file);
  const visit = (node, parent, ctx) => {
    if (!node || typeof node.type !== "string") return;
    const line = node.loc?.start.line;
    switch (node.type) {
      case "ImportDeclaration": case "ExportAllDeclaration": return;
      case "JSXText": { const k = norm(node.value); if (k && LETTER.test(k)) add(t, k, line); return; }
      case "JSXAttribute": {
        const name = node.name.type === "JSXNamespacedName" ? node.name.name.name : node.name.name;
        if (NOT_TEXT_ATTR.test(name)) return;
        if (node.value?.type === "StringLiteral") {
          const k = norm(node.value.value);
          if (k && LETTER.test(k) && (ATTRS.includes(name) || uiLike(k))) add(t, k, line);
          return;
        }
        return visit(node.value, node, ctx);
      }
      case "StringLiteral": {
        if (ctx === "skip") return;
        const k = norm(stripTag(node.value));
        if (ctx === "jsxchild" ? (k && LETTER.test(k)) : uiLike(k)) add(t, k, line);
        return;
      }
      case "TemplateLiteral": {
        if (ctx === "skip" || parent?.type === "TaggedTemplateExpression") return;
        const text = node.quasis.map((q) => q.value.cooked ?? q.value.raw).join(" ");
        if (uiLike(text)) {
          if (node.expressions.length === 0) add(t, norm(text), line);
          else add(p, rxFromQuasis(node.quasis), line);
        }
        node.expressions.forEach((e) => visit(e, node, ctx === "jsxchild" ? undefined : ctx));
        return;
      }
      case "CallExpression": case "NewExpression": case "OptionalCallExpression": {
        const c = node.callee;
        const nm = c.type === "Identifier" ? c.name : (c.property?.name || c.property?.value);
        visit(c, node, undefined);
        const skipArgs = NOT_TEXT_CALL.has(nm) || c.object?.name === "console";
        node.arguments.forEach((a) => visit(a, node, skipArgs ? "skip" : undefined));
        return;
      }
      case "BinaryExpression":
        // "Erro ao salvar: " + msg → vira UM texto na tela: regex com a variável.
        if (node.operator === "+" && ctx !== "skip") {
          const parts = [];
          const flat = (n) => (n.type === "BinaryExpression" && n.operator === "+" ? (flat(n.left), flat(n.right)) : parts.push(n));
          flat(node);
          const lits = parts.filter((x) => x.type === "StringLiteral");
          if (lits.length && lits.length < parts.length && lits.some((x) => uiLike(stripTag(x.value)))) {
            const SEP = "\u0000";
            const joined = norm(parts.map((x, i) => (x.type === "StringLiteral" ? (i === 0 ? stripTag(x.value) : x.value) : SEP)).join(""));
            const rx = "^" + joined.split(SEP).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.+?)") + "$";
            add(p, rx.replace(/\(\.\+\?\)(\s*\(\.\+\?\))+/g, "(.+?)"), line);
            parts.filter((x) => x.type !== "StringLiteral").forEach((x) => visit(x, node, undefined));
            return;
          }
        }
        if (/^[!=]==?$/.test(node.operator)) {
          if (node.left.type !== "StringLiteral") visit(node.left, node, undefined);
          if (node.right.type !== "StringLiteral") visit(node.right, node, undefined);
          return;
        }
        break;
      case "SwitchCase": node.consequent.forEach((x) => visit(x, node, undefined)); return;
      case "ObjectProperty": case "ClassProperty": {
        if (node.computed) visit(node.key, node, undefined);
        // Campos de rótulo (label, a, b, d...) são texto de tela mesmo em
        // minúsculas soltas: { a: 'Mais', b: 'oportunidades' }.
        const kn = node.key?.name ?? node.key?.value;
        if (ctx !== "skip" && node.value?.type === "StringLiteral" && DISPLAY_KEY.test(kn || "")) {
          const k = norm(stripTag(node.value.value));
          const tecnico = /^(https?:|\/|#)/.test(k) || /^[a-z]+[A-Z_]/.test(k) || /^[a-z0-9_]+-[a-z0-9_-]+$/.test(k)
            || /^[MmLlHhVvCcZz] ?-?[\d.]/.test(k); // caminho de SVG (d: "M12 2l...")
          if (k && LETTER.test(k) && !tecnico) add(t, k, node.value.loc?.start.line);
          return;
        }
        return visit(node.value, node, ctx === "skip" ? "skip" : undefined);
      }
      case "MemberExpression": case "OptionalMemberExpression":
        visit(node.object, node, undefined);
        if (node.computed && node.property.type !== "StringLiteral") visit(node.property, node, undefined);
        return;
      case "JSXExpressionContainer":
        return visit(node.expression, node, /^JSX(Element|Fragment)$/.test(parent?.type) ? "jsxchild" : undefined);
      case "ConditionalExpression":
        visit(node.test, node, undefined); visit(node.consequent, node, ctx); visit(node.alternate, node, ctx); return;
      case "LogicalExpression":
        visit(node.left, node, ctx === "jsxchild" ? undefined : ctx); visit(node.right, node, ctx); return;
    }
    // "skip" desce (argumento de função técnica); "jsxchild" só vale pro filho direto.
    const childCtx = ctx === "skip" ? "skip" : undefined;
    for (const key of Object.keys(node)) {
      if (/^(loc|start|end|extra|leadingComments|trailingComments|innerComments)$/.test(key)) continue;
      const v = node[key];
      if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === "string") visit(x, node, childCtx); }
      else if (v && typeof v.type === "string") visit(v, node, childCtx);
    }
  };
  visit(ast.program, null, undefined);
  return { t, p };
}

function appCandidates(name) {
  const app = APPS[name];
  const t = new Map(), p = new Map();
  for (const f of appFiles(app.entry)) jsxFromCode(readFileSync(f, "utf8"), f, t, p);
  const shell = candidates(readFileSync(join(ROOT, app.shell), "utf8"));
  for (const k of shell.t) if (!t.has(k)) t.set(k, app.shell);
  return { t, p };
}

function auditApp(c, dict) {
  const tk = Object.keys(dict.t || {}), pk = (dict.p || []).map((x) => x[0]), ig = dict.ignore || [];
  const orphan = [
    ...tk.filter((k) => !c.t.has(k)),
    ...pk.filter((k) => !c.p.has(k)),
    ...ig.filter((k) => !c.t.has(k) && !c.p.has(k)).map((k) => `(ignore) ${k}`),
  ];
  const known = new Set([...tk, ...pk, ...ig]);
  const missing = [...c.t.keys(), ...c.p.keys()].filter((k) => !known.has(k));
  return { orphan, missing };
}

function selfTest() {
  // Controle do extrator React: o que TEM que achar, e só isso.
  const code = 'const x = <div title="Abrir menu" className="a b">Olá {n} mundo<b>{`Faltam ${d} dias`}</b>{ok ? "Salvo!" : "Erro ao salvar"}</div>; if (s === "Pendente") gtag("event", "Clique Aqui"); const o = { label: "Plano Pro", cls: "btn-x" };';
  const jc = jsxFromCode(code, join(ROOT, "teste.jsx"));
  const want = ["Abrir menu", "Olá", "mundo", "Salvo!", "Erro ao salvar", "Plano Pro"];
  const jsxOk = want.every((k) => jc.t.has(k)) && jc.t.size === want.length && jc.p.size === 1 && jc.p.has("^Faltam (.+?) dias$");
  if (!jsxOk) { console.error("[i18n] SONDA CEGA (React): extrator do JSX fora do esperado.", [...jc.t.keys()], [...jc.p.keys()]); process.exit(1); }
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

if (cmd === "extract" && APPS[arg]) {
  // Painel React: { t: {texto: "arquivo:linha"}, p: {regex: "arquivo:linha"} }
  // só com o que ainda não está no dicionário em inglês.
  const c = appCandidates(arg);
  const en = join(DICTS, `${arg}.en.json`);
  const have = existsSync(en) ? JSON.parse(readFileSync(en, "utf8")) : {};
  const known = new Set([...Object.keys(have.t || {}), ...(have.p || []).map((x) => x[0]), ...(have.ignore || [])]);
  const out = { t: {}, p: {} };
  for (const [k, w] of c.t) if (!known.has(k)) out.t[k] = w;
  for (const [k, w] of c.p) if (!known.has(k)) out.p[k] = w;
  console.log(JSON.stringify(out, null, 2));
} else if (cmd === "extract") {
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
  const appCache = {};
  for (const f of readdirSync(DICTS).filter((x) => x.endsWith(".json"))) {
    const m = f.match(/^(.+)\.(en|es|zh)\.json$/);
    if (!m) { console.error(`[i18n] nome fora do padrão <pagina>.<en|es|zh>.json: ${f}`); fail++; continue; }
    let dict;
    try { dict = JSON.parse(readFileSync(join(DICTS, f), "utf8")); }
    catch (e) { console.error(`[i18n] ${f}: JSON inválido — ${e.message}`); fail++; continue; }
    let res;
    if (APPS[m[1]]) {
      appCache[m[1]] ??= appCandidates(m[1]);
      res = auditApp(appCache[m[1]], dict);
    } else {
      const pagePath = join(PUB, `${m[1]}.html`);
      if (!existsSync(pagePath)) { console.error(`[i18n] ${f}: página public/${m[1]}.html não existe`); fail++; continue; }
      res = audit(readFileSync(pagePath, "utf8"), dict);
    }
    const { orphan, missing } = res;
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
