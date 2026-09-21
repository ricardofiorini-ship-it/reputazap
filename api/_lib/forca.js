// ============================================================
// StarTouch — Força de reputação (nota × volume)
// ============================================================
// UMA fórmula, UM arquivo. Estava dentro de `competitors.js`, que importa
// supabase e o cache do Places — ou seja, não dá pra carregar no navegador.
// Sem este arquivo, a tela teria que reescrever a conta, e aí passariam a
// existir duas: a do servidor e a da tela, livres pra divergirem sem que nada
// quebre. É o modo de falha que já custou caro aqui (20/09: o servidor mudou a
// ordem da lista e a tela desfez, calada, por uma linha esquecida).
//
// A FÓRMULA VAI NA TELA (decisão do Ricardo). É a única conta nossa no painel —
// o resto são fatos do Google —, e a vantagem inteira dela é o dono poder
// conferir cada pedaço. Esconder a conta seria jogar essa vantagem fora.
//
// `log10` porque avaliação tem retorno decrescente: sair de 10 pra 100 muda a
// vida do negócio, de 3.000 pra 3.090 não muda nada. Sem o log, o volume
// esmagaria a nota e a métrica viraria "quem tem mais avaliação", que já é o
// que o dono vê sozinho.
//
//   4,7 com    231 avaliações → 4,7 × log10(232)  = 11,1
//   4,2 com  1.232 avaliações → 4,2 × log10(1233) = 13,0
//   4,3 com  5.387 avaliações → 4,3 × log10(5388) = 16,0
//
// Lê-se: nota alta com pouco volume perde pra nota média com muito volume, mas
// não perde de lavada — que é exatamente como o consumidor decide.
// ============================================================

/** Força de reputação: nota × log10(avaliações + 1), com 1 casa. */
export function calcForca(rating, reviews) {
  const n = Number(rating) || 0;
  const v = Number(reviews) || 0;
  return Math.round(n * Math.log10(v + 1) * 10) / 10;
}
