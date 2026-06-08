// ============================================================
// StarTouch — Helpers de geração de códigos de placa
// Arquivo _lib (prefixo _ = NÃO vira function serverless na Vercel).
// Importado por api/plates.js.
// ============================================================
import { randomInt } from "crypto";

// Charset sem caracteres ambíguos: sem I, O, 0, 1.
// 32 chars → 32^5 = ~33 milhões de combinações por formato STAR-XXXXX.
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LEN = 5;

// Gera um código no formato STAR-XXXXX (não verifica unicidade).
export function generatePlateCode() {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) {
    s += CHARS[randomInt(CHARS.length)];
  }
  return `STAR-${s}`;
}

// Gera um código garantindo unicidade no banco (até maxAttempts tentativas).
export async function generateUniqueCode(supabase, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generatePlateCode();
    const { data, error } = await supabase
      .from("plates")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!error && !data) return code; // não existe no banco → único
  }
  throw new Error(`Não foi possível gerar código único após ${maxAttempts} tentativas`);
}

// Gera N códigos únicos pra um lote. Dedupe local (Set) + 1 query de colisão
// no banco, regenerando só os que colidirem. Eficiente pra lotes grandes.
export async function generateBatchCodes(supabase, n) {
  if (!Number.isInteger(n) || n < 1 || n > 5000) {
    throw new Error("Quantidade inválida (1 a 5000)");
  }
  const set = new Set();
  while (set.size < n) set.add(generatePlateCode());
  const arr = [...set];

  // Checa colisões com o banco numa query só. Se ESSA query falhar, não dá
  // pra assumir "sem colisão" (poderia tentar inserir duplicata e derrubar o
  // lote inteiro com erro críptico) — aborta cedo com mensagem clara.
  const { data: existing, error: collErr } = await supabase
    .from("plates")
    .select("code")
    .in("code", arr);
  if (collErr) {
    throw new Error("Falha ao verificar colisão de códigos no banco: " + collErr.message);
  }
  const existingSet = new Set((existing || []).map((r) => r.code));

  const final = [];
  for (const c of arr) {
    final.push(existingSet.has(c) ? await generateUniqueCode(supabase) : c);
  }
  return final;
}
