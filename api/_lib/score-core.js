// ============================================================
// StarTouch — Score StarTouch: A CONTA, em um lugar só
// ============================================================
// POR QUE ESTE ARQUIVO EXISTE (02/ago/2026)
// A fórmula vivia DUAS VEZES: em `src/AppV2.jsx` (painel) e em
// `api/_lib/email-templates.js` (email semanal), com um comentário pedindo
// "se mudar no painel, atualize aqui também". Previsivelmente, não foi
// atualizado: em 02/ago o mesmo negócio, no mesmo dia, aparecia com **74 no
// painel e 59 no email**. O cliente lê um número no email, abre o painel e vê
// outro — e a partir daí não acredita em nenhum dos dois.
//
// Aqui mora só a MATEMÁTICA. Quem chama monta o texto:
//   · o painel constrói os cards de detalhe ("o que falta pros 100?");
//   · o email monta uma frase curta.
// Assim os dois divergem no formato, que é de propósito, e nunca no número.
//
// É um módulo PURO — sem import, sem Node, sem React — justamente pra poder ser
// carregado pelo front (Vite) e pelo backend (Vercel) sem adaptação.
//
// Pesos definidos com o dono em 2026-06-21. Mexeu aqui? Mexeu nos dois lados.
// ============================================================

export const PESOS = { nota: 35, volume: 30, posicao: 20, perfil: 15 };

/** Volume satura aqui: 100 avaliações = pontuação cheia. */
export const VOLUME_CHEIO = 100;

/** Ausência num ponto da grade vale esta posição (o Google só mostra 20). */
export const POSICAO_PIOR = 21;

/**
 * @param {object} e
 * @param {number} e.rating          nota do Google (0-5)
 * @param {number} e.reviews         total de avaliações
 * @param {number|null} e.gridAvg    posição média ONDE APARECE (grade). Preferida.
 * @param {boolean} e.gridSemCobertura  a grade mediu e ele não apareceu em ponto nenhum
 * @param {number|null} e.lensRank   posição na lente de 1 km (reserva, quando não há grade)
 * @param {number|null} e.lensTotal  total da lente
 * @param {boolean} e.photo · e.phone · e.category   perfil no Google Meu Negócio
 */
export function calcularScore({
  rating, reviews,
  gridAvg = null, gridSemCobertura = false,
  lensRank = null, lensTotal = null,
  photo, phone, category,
}) {
  const nota = Math.max(0, Math.min(5, Number(rating) || 0));
  const qtd = Math.max(0, Number(reviews) || 0);

  const notaPts = (nota / 5) * PESOS.nota;
  const volPts = Math.min(qtd / VOLUME_CHEIO, 1) * PESOS.volume;

  // POSIÇÃO — mesma ordem de preferência do Hero do painel: grade → lente →
  // meio termo. A conta da grade é ABSOLUTA (1,0 = pontuação cheia, 21 = zero),
  // e não relativa a quantos vizinhos foram medidos: a relativa premiava bairro
  // deserto (1º de 4 valia o mesmo que 1º de 50) e não era comparável entre
  // clientes. Ver o teste de calibragem de 01/ago.
  let posPts, posFonte;
  if (gridAvg != null) {
    posPts = Math.max(0, Math.min(1, (POSICAO_PIOR - gridAvg) / (POSICAO_PIOR - 1))) * PESOS.posicao;
    posFonte = "grade";
  } else if (gridSemCobertura) {
    // Medido e fora de tudo: é informação, não falta de dado. Dar o meio termo
    // aqui premiaria justamente o pior caso.
    posPts = 0;
    posFonte = "fora";
  } else if (lensRank != null && lensTotal > 0) {
    posPts = ((lensTotal - lensRank + 1) / lensTotal) * PESOS.posicao;
    posFonte = "lente";
  } else {
    // Sem medição nenhuma. Meio termo honesto — não é elogio nem punição.
    posPts = PESOS.posicao / 2;
    posFonte = "sem-medicao";
  }

  const temFoto = !!photo, temFone = !!phone, temCat = !!category;
  const perfilPts = (temFoto ? 5 : 0) + (temFone ? 5 : 0) + (temCat ? 5 : 0);
  const faltando = [!temFoto && "foto", !temFone && "telefone", !temCat && "categoria"].filter(Boolean);

  const score = Math.max(0, Math.min(100, Math.round(notaPts + volPts + posPts + perfilPts)));

  return { score, notaPts, volPts, posPts, perfilPts, posFonte, faltando, temFoto, temFone, temCat };
}
