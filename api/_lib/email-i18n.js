// ============================================================
// email-i18n.js — e-mail na língua do cliente (09/10/2026)
// ============================================================
// Mesmo princípio do public/i18n.js do site: os modelos de e-mail continuam
// em português, intactos, e a frase original É a chave da tradução. Na hora
// do envio (email-sender.js) o HTML pronto é fatiado em "tag | texto | tag",
// e cada pedaço de texto é trocado pelo dicionário da língua da conta
// (_lib/idioma.js). As tags nem são tocadas — nada de reescrever o HTML do
// e-mail, que é frágil em leitor de e-mail.
//
// Dicionário: _lib/email-i18n-dict.js — `t` (frase fixa), `p` (frase com
// valor no meio, regex) e `px` (regras extras mais precisas).
// Vigilância: `node scripts/i18n.mjs check` monta cada e-mail com dados de
// teste (scripts/email-fixtures.mjs) e barra o build se algum texto ficou
// sem tradução — mudou uma frase de e-mail, traduz nas 3 línguas.
//
// Trecho que só faz sentido em português (dica da semana, artigo — conteúdo
// que só existe em português) fica entre <!--so-pt--> e <!--/so-pt--> no
// modelo e SAI do e-mail traduzido, em vez de chegar misturado.
// ============================================================
import DICT from "./email-i18n-dict.js";

export const norm = (s) => String(s).replace(/\s+/g, " ").trim();
const LETRA = /[A-Za-zÀ-ÿ]/;

/** Fatia o HTML em pedaços; os ímpares são tags, os pares texto. */
export function fatiar(html) {
  return String(html).split(/(<!--[\s\S]*?-->|<[^>]*>)/);
}

function compilar(d) {
  return {
    t: d?.t || {},
    p: [...(d?.px || []), ...(d?.p || [])].map(([rx, rep]) => [new RegExp(rx), rep]),
  };
}
const cache = {};
function dic(lang) { return (cache[lang] ??= compilar(DICT[lang])); }

// Data por extenso ("9 de outubro"): o mês entra na regra como lacuna e sai
// em português no $N — aqui ele é trocado pelo da língua de destino.
const PT_MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
};
const GENERICO = {
  en: { "seu negócio": "your business", "sua empresa": "your company" },
  es: { "seu negócio": "tu negocio", "sua empresa": "tu empresa" },
  zh: { "seu negócio": "你的商家", "sua empresa": "你的公司" },
};
const MES_RX =new RegExp(`(?<![\\p{L}])(${PT_MESES.join("|")})(?![\\p{L}])`, "gu");

function traduzTexto(txt, D, lang) {
  const k = norm(txt);
  if (!k || !LETRA.test(k)) return txt;
  let out = null;
  if (Object.prototype.hasOwnProperty.call(D.t, k)) out = D.t[k];
  else for (const [rx, rep] of D.p) if (rx.test(k)) {
    out = k.replace(rx, rep);
    if (MESES[lang]) out = out.replace(MES_RX, (m) => MESES[lang][PT_MESES.indexOf(m)]);
    // Sem nome cadastrado, o modelo põe "seu negócio"/"sua empresa" onde iria
    // o nome — e isso cai dentro da lacuna, em português.
    if (GENERICO[lang]) out = out.replace(/\b(seu negócio|sua empresa)\b/g, (m) => GENERICO[lang][m]);
    break;
  }
  if (out == null) return txt;
  const lead = txt.match(/^\s*/)[0], tail = txt.match(/\s*$/)[0];
  return lead + out + tail;
}

export function traduzHtml(html, lang) {
  if (!html || !DICT[lang]) return html;
  const D = dic(lang);
  const semPt = String(html).replace(/<!--so-pt-->[\s\S]*?<!--\/so-pt-->/g, "");
  const partes = fatiar(semPt);
  let dentroDe = null; // <style>/<script>: texto que não é de ler
  for (let i = 0; i < partes.length; i++) {
    const p = partes[i];
    if (i % 2 === 1) {
      const m = p.match(/^<\s*(\/)?\s*(style|script)\b/i);
      if (m) dentroDe = m[1] ? null : m[2].toLowerCase();
      // alt/title das imagens também são lidos (leitor de tela, imagem bloqueada)
      else partes[i] = p.replace(/\b(alt|title)="([^"]*)"/g, (s, a, v) => `${a}="${traduzTexto(v, D, lang)}"`);
      continue;
    }
    if (!dentroDe) partes[i] = traduzTexto(p, D, lang);
  }
  return partes.join("");
}

export function traduzLinha(s, lang) {
  if (!s || !DICT[lang]) return s;
  return traduzTexto(s, dic(lang), lang);
}

export function traduzTextoPuro(text, lang) {
  if (!text || !DICT[lang]) return text;
  const D = dic(lang);
  return String(text).split("\n").map((l) => traduzTexto(l, D, lang)).join("\n");
}

/** { subject, html, text } na língua pedida; português/desconhecida = intacto. */
export function traduzEmail({ subject, html, text }, lang) {
  if (!lang || lang === "pt" || !DICT[lang]) return { subject, html, text };
  return {
    subject: traduzLinha(subject, lang),
    html: traduzHtml(html, lang),
    text: traduzTextoPuro(text, lang),
  };
}
