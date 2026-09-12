// ============================================================
// Catálogo do kit — fonte única
// ============================================================
// Morava dentro do billing.js. Saiu de lá quando o cálculo de frete passou a
// precisar da MESMA lista: duas listas de produto sempre divergem, e aqui a
// divergência apareceria como frete cobrado de um item que não está no
// carrinho — ou, pior, item vendido sem frete nenhum.
//
// Preços em centavos. `soldOut: true` bloqueia o item no checkout.
// Deve refletir public/kit.html.

export const KIT_CATALOG = {
  "placa-balcao": {
    name: "Placa de Balcão G",
    description: "Placa NFC de balcão tamanho G — PS preto 2 mm. Cliente aproxima o celular e avalia no Google em segundos.",
    price_cents: 7990,
    image: "https://startouch.com.br/gadget-placa.png",
    category_id: "electronics",
    soldOut: false
  },
  "placa-mesa": {
    name: "Placa de Balcão M",
    description: "Placa NFC de balcão tamanho M — versão compacta, perfeita pra balcões menores e mesas.",
    price_cents: 4990,
    image: "https://startouch.com.br/gadget-placa.png",
    category_id: "electronics",
    soldOut: false
  },
  "cartao-nfc": {
    name: "Cartão de Avaliação NFC",
    description: "Cartão NFC tamanho carteira. Ideal pra atendimento, networking e aproximação rápida.",
    price_cents: 2990,
    image: "https://startouch.com.br/gadget-cartao.png",
    category_id: "electronics",
    soldOut: false
  },
  "pulseira": {
    name: "Pulseira NFC",
    description: "Pulseira NFC pra atendimento e experiências em eventos.",
    price_cents: 10990,
    image: "https://startouch.com.br/gadget-pulseira.png",
    category_id: "electronics",
    soldOut: true
  }
};


// ── Dados de despacho (para a cotação de frete) ───────────────
// PROVISÓRIO — ESTIMADO, NÃO MEDIDO (12/09/2026). Calculado a partir das
// medidas publicadas no site (PS 2 mm, densidade do poliestireno ≈ 1,05 g/cm³)
// mais uma margem de embalagem. Ricardo vai conferir com balança e régua.
//
// O QUE MAIS PESA NO PREÇO AQUI NÃO É O PESO: Correios e transportadora cobram
// pelo maior entre o peso real e o "peso cubado" (comprimento × largura ×
// altura ÷ 6000). Uma placa G de 150 g numa caixa de 24×18×4 cm cuba 288 g —
// quase o dobro. Então caixa menor economiza mais do que produto mais leve, e
// errar a MEDIDA da caixa custa mais caro do que errar a balança.
//
// Medidas em CENTÍMETROS e peso em QUILOS, que é o que a Frenet espera.
// DOIS TAMANHOS PRA CADA PRODUTO, e a diferenca entre eles vale dinheiro:
//
//   comprimento/largura/altura = a EMBALAGEM de uma unidade, como sai no varejo.
//   bruto                      = a PECA nua, usada quando o pedido inteiro vai
//                                numa caixa so (revenda).
//
// Sem o `bruto`, cotar 500 cartoes seria mandar "500 pacotes de 16x11x2 cm"
// pra transportadora: ~29 kg de peso cubado, quando 500 cartoes pesam 10 kg e
// cabem numa caixa que cuba menos de 1 kg. O frete sairia pelo TRIPLO.
export const LOGISTICA = {
  "placa-balcao": {
    peso: 0.150, comprimento: 24, largura: 18, altura: 4,
    // 21 x 15 cm publicados no site; 0,5 cm e a espessura empilhada (chapa de
    // PS 2 mm + a peca da base).
    bruto: { comprimento: 21, largura: 15, altura: 0.5 }
  },
  "placa-mesa": {
    peso: 0.100, comprimento: 18, largura: 16, altura: 4,
    bruto: { comprimento: 15, largura: 10, altura: 0.5 }
  },
  "cartao-nfc": {
    peso: 0.020, comprimento: 16, largura: 11, altura: 2,
    // Tamanho de cartao de credito; 0,9 mm de espessura.
    bruto: { comprimento: 8.5, largura: 5.4, altura: 0.09 }
  },
  "pulseira": {
    peso: 0.050, comprimento: 16, largura: 11, altura: 3,
    bruto: { comprimento: 6, largura: 6, altura: 1 }
  }
};

// Produto no catálogo sem dados de despacho não pode ser vendido: o frete sai
// errado ou sai zero, e zero é o pior dos dois porque parece que funcionou.
// Este erro sobe no boot da função, alto, em vez de esperar um pedido real.
for (const id of Object.keys(KIT_CATALOG)) {
  if (!LOGISTICA[id]) {
    console.error(`[catalogo-kit] "${id}" está no catálogo e NÃO tem peso/medida em LOGISTICA — o frete deste item sairia zerado.`);
  } else if (!LOGISTICA[id].bruto) {
    // Sem `bruto`, a consolidação da revenda usaria a embalagem unitária e
    // cobraria o triplo. Erra alto aqui, no boot, e não no pedido do cliente.
    console.error(`[catalogo-kit] "${id}" não tem medida BRUTA — o frete de pedido grande sairia muito acima do real.`);
  }
}
for (const id of Object.keys(LOGISTICA)) {
  if (!KIT_CATALOG[id]) {
    console.warn(`[catalogo-kit] "${id}" tem peso/medida mas não está no catálogo — sobra inofensiva, mas é sinal de lista desatualizada.`);
  }
}
