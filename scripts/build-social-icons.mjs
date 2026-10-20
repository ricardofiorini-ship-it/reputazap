// ============================================================
// build-social-icons.mjs — gera os logotipos a partir da FONTE ÚNICA
// (api/_lib/social-icons.js). Roda no `npm run build`, antes do vite.
//
//   public/icons/social/<rede>.svg      um arquivo por rede (com <title>)
//   public/trybo/assets/social-icon.js  window.SocialIcon(nome, tamanho)
//                                       pro painel, que é JS sem módulo
//
// Os dois são GERADOS: editar à mão é perder na próxima build. O que a
// versão do navegador faz é exatamente o código da fonte, só sem `export` —
// mesmo componente, não uma cópia que um dia diverge.
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const FONTE = join(ROOT, "api/_lib/social-icons.js");
const { SOCIAL_ICONS, SocialIcon } = await import(pathToFileURL(FONTE).href);

const AVISO = "Gerado por scripts/build-social-icons.mjs a partir de api/_lib/social-icons.js — NÃO EDITE.";

// 1. arquivos soltos
const pasta = join(ROOT, "public/icons/social");
mkdirSync(pasta, { recursive: true });
for (const nome of Object.keys(SOCIAL_ICONS)) {
  const svg = SocialIcon(nome, 24).replace("<svg ", "<svg ").replace(/ class="[^"]*"/, "");
  writeFileSync(join(pasta, `${nome}.svg`), `<!-- ${AVISO} -->\n${svg}\n`);
}

// 2. o mesmo componente pro navegador (script clássico)
const corpo = readFileSync(FONTE, "utf8")
  .replace(/^export const /gm, "const ")
  .replace(/^export function /gm, "function ");
if (/\bexport\b|\bimport\b/.test(corpo.replace(/\/\/.*$/gm, ""))) {
  throw new Error("[social-icons] a fonte ganhou import/export que o gerador não sabe converter");
}
writeFileSync(join(ROOT, "public/trybo/assets/social-icon.js"),
  `// ${AVISO}\n(function () {\n"use strict";\n${corpo}\n` +
  "SocialIcon.tem = temSocialIcon;\nSocialIcon.redes = SOCIAL_ICONS;\nwindow.SocialIcon = SocialIcon;\n})();\n");

console.log(`[social-icons] OK — ${Object.keys(SOCIAL_ICONS).length} logotipos em public/icons/social e no componente do navegador.`);
