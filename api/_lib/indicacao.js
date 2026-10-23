// ============================================================
// DIVULGUE E GANHE — regras do programa de indicação (23/10/2026)
// ============================================================
// Todo cliente com conta tem um link (`/kit?ref=CODIGO`). Quem compra por
// ele (até 30 dias depois do clique) gera ao indicador 10% do valor PAGO em
// produtos — sem frete e já descontado cupom. Termos de Uso 1.12, cláusula
// "Programa Divulgue e Ganhe"; Política 1.12 §3.1.
//
// SEM TABELA NOVA, como o cupom VOLTA:
//   - o CÓDIGO é derivado do id do usuário (hash), então não precisa ser
//     guardado — e não muda nunca;
//   - a INDICAÇÃO mora no pedido: orders.shipping.indicacao = { codigo,
//     pago_em?, cancelada? };
//   - a CHAVE PIX mora na conta: auth user_metadata.indica_pix.
//
// A comissão só fica LIBERADA depois de 7 dias do pagamento (direito de
// arrependimento do comprador, CDC art. 49) e só é paga a partir de R$ 50
// acumulados. Compra pelo próprio link não conta.
// ============================================================
import crypto from "node:crypto";

export const COMISSAO_PCT = 10;
export const CARENCIA_DIAS = 7;
export const MINIMO_PAGAMENTO_CENTAVOS = 5000;
export const REF_VALIDADE_DIAS = 30;

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DIA_MS = 86400000;

/** Código fixo do usuário: 6 letras/números, sem 0/O/1/I/L. */
export function codigoDoUsuario(userId) {
  const h = crypto.createHash("sha256").update("startouch-indica:" + String(userId)).digest();
  let s = "";
  for (let i = 0; i < 6; i++) s += ALFABETO[h[i] % ALFABETO.length];
  return s;
}

export function normalizaCodigo(c) {
  return String(c || "").trim().toUpperCase();
}

export function codigoValido(c) {
  return /^[A-HJKMNP-Z2-9]{6}$/.test(normalizaCodigo(c));
}

export function linkDoCodigo(codigo) {
  return `https://startouch.com.br/kit?ref=${codigo}`;
}

/** Valor dos produtos que o comprador de fato pagou (sem frete, menos cupom). */
export function baseDaComissao(order) {
  const ship = order?.shipping || {};
  let produtos = Number(ship.produtos_centavos);
  if (!Number.isFinite(produtos) || produtos <= 0) {
    produtos = (Array.isArray(order?.items) ? order.items : [])
      .reduce((s, i) => s + Math.round(Number(i.unit_price || 0) * 100) * (Number(i.qty) || 1), 0);
  }
  return Math.max(0, produtos - (Number(ship.cupom_usado?.desconto_centavos) || 0));
}

export function comissaoCentavos(order) {
  return Math.round((baseDaComissao(order) * COMISSAO_PCT) / 100);
}

/**
 * Em que pé está a comissão de um pedido PAGO.
 *   propria     comprou pelo próprio link — não conta
 *   cancelada   estornado ou cancelado à mão
 *   paga        já foi pro PIX do indicador
 *   aguardando  pago há menos de 7 dias (arrependimento)
 *   liberada    pode entrar no próximo pagamento
 */
export function situacao(order, indicador) {
  const ind = order?.shipping?.indicacao || {};
  const emailComprador = String(order?.email || order?.shipping?.email || "").toLowerCase();
  if (indicador && (order?.user_id === indicador.id ||
      (emailComprador && emailComprador === String(indicador.email || "").toLowerCase()))) {
    return "propria";
  }
  if (ind.cancelada) return "cancelada";
  if (ind.pago_em) return "paga";
  const pagoEm = Date.parse(order?.paid_at || order?.created_at || 0);
  return Date.now() - pagoEm < CARENCIA_DIAS * DIA_MS ? "aguardando" : "liberada";
}

export function liberaEm(order) {
  const pagoEm = Date.parse(order?.paid_at || order?.created_at || 0);
  return new Date(pagoEm + CARENCIA_DIAS * DIA_MS).toISOString();
}

/**
 * Mapa código → usuário, montado varrendo as contas (o código não é guardado).
 * O Supabase devolve no máximo 1000 por página: pagina até acabar.
 */
export async function mapaDeIndicadores(supabase) {
  const mapa = new Map();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("listUsers: " + error.message);
    const users = data?.users || [];
    for (const u of users) mapa.set(codigoDoUsuario(u.id), u);
    if (users.length < 1000) break;
  }
  return mapa;
}
