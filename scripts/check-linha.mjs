// ============================================================
// check-linha — cada painel mostra o seu produto (23/09/2026)
// ============================================================
// A conta é uma só pra StarTouch e Trybo, mas os painéis não se misturam
// (ver api/_lib/linha.js). A separação depende de CADA consulta lembrar de
// filtrar — e esquecer não dá erro nenhum: o cartão Trybo só aparece na
// lista errada, o toque dele só engorda o relatório errado. É exatamente o
// tipo de falha calada que este projeto aprendeu a não confiar em memória.
//
// Esta sonda lê TODO arquivo de api/ (a lista vem do disco, nunca escolhida a
// dedo) e, em cada consulta às três tabelas que misturam produtos — plates,
// plate_taps, experience_events —, exige UMA destas coisas no trecho:
//
//   1. o filtro de linha (soStartouch / logsSoStartouch / LINHA_* / "linha");
//   2. alvo de UM registro só (por id, código ou plate_id), ou uma escrita
//      de log (insert) — não há lista pra misturar;
//   3. um comentário `linha-ok: <motivo>` dizendo por que ali pode tudo.
//
// Controles embutidos, como nas outras sondas: um trecho que TEM que ser
// barrado e um que TEM que passar. Se um dos dois falhar, a sonda está cega
// e o build para, mesmo que o resto pareça certo.
// ============================================================
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const API = path.join(RAIZ, "api");

const TABELA = /\.from\(\s*["'](plates|plate_taps|experience_events)["']\s*\)/;
const ACEITA = [
  /soStartouch|logsSoStartouch|LINHA_STARTOUCH|LINHA_TRYBO/,
  /["']linha["']/,
  /linha-ok:/,
  /\.eq\(\s*["'](id|code|plate_id)["']/,
  /\.in\(\s*["'](id|plate_id)["']/,
  /\.insert\(/
];

// O trecho de uma consulta: 3 linhas antes (onde mora o comentário) até o
// fim da instrução — primeira linha que termina em `;` ou `,` de nível de
// lista, no máximo 12 linhas adiante.
function trecho(linhas, i) {
  const ini = Math.max(0, i - 3);
  let fim = i;
  while (fim < linhas.length - 1 && fim - i < 12 && !/[;]\s*(\/\/.*)?$/.test(linhas[fim])) fim++;
  return linhas.slice(ini, fim + 1).join("\n");
}

export function sondar(texto) {
  const linhas = texto.split(/\r?\n/);
  const achados = [];
  for (let i = 0; i < linhas.length; i++) {
    if (!TABELA.test(linhas[i])) continue;
    if (/^\s*\/\//.test(linhas[i])) continue;
    const t = trecho(linhas, i);
    if (!ACEITA.some((re) => re.test(t))) achados.push(i + 1);
  }
  return achados;
}

function arquivos(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...arquivos(p));
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

// ── Controles ──
const RUIM = `const { data } = await supabase\n  .from("plates")\n  .select("id, code")\n  .eq("business_id", biz.id);`;
const BOM = `const { data } = await soStartouch(supabase\n  .from("plates")\n  .select("id, code"))\n  .eq("business_id", biz.id);`;
const controlePositivo = sondar(RUIM).length === 1;
const controleNegativo = sondar(BOM).length === 0;

const lista = arquivos(API);
const erros = [];
let consultas = 0;
for (const f of lista) {
  const txt = fs.readFileSync(f, "utf8");
  consultas += txt.split(/\r?\n/).filter((l) => TABELA.test(l)).length;
  for (const n of sondar(txt)) erros.push(`${path.relative(RAIZ, f)}:${n}`);
}

if (!controlePositivo || !controleNegativo || lista.length === 0 || consultas === 0) {
  console.error("[check-linha] SONDA CEGA — " +
    (!controlePositivo ? "consulta sem filtro NÃO foi barrada. " : "") +
    (!controleNegativo ? "consulta com filtro foi barrada. " : "") +
    (lista.length === 0 || consultas === 0 ? "nenhuma consulta encontrada em api/. " : "") +
    "Build parado: sem os controles, 'nenhum achado' não quer dizer nada.");
  process.exit(1);
}

if (erros.length) {
  console.error(
    `[check-linha] ${erros.length} consulta(s) a plates/plate_taps/experience_events sem separação de produto:\n` +
    erros.map((e) => "  - " + e).join("\n") +
    "\n\n  Cada painel mostra só o seu produto (api/_lib/linha.js). Use soStartouch()/logsSoStartouch()," +
    "\n  ou, se ali pode mesmo ver tudo (admin, cron de todos), deixe um comentário `linha-ok: <motivo>`."
  );
  process.exit(1);
}

console.log(`[check-linha] OK — ${consultas} consultas em ${lista.length} arquivos de api/, todas separadas por produto ou justificadas. Controles: sem filtro barrada, com filtro aceita.`);
