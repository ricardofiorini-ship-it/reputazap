// ============================================================
// StarTouch — Os dados do cliente, num formato só
// ============================================================
// POR QUE ISTO EXISTE
// -------------------
// `orders.shipping` é jsonb, e cada caminho de venda gravou com um vocabulário
// diferente. Não é bagunça de ninguém: são três códigos escritos em momentos
// diferentes, e o jsonb aceita tudo calado.
//
//   revenda.js        razao, cnpj, ie, nome, whatsapp, endereco, numero,
//                     complemento, bairro, cidade, uf, observacoes   (português)
//   billing.js guest  name, phone, cpf_cnpj, address, number,
//                     complement, neighborhood, city, state          (inglês)
//   webhook Stripe    o mesmo formato inglês do guest
//
// O ESTRAGO, e ele era silencioso dos DOIS lados:
//   - a tela de /admin/pedidos lia só as chaves em português, então toda compra
//     do site aparecia SEM endereço e SEM CPF — os dados estavam gravados o
//     tempo todo, a tela é que não falava aquele idioma. Era o que impedia de
//     gerar a etiqueta no Frenet sem abrir o Supabase na mão.
//   - o e-mail de pedido pago (billing.js, `notifyAdminKitOrder`) faz o inverso:
//     lê só as chaves em inglês, então pedido de REVENDA chega sem endereço.
//     Espelho exato do mesmo bug. Este helper serve pra lá também — ainda não
//     está ligado, porque aquele caminho é o do dinheiro e merece deploy próprio.
//
// Um lado mostrava metade dos pedidos e o outro mostrava a outra metade, e
// nenhum dos dois reclamava. Daí um tradutor só, num arquivo só: se amanhã
// nascer um terceiro vocabulário, ele entra AQUI e as duas telas acertam juntas.
// ============================================================

const pega = (obj, ...chaves) => {
  for (const k of chaves) {
    const v = obj?.[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

/**
 * Traduz `orders.shipping` (qualquer um dos vocabulários) pro formato único que
 * a tela e os e-mails consomem. Nunca devolve null: pedido sem `shipping`
 * devolve tudo vazio, e quem chama decide o que fazer com isso.
 */
export function dadosDoCliente(shipping) {
  const c = shipping || {};

  // Só dígitos: é assim que o Frenet e a nota fiscal querem, e é como o
  // checkout do guest já grava. O que vem do Stripe pode vir pontuado.
  const doc = pega(c, "cpf_cnpj", "cnpj", "cpf", "documento").replace(/\D/g, "");

  return {
    // `razao` só existe na revenda (pessoa jurídica). Pra etiqueta, o
    // destinatário é a razão social quando há uma, senão o nome da pessoa.
    razao: pega(c, "razao", "razao_social"),
    nome: pega(c, "nome", "name", "contato"),
    email: pega(c, "email"),
    telefone: pega(c, "whatsapp", "phone", "telefone", "celular"),

    documento: doc,
    // 14 dígitos = CNPJ, 11 = CPF. O rótulo sai daqui pra tela não ter que
    // adivinhar — e pra "CPF" nunca aparecer em cima de um CNPJ.
    documento_tipo: doc.length === 14 ? "CNPJ" : doc.length === 11 ? "CPF" : "",
    ie: pega(c, "ie", "inscricao_estadual"),

    cep: pega(c, "cep", "postal_code", "zip").replace(/\D/g, ""),
    endereco: pega(c, "endereco", "address", "logradouro", "rua"),
    numero: pega(c, "numero", "number"),
    complemento: pega(c, "complemento", "complement"),
    bairro: pega(c, "bairro", "neighborhood"),
    cidade: pega(c, "cidade", "city"),
    uf: pega(c, "uf", "state", "estado").toUpperCase().slice(0, 2),

    observacoes: pega(c, "observacoes", "obs", "observacao"),
    transportadora: pega(c.frete || {}, "transportadora"),
    servico: pega(c.frete || {}, "servico"),
  };
}

/**
 * O endereço está COMPLETO o bastante pra virar etiqueta?
 *
 * `numero` NÃO entra na conta de propósito. O Stripe não separa número do
 * logradouro em endereço brasileiro — manda os dois juntos em `line1` — então
 * todo pedido de cliente logado tem `numero` vazio com o número ali dentro da
 * rua. Exigir o campo marcaria como "incompleto" um endereço que está inteiro,
 * e um alarme que toca à toa acaba ignorado como o que não toca.
 */
export function enderecoCompleto(d) {
  return !!(d.cep && d.endereco && d.cidade && d.uf);
}

/**
 * Bloco de texto pra colar no Frenet. Uma linha por campo, rótulo antes do
 * valor: é o formato que sobrevive a ser colado em qualquer formulário, e
 * deixa conferir de relance se algo veio vazio.
 */
export function textoDaEtiqueta(d, ref) {
  const destinatario = d.razao || d.nome || "";
  const linhas = [
    ["Destinatário", destinatario],
    ["Contato", d.razao && d.nome ? d.nome : ""],
    [d.documento_tipo || "Documento", d.documento],
    ["IE", d.ie],
    ["Telefone", d.telefone],
    ["E-mail", d.email],
    ["CEP", d.cep],
    ["Endereço", d.endereco],
    ["Número", d.numero],
    ["Complemento", d.complemento],
    ["Bairro", d.bairro],
    ["Cidade", d.cidade],
    ["UF", d.uf],
    ["Pedido", ref || ""],
  ];
  return linhas.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
}
