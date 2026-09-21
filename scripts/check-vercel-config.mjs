// ============================================================
// StarTouch — guarda do vercel.json
// ============================================================
// NASCEU DE UM DEPLOY PERDIDO (21/09/2026). Pra explicar uma decisão de rota,
// foi adicionada uma chave `"comentario"` dentro de um objeto de `redirects`.
// O arquivo continuou sendo JSON VÁLIDO — `JSON.parse` aceita, editor não
// reclama, `npm run build` passa inteiro — e a Vercel recusou a configuração
// com "Vercel couldn't load a valid project configuration".
//
// O QUE ISSO CUSTA, e por que vale um script: a falha acontece ANTES do build,
// então nenhuma guarda do `npm run build` a pega, e do lado de fora ela é
// indistinguível de "o deploy não subiu". Foram 40 minutos procurando gancho
// quebrado, cache de CDN e build falhando — três hipóteses erradas — porque o
// sintoma de config recusada é simplesmente o site continuar igual.
//
// A REGRA QUE FALTAVA: vercel.json não aceita comentário. Nem `//`, porque é
// JSON, nem chave inventada, porque o schema é fechado. Explicação de rota vai
// pro CLAUDE.md, que é onde ela é lida.
//
// Este script roda no `npm run build`, antes do vite. Ele não substitui a
// validação da Vercel — só pega a classe de erro que já custou caro uma vez.
// ============================================================
import { readFileSync } from "node:fs";

// Campos aceitos por seção. Fonte: documentação de configuração da Vercel.
// Acrescentar aqui SÓ depois de confirmar na doc — inventar campo é o erro que
// este arquivo existe pra impedir.
const PERMITIDO = {
  redirects: ["source", "destination", "permanent", "statusCode", "has", "missing"],
  rewrites:  ["source", "destination", "has", "missing"],
  headers:   ["source", "headers", "has", "missing"],
  crons:     ["path", "schedule"],
};

const OBRIGATORIO = {
  redirects: ["source", "destination"],
  rewrites:  ["source", "destination"],
  headers:   ["source", "headers"],
  crons:     ["path", "schedule"],
};

function conferir(cfg, origem) {
  const erros = [];
  for (const [secao, permitidas] of Object.entries(PERMITIDO)) {
    const itens = cfg[secao];
    if (itens == null) continue;
    if (!Array.isArray(itens)) { erros.push(`${origem}: "${secao}" devia ser uma lista.`); continue; }
    itens.forEach((item, i) => {
      const onde = `${origem}: ${secao}[${i}]` + (item?.source || item?.path ? ` (${item.source || item.path})` : "");
      if (typeof item !== "object" || item === null) { erros.push(`${onde} não é um objeto.`); return; }
      for (const k of Object.keys(item)) {
        if (!permitidas.includes(k)) {
          erros.push(`${onde} tem o campo "${k}", que a Vercel não conhece. ` +
            `Aceitos: ${permitidas.join(", ")}. Comentário não cabe aqui — vai pro CLAUDE.md.`);
        }
      }
      for (const k of OBRIGATORIO[secao]) {
        if (!(k in item)) erros.push(`${onde} está sem o campo obrigatório "${k}".`);
      }
    });
  }
  return erros;
}

let cfg;
try {
  cfg = JSON.parse(readFileSync("vercel.json", "utf8"));
} catch (e) {
  console.error(`❌  check-vercel-config: vercel.json não é JSON válido — ${e.message}`);
  process.exit(1);
}

const erros = conferir(cfg, "vercel.json");

// CONTROLE POSITIVO — a regra da casa: sonda que devolve "tudo certo" precisa
// provar, no mesmo instante, que ela enxergaria o erro. Sem isto, um dia o
// laço acima para de rodar (uma seção renomeada, um `continue` a mais) e o
// script segue imprimindo OK pra sempre, que é o pior estado possível.
const iscaBoa = conferir({ redirects: [{ source: "/a", destination: "/b" }] }, "controle-limpo");
const iscaRuim = conferir({ redirects: [{ source: "/a", destination: "/b", comentario: "x" }] }, "controle-sujo");
if (iscaBoa.length !== 0 || iscaRuim.length !== 1) {
  console.error("❌  check-vercel-config: A SONDA ESTÁ CEGA — o controle não reagiu como devia " +
    `(limpo=${iscaBoa.length} erros, esperado 0; sujo=${iscaRuim.length} erros, esperado 1). ` +
    "Não confie no resultado acima.");
  process.exit(1);
}

if (erros.length) {
  console.error("❌  check-vercel-config: a Vercel recusaria esta configuração antes de buildar.\n");
  erros.forEach((e) => console.error("   • " + e));
  console.error("\n   Sintoma lá fora: o deploy simplesmente não sobe e o site continua igual.\n");
  process.exit(1);
}

const n = Object.entries(PERMITIDO).reduce((t, [s]) => t + (cfg[s]?.length || 0), 0);
console.log(`[check-vercel-config] OK — ${n} entradas de rota/cron com campos válidos. Controles: campo inventado recusado, entrada limpa aceita.`);
