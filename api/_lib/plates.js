// ============================================================
// StarTouch — Helpers de geração de códigos de placa
// Arquivo _lib (prefixo _ = NÃO vira function serverless na Vercel).
// Importado por api/plates.js.
// ============================================================
import { randomInt } from "crypto";

// Charset sem caracteres ambíguos: sem I, O, 0, 1.
// 32 chars → 32^5 = ~33 milhões de combinações por letra de produto.
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LEN = 5;

// ── Letra do produto dentro do código (desde 01/09/2026) ────
// Motivo: até 23/06/2026 o "Cartão NFC" não existia como opção na tela de
// produção, então cartão produzido antes disso foi cadastrado como placa.
// O `product_type` do banco passou a contar a história errada e não havia
// como perceber isso olhando a peça. Agora o produto viaja DENTRO do
// código impresso, que é a única coisa que sempre acompanha o objeto.
//
//   Formato NOVO   → STAR-C9K4T7   6 caracteres depois do hífen (letra + 5)
//   Formato LEGADO → STAR-9K4T7    5 caracteres, e a 1ª letra NÃO quer dizer nada
//
// É o COMPRIMENTO que separa as duas eras. Nunca leia a letra de um código
// de 5 caracteres — ali ela é sorteada. Código já impresso nunca muda.
const PRODUCT_LETTER = {
  cartao_nfc:   "C",
  placa_balcao: "B",
  placa_mesa:   "M",
  pulseira_nfc: "P"
};

// Fonte única dos tipos válidos: quem tem letra pode virar lote. Evita que a
// lista de tipos aceitos e o mapa de letras divirjam (api/plates.js importa
// daqui em vez de manter a própria cópia).
export const PRODUCT_TYPES = Object.keys(PRODUCT_LETTER);

// Falha ALTA de propósito: gerar código sem letra recriaria exatamente a
// ambiguidade que este formato existe pra acabar. Se um produto novo entrar
// e esquecerem a letra aqui, o lote não sai — em vez de sair marcado errado
// e ninguém descobrir três meses depois.
export function letterForProduct(productType) {
  const letter = PRODUCT_LETTER[productType];
  if (!letter) {
    throw new Error(
      `Produto "${productType}" não tem letra de código definida. ` +
      `Adicione em PRODUCT_LETTER (api/_lib/plates.js) antes de gerar o lote.`
    );
  }
  return letter;
}

// Gera um código no formato STAR-<letra><XXXXX> (não verifica unicidade).
export function generatePlateCode(productType) {
  const letter = letterForProduct(productType);
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) {
    s += CHARS[randomInt(CHARS.length)];
  }
  return `STAR-${letter}${s}`;
}

// Gera um código garantindo unicidade no banco (até maxAttempts tentativas).
export async function generateUniqueCode(supabase, productType, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generatePlateCode(productType);
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
export async function generateBatchCodes(supabase, n, productType) {
  if (!Number.isInteger(n) || n < 1 || n > 5000) {
    throw new Error("Quantidade inválida (1 a 5000)");
  }
  // Valida a letra ANTES de gastar query ou gerar coisa nenhuma.
  letterForProduct(productType);

  const set = new Set();
  while (set.size < n) set.add(generatePlateCode(productType));
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
    final.push(existingSet.has(c) ? await generateUniqueCode(supabase, productType) : c);
  }
  return final;
}
