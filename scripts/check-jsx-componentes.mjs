// ============================================================
// check-jsx-componentes.mjs — barra o deploy se a tela usa um componente
// que não existe (12/10/2026)
// ============================================================
// POR QUE ISTO EXISTE
//
// O Vite não reclama de `<PrecoMenu/>` quando `PrecoMenu` não está definido em
// lugar nenhum: o build passa, o deploy passa, e a tela só quebra NO NAVEGADOR
// do cliente — em branco, com o erro escondido no console. É a lição "build
// verde ≠ tela sobe" deste projeto. Em 12/10/2026 uma limpeza de código apagou
// o componente do preço do Pro junto com o vizinho; só não foi ao ar porque
// a checagem de traduções estranhou os textos sumindo — sorte, não proteção.
//
// O QUE FAZ
//
// Para cada arquivo .jsx do src/ (a lista vem do disco, não escolhida a dedo),
// lê todos os nomes declarados no arquivo (imports, funções, variáveis,
// parâmetros, desestruturações) e todo componente usado em JSX com letra
// maiúscula (`<Nome .../>`). Usado e nunca declarado = build barrado.
// Não olha escopo fino de propósito: é uma rede simples pra apagão de
// componente inteiro, que é o caso que custa caro.
//
// Controles embutidos: um trecho que TEM que ser barrado e um que TEM que
// passar. Se um dos dois falhar, a sonda está cega e o build para.
// ============================================================
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");
// Globais do navegador/JS que podem aparecer como componente (raro, mas existe).
const GLOBAIS = new Set(["React", "Fragment"]);

function arquivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return arquivos(p);
    return /\.jsx$/.test(n) && !n.startsWith("__") ? [p] : [];
  });
}

export function semDefinicao(code, nome = "arquivo") {
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
  const declarados = new Set();
  const usados = new Map();
  const nomesDePadrao = (pat) => {
    if (!pat) return;
    if (pat.type === "Identifier") declarados.add(pat.name);
    else if (pat.type === "ObjectPattern") pat.properties.forEach((p) => nomesDePadrao(p.type === "RestElement" ? p.argument : p.value));
    else if (pat.type === "ArrayPattern") pat.elements.forEach(nomesDePadrao);
    else if (pat.type === "AssignmentPattern") nomesDePadrao(pat.left);
    else if (pat.type === "RestElement") nomesDePadrao(pat.argument);
  };
  const visita = (n) => {
    if (!n || typeof n.type !== "string") return;
    switch (n.type) {
      case "ImportSpecifier": case "ImportDefaultSpecifier": case "ImportNamespaceSpecifier":
        declarados.add(n.local.name); break;
      case "FunctionDeclaration": case "ClassDeclaration":
        if (n.id) declarados.add(n.id.name); break;
      case "VariableDeclarator": nomesDePadrao(n.id); break;
      case "CatchClause": nomesDePadrao(n.param); break;
    }
    if (/Function/.test(n.type) && n.params) n.params.forEach(nomesDePadrao);
    if (n.type === "JSXOpeningElement" && n.name.type === "JSXIdentifier" && /^[A-Z]/.test(n.name.name)) {
      if (!usados.has(n.name.name)) usados.set(n.name.name, n.loc?.start.line);
    }
    for (const k of Object.keys(n)) {
      if (k === "loc" || k === "start" || k === "end") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === "string" && visita(x));
      else if (v && typeof v.type === "string") visita(v);
    }
  };
  visita(ast.program);
  return [...usados].filter(([n]) => !declarados.has(n) && !GLOBAIS.has(n)).map(([n, l]) => `${nome}:${l} <${n}>`);
}

// Controles
const barra = semDefinicao("function A(){ return <PrecoMenu/> }", "controle");
const passa = semDefinicao("import { X } from 'y'; function PrecoMenu(){return null} function A({ Ico }){ return <><PrecoMenu/><X/><Ico/></> }", "controle");
if (barra.length !== 1 || passa.length !== 0) {
  console.error("[check-jsx-componentes] SONDA CEGA: controles falharam.", { barra, passa });
  process.exit(1);
}

const falhas = arquivos(SRC).flatMap((f) => semDefinicao(readFileSync(f, "utf8"), relative(ROOT, f).replace(/\\/g, "/")));
if (falhas.length) {
  console.error("\n[check-jsx-componentes] BUILD BARRADO — componente usado na tela que não existe:");
  falhas.forEach((x) => console.error("   " + x));
  console.error("   O Vite deixaria passar e a tela quebraria no navegador do cliente.\n");
  process.exit(1);
}
console.log(`[check-jsx-componentes] OK — ${arquivos(SRC).length} arquivos .jsx, todo componente usado está definido. Controles: ausente barrado, presente aceito.`);
