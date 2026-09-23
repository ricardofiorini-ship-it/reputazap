// ============================================================
// CADA PAINEL MOSTRA O SEU PRODUTO — e só ele (decidido 23/09/2026)
// ============================================================
// A conta é uma só pra tudo que é "Touch" (mesmo login, mesmo negócio no
// banco): é isso que deixa o cliente da StarTouch ativar um cartão Trybo sem
// cadastro novo. Mas os PAINÉIS não se misturam — ver placa de avaliação e
// cartão de redes sociais na mesma lista confunde o cliente, e pior: a ação
// de um produto aplicada ao dispositivo do outro o estraga (ligar o Menu
// num cartão Trybo tira o Instagram dele; desvincular o faz voltar como
// "Google direto").
//
// O que separa é `plates.linha` (avaliacao | social | contato), gravada na
// criação do lote a partir da ficha do produto. Os logs (plate_taps,
// experience_events) não têm a coluna, mas guardam o CÓDIGO, e o prefixo do
// código sai da mesma ficha — TRY- é Trybo. Por isso os logs são separados
// pelo prefixo, sem consulta extra.
//
// ⚠️ O `scripts/check-linha.mjs` barra o build se uma consulta a plates,
// plate_taps ou experience_events aparecer em api/ sem passar por aqui (ou
// sem um comentário `linha-ok:` explicando por que não precisa).
// ============================================================
import { prefixosDeOutrasLinhas } from "./plates.js";

export const LINHA_STARTOUCH = "avaliacao";
export const LINHA_TRYBO = "social";

const ALHEIOS_STARTOUCH = prefixosDeOutrasLinhas(LINHA_STARTOUCH);   // ["TRY"]

// Consulta à tabela `plates` vista pela StarTouch.
export function soStartouch(query) {
  return query.eq("linha", LINHA_STARTOUCH);
}

// Consulta a um log (plate_taps / experience_events) vista pela StarTouch.
// `code` pode ser NULL em experience_events (abertura do menu por link, sem
// dispositivo) — e NULL NOT LIKE x é NULL, que o Postgres trata como falso.
// Sem o `is.null` essas linhas sumiriam caladas do relatório do menu.
export function logsSoStartouch(query) {
  let q = query;
  for (const p of ALHEIOS_STARTOUCH) q = q.or(`code.is.null,code.not.like.${p}-*`);
  return q;
}

// O código é de outra linha que não a da StarTouch? Serve pra rota /r/ e pras
// ações da StarTouch recusarem um cartão Trybo sem precisar ir ao banco.
export function codigoDeOutraLinha(code) {
  const c = String(code || "").trim().toUpperCase();
  return ALHEIOS_STARTOUCH.some((p) => c.startsWith(p + "-"));
}
