// ============================================================
// check-scripts.mjs — barra o deploy se algum <script> inline nao compilar
// ============================================================
// POR QUE ISTO EXISTE
//
// Em 10/09/2026 o commit a256b66 consertou um beco sem saida no cadastro: quem
// tentava criar conta com e-mail ja existente recebia "User already registered"
// em ingles e nao tinha pra onde ir. O conserto pos um confirm() oferecendo
// login — escrito assim:
//
//     confirm("Voce ja tem uma conta com esse e-mail.
//
//     Quer entrar com ela agora?")
//
// String com aspas nao atravessa linha em JavaScript. Isso e SyntaxError, e
// SyntaxError nao quebra uma funcao: quebra o <script> INTEIRO, porque o
// arquivo nem chega a ser analisado. Eram 615 linhas num bloco so — o fluxo de
// cadastro completo da pagina /ativar.
//
// Resultado: de 10/09 a 18/09/2026, OITO DIAS, ninguem conseguiu criar conta
// pelo /ativar. A pagina abria bonita, o formulario aparecia, os botoes
// desenhavam — e nada respondia, porque nenhuma funcao existia. O commit que
// consertava o cadastro foi o que derrubou o cadastro.
//
// POR QUE NINGUEM VIU
//
// Falha silenciosa em estado puro, o bug n1 deste projeto (ver CLAUDE.md):
//   - o build passou: vite nao analisa JS dentro de HTML em public/, ele copia;
//   - o deploy passou: a pagina responde 200, com o HTML correto;
//   - a tela parecia certa: o erro so existe no console do visitante;
//   - nao ha excecao no servidor, nenhum log, nenhum alerta.
// Do lado de fora, "ninguem se cadastrou essa semana" e indistinguivel de uma
// semana fraca de trafego.
//
// O QUE ESTE ARQUIVO FAZ
//
// Pergunta ao proprio Node se cada <script> inline compila. Nao executa nada —
// so analisa, que e exatamente a etapa que falhava. Vale pra qualquer erro de
// sintaxe, nao so o que originou: aspa nao fechada, virgula sobrando, chave a
// menos, acento corrompido por editor (ver a memoria do PowerShell 5.1).
//
// PRINCIPIOS APLICADOS (CLAUDE.md):
//
//   1. "A lista de alvos deriva dos ARQUIVOS, nunca escolhida a dedo."
//      Varre o disco. Foi uma lista a dedo que deixou o /app passar em agosto.
//
//   2. "Toda verificacao leva um alvo positivo conhecido."
//      O CONTROLE abaixo e um trecho que se SABE quebrado. Se ele passar, a
//      sonda esta cega e o build para — mesmo com todo o resto verde. Sem isso,
//      um erro no proprio verificador viraria "zero problemas".
//
//   3. "Toda protecao precisa provar que esta ligada."
//      Imprime a contagem do que conferiu. Silencio nao e sucesso.
// ============================================================

import fs from "fs";
import path from "path";
import vm from "vm";

const RAIZ = process.cwd();
const PASTAS = ["public", "."];

// Pega <script> SEM src (os externos nao sao nossos) e guarda a tag pra saber
// se e JSON-LD — que e dado, nao codigo, e se valida de outro jeito.
const RE_SCRIPT = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;

function listaPaginas() {
  const achados = [];
  for (const pasta of PASTAS) {
    const dir = path.join(RAIZ, pasta);
    if (!fs.existsSync(dir)) continue;
    for (const nome of fs.readdirSync(dir)) {
      if (nome.endsWith(".html")) achados.push(path.join(pasta, nome));
    }
  }
  return achados.sort();
}

/** @returns {null | string} null = compila; string = a mensagem do erro. */
function erroDeSintaxe(codigo, atributos) {
  if (!codigo.trim()) return null;
  const ehJson = /type\s*=\s*["']application\/(ld\+)?json/i.test(atributos);
  try {
    if (ehJson) JSON.parse(codigo);
    else new vm.Script(codigo);   // SO analisa; nao executa nada
    return null;
  } catch (e) {
    return e.message;
  }
}

function confereArquivo(rel) {
  const html = fs.readFileSync(path.join(RAIZ, rel), "utf8");
  const problemas = [];
  let m, i = 0, total = 0;
  RE_SCRIPT.lastIndex = 0;
  while ((m = RE_SCRIPT.exec(html))) {
    i++;
    if (!m[2].trim()) continue;
    total++;
    const erro = erroDeSintaxe(m[2], m[1]);
    if (erro) {
      const linha = html.slice(0, m.index).split("\n").length;
      problemas.push({ bloco: i, linha, erro });
    }
  }
  return { problemas, total };
}

// ── CONTROLE: um trecho que TEM que ser recusado ────────────────────────────
// E o defeito real de 10/09, reduzido. Se esta sonda parar de enxergar — porque
// o Node mudou, porque alguem mexeu no regex, porque um try/catch engoliu o
// erro — o build para AQUI, e nao devolve uma lista de zeros com cara de
// sucesso. Cinco zeros sem controle sao indistinguiveis de sonda quebrada.
const CONTROLE = 'if(confirm("primeira linha\n\nsegunda linha")){ x(); }';
const CONTROLE_OK = 'if(confirm("primeira linha\\n\\nsegunda linha")){ x(); }';

function main() {
  if (erroDeSintaxe(CONTROLE, "") === null) {
    console.error("[check-scripts] SONDA CEGA: o controle negativo (string atravessando linha) PASSOU.");
    console.error("[check-scripts] Enquanto isso nao for resolvido, um 'nenhum problema' aqui nao vale nada.");
    process.exit(1);
  }
  if (erroDeSintaxe(CONTROLE_OK, "") !== null) {
    console.error("[check-scripts] SONDA HISTERICA: o controle POSITIVO (codigo valido) foi recusado.");
    console.error("[check-scripts] Ela reprovaria pagina boa — corrigir antes de confiar no resultado.");
    process.exit(1);
  }

  const paginas = listaPaginas();
  if (paginas.length === 0) {
    console.error("[check-scripts] Nenhuma pagina .html encontrada — a sonda nao esta olhando pra lugar nenhum.");
    process.exit(1);
  }

  let blocos = 0;
  const quebradas = [];
  for (const rel of paginas) {
    const { problemas, total } = confereArquivo(rel);
    blocos += total;
    if (problemas.length) quebradas.push({ rel, problemas });
  }

  if (quebradas.length) {
    console.error("\n[check-scripts] BUILD BARRADO — script inline que nao compila:\n");
    for (const { rel, problemas } of quebradas) {
      for (const p of problemas) {
        console.error(`  ${rel}  (script #${p.bloco}, abre na linha ${p.linha})`);
        console.error(`     ${p.erro}`);
      }
    }
    console.error("\n  Um SyntaxError derruba o <script> INTEIRO, nao so a linha — a pagina");
    console.error("  sobe, desenha, e nenhum botao responde. Foi assim que o cadastro ficou");
    console.error("  8 dias fora do ar em setembro/2026, sem erro em lugar nenhum.\n");
    process.exit(1);
  }

  console.log(`[check-scripts] OK — ${blocos} scripts inline em ${paginas.length} paginas compilam. Controles: quebrado recusado, valido aceito.`);
}

main();
