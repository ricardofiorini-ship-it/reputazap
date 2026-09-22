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
// ── A FICHA DE CADA PRODUTO, NUM LUGAR SÓ (22/09/2026) ──────
// Era um mapa de letras. Virou uma ficha por produto quando a Trybo entrou,
// porque agora cada produto carrega QUATRO coisas que precisam concordar
// entre si, e mapas paralelos divergem calados: basta alguém acrescentar um
// produto em três dos quatro. Aqui não há como acrescentar pela metade.
//
//   letra    → viaja dentro do código impresso (ver bloco acima)
//   prefixo  → de qual produto da casa o código é. STAR- avaliação, TRY- Trybo
//   linha    → o que o dispositivo faz (grava em plates.linha)
//   rotaBase → ⚠️ A URL QUE VAI GRAVADA NO CHIP. Errar aqui não tem conserto
//              por software: o chip já saiu da gráfica. Foi assim o incidente
//              de 08/06/2026, quando um lote inteiro foi gravado com
//              /ativar-codigo em vez de /r/ e só se salvou por sorte.
const PRODUCTS = {
  cartao_nfc:    { letra: "C", prefixo: "STAR", linha: "avaliacao", rotaBase: "https://startouch.com.br/r/", utmSource: "placa" },
  placa_balcao:  { letra: "B", prefixo: "STAR", linha: "avaliacao", rotaBase: "https://startouch.com.br/r/", utmSource: "placa" },
  placa_mesa:    { letra: "M", prefixo: "STAR", linha: "avaliacao", rotaBase: "https://startouch.com.br/r/", utmSource: "placa" },
  pulseira_nfc:  { letra: "P", prefixo: "STAR", linha: "avaliacao", rotaBase: "https://startouch.com.br/r/", utmSource: "placa" },
  // Trybo — cartão de redes sociais. Domínio e rota PRÓPRIOS: trybo.co/t/.
  // O briefing chama isto de "a única decisão irreversível do projeto".
  cartao_social: { letra: "S", prefixo: "TRY",  linha: "social",    rotaBase: "https://trybo.co/t/",         utmSource: "trybo" }
};

// Fonte única dos tipos válidos: quem tem ficha pode virar lote. Evita que a
// lista de tipos aceitos e a ficha divirjam (api/plates.js importa daqui em
// vez de manter a própria cópia).
export const PRODUCT_TYPES = Object.keys(PRODUCTS);

// Falha ALTA de propósito: gerar código sem ficha recriaria exatamente a
// ambiguidade que este formato existe pra acabar. Se um produto novo entrar
// e esquecerem a ficha aqui, o lote não sai — em vez de sair marcado errado
// e ninguém descobrir três meses depois.
export function productSpec(productType) {
  const spec = PRODUCTS[productType];
  if (!spec) {
    throw new Error(
      `Produto "${productType}" não tem ficha definida. ` +
      `Adicione em PRODUCTS (api/_lib/plates.js) antes de gerar o lote.`
    );
  }
  return spec;
}

export function letterForProduct(productType) {
  return productSpec(productType).letra;
}

// Qual linha de produto este dispositivo é: avaliacao | social | contato.
// Gravada em plates.linha na criação do lote.
export function lineForProduct(productType) {
  return productSpec(productType).linha;
}

// A base da URL que a gráfica grava no chip e imprime no QR.
export function tapBaseForProduct(productType) {
  const { rotaBase, utmSource } = productSpec(productType);
  return { rotaBase, utmSource };
}

// Gera um código no formato <PREFIXO>-<letra><XXXXX> (não verifica unicidade).
//   STAR-C9K4T7  → cartão de avaliação
//   TRY-S9K4T7   → cartão Trybo
export function generatePlateCode(productType) {
  const { letra, prefixo } = productSpec(productType);
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) {
    s += CHARS[randomInt(CHARS.length)];
  }
  return `${prefixo}-${letra}${s}`;
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
