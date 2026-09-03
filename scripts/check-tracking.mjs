// ============================================================
// check-tracking.mjs — barra o deploy se a medicao estiver errada
// ============================================================
// POR QUE ISTO EXISTE
//
// Em 22/08/2026 a rodada de LGPD tirou as tags inline de GA4 e Meta Pixel
// das paginas e passou a carregar tudo pelo /consent.js. O commit de1acf5
// fez isso nos dois shells do React (index.html e index-v2.html) e ESQUECEU
// de por o consent.js no lugar. Resultado: /app e /app-legacy -- o painel do
// cliente, onde a pessoa passa mais tempo -- ficaram DEZ DIAS sem medicao
// nenhuma, e ninguem percebeu, porque os eventos do AppV2 sao todos
// `if (window.gtag) gtag(...)`: sem a tag, o if da falso e nada dispara.
// Sem erro, sem log, sem sintoma. A queda apareceu no GA4 como se fosse
// menos gente visitando o site.
//
// Este arquivo e a aplicacao de tres principios que o projeto ja pagou caro
// pra aprender (ver CLAUDE.md):
//
//   1. "Toda protecao precisa provar que esta ligada."
//      O build imprime a contagem e falha alto. Silencio nao e sucesso.
//
//   2. "A lista de alvos deriva dos ARQUIVOS, nunca de paginas a dedo."
//      A verificacao de 22/08 sondou /landing, /kit, /radar e /artigos --
//      quatro paginas escolhidas a mao -- e as duas que estavam quebradas
//      nao estavam na lista. Aqui a lista vem do disco: qualquer .html novo
//      entra na conferencia sozinho, sem ninguem lembrar de inclui-lo.
//
//   3. "Sonda que devolve o esperado precisa de controle."
//      CONTROLE POSITIVO: landing.html tem que ter consent.js.
//      CONTROLE NEGATIVO: avaliar.html tem que NAO ter.
//      Se qualquer um dos dois falhar, a sonda esta cega e o build para --
//      mesmo que todo o resto pareca certo. Cinco zeros sem controle sao
//      indistinguiveis de um grep mal escrito.
// ============================================================

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");

// ── Classificacao por papel da pagina ────────────────────────
// SEM_TAG: a /avaliar e atravessada pelo consumidor do lojista, que nao tem
// relacao com a StarTouch e nao teve onde consentir. Nao pode ter tag
// nenhuma -- nem o consent.js. E o que a Politica de Privacidade declara
// (secao 4.2) e o que a landing promete no card do Cartao NFC.
const SEM_TAG = new Set(["avaliar.html"]);

// SO_PREFS: paginas legais nao carregam tag (quem abre uma politica de
// privacidade nao pode ser rastreado por abri-la), mas precisam oferecer o
// link de revogacao prometido na secao 6.1 -- por isso o data-prefs-only.
const SO_PREFS = new Set(["privacidade.html", "termos.html", "solicitacao.html"]);

// ISENTAS: telas internas de admin (nao sao site publico) e o arquivo de
// verificacao de dominio do Google, que e um HTML de uma linha.
const isIsenta = (nome) => nome.startsWith("admin-") || nome.startsWith("google");

// ── Padroes proibidos em QUALQUER arquivo ────────────────────
// Tag direta burla o Consent Mode: o `consent default denied` do consent.js
// precisa existir ANTES de a tag subir, senao a primeira medicao sai com
// cookie mesmo sem consentimento. AW-* sao as contas de Ads canceladas.
const PROIBIDOS = [
  { re: /googletagmanager\.com\/gtag/i, nome: "GA4 inline (googletagmanager)" },
  { re: /connect\.facebook\.net/i,      nome: "Meta Pixel inline (connect.facebook.net)" },
  { re: /fbq\s*\(\s*['"]init['"]/i,     nome: "fbq('init') inline" },
  { re: /facebook\.com\/tr\?id=/i,      nome: "Meta Pixel noscript" },
  { re: /["']AW-\d+/,                   nome: "conta Google Ads cancelada (AW-)" }
];

const TEM_CONSENT   = /<script[^>]+src=["']\/consent\.js["'][^>]*>/i;
const TEM_PREFS     = /<script[^>]+src=["']\/consent\.js["'][^>]*\sdata-prefs-only/i;
const CONTA_CONSENT = /<script[^>]+src=["']\/consent\.js["']/gi;

// ── Coleta: shells da raiz + tudo em public/ (recursivo) ─────
function varrer(dir, saida = []) {
  for (const item of readdirSync(dir)) {
    const caminho = join(dir, item);
    if (statSync(caminho).isDirectory()) varrer(caminho, saida);
    else if (item.endsWith(".html")) saida.push(caminho);
  }
  return saida;
}

const alvos = [
  ...readdirSync(ROOT).filter((f) => f.endsWith(".html")).map((f) => join(ROOT, f)),
  ...(existsSync(PUBLIC) ? varrer(PUBLIC) : [])
];

// ── Conferencia ──────────────────────────────────────────────
const erros = [];
let comTag = 0, semTag = 0, prefs = 0, isentas = 0;

// Controles: precisam ser observados de fato, nao assumidos.
let controlePositivo = null;  // landing.html TEM que ter
let controleNegativo = null;  // avaliar.html TEM que nao ter

for (const caminho of alvos) {
  const nome = basename(caminho);
  const rel = relative(ROOT, caminho).replace(/\\/g, "/");
  const html = readFileSync(caminho, "utf8");

  for (const { re, nome: oQue } of PROIBIDOS) {
    if (re.test(html)) erros.push(`${rel}: ${oQue} -- tag direta burla o Consent Mode`);
  }

  const temConsent = TEM_CONSENT.test(html);
  const quantos = (html.match(CONTA_CONSENT) || []).length;

  if (SEM_TAG.has(nome)) {
    semTag++;
    if (nome === "avaliar.html") controleNegativo = temConsent;
    if (temConsent) {
      erros.push(`${rel}: NAO pode carregar consent.js -- e a pagina do consumidor do lojista (LGPD, secao 4.2)`);
    }
  } else if (isIsenta(nome)) {
    isentas++;
  } else if (SO_PREFS.has(nome)) {
    prefs++;
    if (!TEM_PREFS.test(html)) {
      erros.push(`${rel}: pagina legal precisa de <script src="/consent.js" data-prefs-only>`);
    }
  } else {
    comTag++;
    if (nome === "landing.html") controlePositivo = temConsent;
    if (!temConsent) {
      erros.push(`${rel}: FALTA <script src="/consent.js"> -- esta pagina nao mede nada`);
    } else if (quantos > 1) {
      erros.push(`${rel}: consent.js carregado ${quantos}x -- vai contar cada visita em dobro`);
    }
  }
}

// ── Moldes: o gerador tem que produzir paginas limpas ────────
// A rodada de LGPD consertou os artigos ja publicados e deixou o molde que
// os escreve intacto. Sem esta checagem, o proximo artigo sairia rastreando.
for (const molde of ["build-articles.mjs", "build-legal.mjs"]) {
  const caminho = join(ROOT, "scripts", molde);
  if (!existsSync(caminho)) continue;
  const src = readFileSync(caminho, "utf8");
  for (const { re, nome: oQue } of PROIBIDOS) {
    if (re.test(src)) erros.push(`scripts/${molde}: ${oQue} no MOLDE -- toda pagina gerada sai assim`);
  }
}

// ── A catraca precisa provar que esta ligada ─────────────────
// A contagem agregada de visitas (/api/visitas) mora dentro do consent.js
// justamente pra herdar a garantia de presenca conferida acima. Se alguem
// remover a chamada, o consent.js continua passando em tudo e o painel
// /admin/visitas simplesmente mostra zero -- indistinguivel de "ninguem
// entrou no site". E o modo de falha nº1 do projeto, aplicado a regua que
// existe justamente porque o GA4 ja falha calado.
const CONSENT_JS = join(PUBLIC, "consent.js");
if (!existsSync(CONSENT_JS)) {
  erros.push("public/consent.js nao existe -- nenhuma pagina mede nada");
} else if (!/["']\/api\/visitas["']/.test(readFileSync(CONSENT_JS, "utf8"))) {
  erros.push(
    "public/consent.js: FALTA a chamada da catraca (/api/visitas) -- " +
    "sem ela a contagem de visitas some e o painel mostra zero como se fosse queda de trafego"
  );
}

// ── Controles: sonda cega nao reporta sucesso ────────────────
if (controlePositivo !== true) {
  erros.push(
    controlePositivo === null
      ? "CONTROLE POSITIVO ausente: landing.html nao foi encontrada -- a sonda esta cega, nao aprovada"
      : "CONTROLE POSITIVO falhou: landing.html deveria ter consent.js e nao tem"
  );
}
if (controleNegativo !== false) {
  erros.push(
    controleNegativo === null
      ? "CONTROLE NEGATIVO ausente: avaliar.html nao foi encontrada -- a sonda esta cega, nao aprovada"
      : "CONTROLE NEGATIVO falhou: avaliar.html tem consent.js e nao pode ter"
  );
}
if (comTag === 0) {
  erros.push("Nenhuma pagina com tag encontrada -- varredura vazia nao e aprovacao");
}

// ── Resultado ────────────────────────────────────────────────
if (erros.length) {
  console.error("\n[check-tracking] BUILD BARRADO — a medicao esta errada:\n");
  for (const e of erros) console.error(`  ✗ ${e}`);
  console.error(
    "\n  Regra: quem carrega GA4 e Meta Pixel e o /consent.js, sempre, e so ele.\n" +
    "  Pagina publica leva <script src=\"/consent.js\"> no <head>, logo apos o charset.\n" +
    "  Pagina legal leva o mesmo com data-prefs-only. A /avaliar nao leva nada.\n"
  );
  process.exit(1);
}

console.log(
  `[check-tracking] OK — ${comTag} paginas medindo, ${prefs} legais (so preferencias), ` +
  `${semTag} sem tag por decisao, ${isentas} isentas. ` +
  `Catraca (/api/visitas) presente no consent.js. ` +
  `Controles: landing.html tem, avaliar.html nao tem.`
);
