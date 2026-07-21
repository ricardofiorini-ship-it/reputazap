// ============================================================
// StarTouch — "Test-drive" das funções antes de publicar
// ============================================================
// Tenta LIGAR (import) cada arquivo .js dentro de api/. Se algum não
// liga — import de nome que não existe, função apagada, erro de sintaxe —
// este script sai com código 1 e BARRA o build (roda antes do vite no
// package.json). Assim um import quebrado é pego na hora, não em produção.
//
// Contexto: em 17/jul um refactor apagou funções do email-templates.js
// que billing.js e weekly-digest.js ainda importavam. Sendo ESM, o import
// de nome inexistente derruba o módulo inteiro no load — checkout e resumo
// semanal ficaram fora do ar 3 dias sem ninguém perceber. Este guard
// existe pra isso não repetir.
//
// Rodar sozinho:  node scripts/check-functions.mjs
// ============================================================
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const API_DIR = join(ROOT, "api");

// Placeholders pra qualquer env ausente: assim clients (Supabase, MP, OpenAI,
// Stripe…) construídos no topo do módulo NÃO estouram por falta de chave.
// Não conectamos em nada — só "ligamos" o módulo. Só preenche o que faltar,
// nunca sobrescreve env real (Vercel já tem as de verdade no build).
const ENV_PLACEHOLDERS = {
  SUPABASE_URL: "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY: "placeholder",
  SUPABASE_SERVICE_KEY: "placeholder",
  MP_ACCESS_TOKEN: "TEST-placeholder",
  STRIPE_SECRET_KEY: "sk_test_placeholder",
  OPENAI_API_KEY: "sk-placeholder",
  GEMINI_API_KEY: "placeholder",
  PERPLEXITY_API_KEY: "placeholder",
  PLACES_API_KEY: "placeholder",
  GOOGLE_CLIENT_ID: "placeholder",
  GOOGLE_CLIENT_SECRET: "placeholder",
  RESEND_API_KEY: "re_placeholder",
  GA4_API_SECRET: "placeholder",
};
for (const [k, v] of Object.entries(ENV_PLACEHOLDERS)) {
  if (!process.env[k]) process.env[k] = v;
}

// Coleta todos os .js sob api/ (recursivo).
function collectJs(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...collectJs(full));
    else if (name.endsWith(".js")) out.push(full);
  }
  return out;
}

const files = collectJs(API_DIR).sort();
const failures = [];

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  try {
    await import(pathToFileURL(file).href);
  } catch (err) {
    failures.push({ rel, msg: err && err.message ? err.message : String(err) });
  }
}

if (failures.length) {
  console.error("\n❌  BUILD BARRADO — funções que não ligam:\n");
  for (const f of failures) {
    console.error(`   • ${f.rel}`);
    console.error(`     ${f.msg}\n`);
  }
  console.error(`${failures.length} de ${files.length} arquivo(s) com problema. Corrija antes de publicar.\n`);
  process.exit(1);
}

console.log(`✅  check-functions: ${files.length} arquivos em api/ ligam OK.`);
