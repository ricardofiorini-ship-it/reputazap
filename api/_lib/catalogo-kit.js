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
export const LOGISTICA = {
  "placa-balcao": { peso: 0.150, comprimento: 24, largura: 18, altura: 4 },
  "placa-mesa":   { peso: 0.100, comprimento: 18, largura: 16, altura: 4 },
  "cartao-nfc":   { peso: 0.020, comprimento: 16, largura: 11, altura: 2 },
  "pulseira":     { peso: 0.050, comprimento: 16, largura: 11, altura: 3 }
};

// Produto no catálogo sem dados de despacho não pode ser vendido: o frete sai
// errado ou sai zero, e zero é o pior dos dois porque parece que funcionou.
// Este erro sobe no boot da função, alto, em vez de esperar um pedido real.
for (const id of Object.keys(KIT_CATALOG)) {
  if (!LOGISTICA[id]) {
    console.error(`[catalogo-kit] "${id}" está no catálogo e NÃO tem peso/medida em LOGISTICA — o frete deste item sairia zerado.`);
  }
}
for (const id of Object.keys(LOGISTICA)) {
  if (!KIT_CATALOG[id]) {
    console.warn(`[catalogo-kit] "${id}" tem peso/medida mas não está no catálogo — sobra inofensiva, mas é sinal de lista desatualizada.`);
  }
}
