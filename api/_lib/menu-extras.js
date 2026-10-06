// ============================================================
// StarTouch Pro — quantos dispositivos o Menu Inteligente cobre
// ============================================================
// Decidido pelo Ricardo em 06/10/2026: o Pro (R$ 19,90) inclui o Menu em ATÉ
// 5 dispositivos; cada dispositivo a mais custa R$ 1,90/mês. Termos 1.8, §5.3.
//
// O QUE CONTA: dispositivo StarTouch com o Menu LIGADO num menu PUBLICADO e não
// arquivado. Dispositivo que leva direto ao Google não conta — quem tem 30
// cartões põe o menu nos 5 que quiser e os outros seguem grátis, como sempre.
//
// O LIMITE NÃO DESLIGA NADA SOZINHO. Ele age em dois momentos, e só neles:
//   1. ANTES de publicar ou ligar um dispositivo, se o total passaria de 5, o
//      servidor recusa (409, `precisaConfirmarExtra`) até a pessoa confirmar
//      que aceita o adicional. Sem esse "sim" explícito, nada é cobrado.
//   2. DEPOIS de qualquer mudança, `sincronizarExtras` acerta a quantidade do
//      item "dispositivo extra" na assinatura do Stripe com o que está no ar.
// Se a sincronização falhar, o menu continua no ar e o erro grita no log —
// a falha é a favor do cliente (um mês sem o adicional), nunca contra.
//
// FUNDADORES: as 4 assinaturas feitas até 06/10/2026 não têm limite (Termos
// 1.8 e /plano-pro: o que estava incluído quando assinou continua incluído).
// A lista é por ID DE ASSINATURA e não por cliente de propósito: quem cancela
// e assina de novo entra nas condições do dia em que voltou.
// ============================================================
import Stripe from "stripe";
import { soStartouch } from "./linha.js";

export const MENU_INCLUIDOS = 5;
export const PRECO_EXTRA_CENTAVOS = 190;
const LOOKUP_EXTRA = "menu_dispositivo_extra";

const ASSINATURAS_FUNDADORAS = new Set([
  "sub_1UJehxCAtkhLXi6ENeW8wJzQ",   // Evandro Cardoso — 25/09/2026
  "sub_1UJyovCAtkhLXi6EdFPgpLHl",   // Alvaro Ventania — 26/09/2026
  "sub_1UK3mzCAtkhLXi6EweLOY2yX",   // Paulo Eduardo   — 26/09/2026
  "sub_1UNF2DCAtkhLXi6EsXw82QUT",   // Germana Nóbrega — 05/10/2026
]);

// Mesma lista do resolvePlano: administrador é Pro sem assinatura, então não
// tem onde cobrar adicional nenhum.
const ADMIN_EMAILS = new Set(["ricardo.fiorini@gmail.com"]);

export function semLimite(biz, email = null) {
  if (email && ADMIN_EMAILS.has(String(email).toLowerCase().trim())) return true;
  return ASSINATURAS_FUNDADORAS.has(biz?.stripe_subscription_id || "");
}

export function resumoDoLimite(biz, email, emUso) {
  const ilimitado = semLimite(biz, email);
  return {
    incluidos: MENU_INCLUIDOS,
    ilimitado,
    emUso,
    extras: ilimitado ? 0 : Math.max(0, emUso - MENU_INCLUIDOS),
    precoExtraCentavos: PRECO_EXTRA_CENTAVOS,
  };
}

// Quantos dispositivos ficariam com o Menu ligado num menu publicado.
// `simular` antecipa a ação que ainda vai acontecer:
//   { publicar: expId }                      → conta esse menu como publicado
//   { plateId, experienceId, ligado }        → aplica a mudança naquele dispositivo
export async function contarComMenu(supabase, bizId, simular = {}) {
  const [{ data: exps, error: e1 }, { data: plates, error: e2 }] = await Promise.all([
    supabase.from("experiences").select("id, published, archived_at").eq("business_id", bizId),
    soStartouch(supabase.from("plates").select("id, experience_id, experience_enabled"))
      .eq("business_id", bizId).eq("status", "active"),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const noAr = new Set((exps || [])
    .filter((e) => !e.archived_at && (e.published || e.id === simular.publicar))
    .map((e) => e.id));

  let n = 0;
  for (const p of plates || []) {
    let expId = p.experience_id, ligado = p.experience_enabled === true;
    if (simular.plateId && p.id === simular.plateId) {
      if (simular.experienceId !== undefined) expId = simular.experienceId;
      if (simular.ligado !== undefined) ligado = simular.ligado;
    }
    if (ligado && expId && noAr.has(expId)) n++;
  }
  return n;
}

// A recusa que a tela transforma em pergunta. Devolve null quando pode seguir.
export function exigeConfirmacao({ biz, email, proAtivo, total, aceitaExtra }) {
  if (!proAtivo || semLimite(biz, email) || total <= MENU_INCLUIDOS || aceitaExtra === true) return null;
  const extras = total - MENU_INCLUIDOS;
  return {
    error: `O Pro inclui o Menu em ${MENU_INCLUIDOS} dispositivos. Com este, serão ${total} — ${extras} ${extras === 1 ? "extra" : "extras"} a R$ 1,90 por mês cada.`,
    precisaConfirmarExtra: true,
    incluidos: MENU_INCLUIDOS,
    total,
    extras,
    precoExtraCentavos: PRECO_EXTRA_CENTAVOS,
  };
}

let _stripe = null;
function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

let _precoExtra = null;
async function precoExtra(s) {
  if (_precoExtra) return _precoExtra;
  const achado = await s.prices.list({ lookup_keys: [LOOKUP_EXTRA], active: true, limit: 1 });
  if (achado.data[0]) return (_precoExtra = achado.data[0].id);
  // Primeira vez: cria o preço sozinho. Fica no painel do Stripe com este nome.
  const novo = await s.prices.create({
    currency: "brl",
    unit_amount: PRECO_EXTRA_CENTAVOS,
    recurring: { interval: "month" },
    lookup_key: LOOKUP_EXTRA,
    product_data: { name: "Menu Inteligente — dispositivo extra" },
  });
  return (_precoExtra = novo.id);
}

// Acerta a cobrança com o que está no ar. Nunca lança: chamado DEPOIS de a
// mudança já ter acontecido, então falhar aqui não pode desfazer o que o
// cliente fez — só avisa, alto.
export async function sincronizarExtras(supabase, biz, email = null) {
  try {
    if (!biz?.stripe_subscription_id || semLimite(biz, email)) return { pulado: true };
    const s = stripe();
    if (!s) { console.error("[menu-extras] STRIPE_SECRET_KEY ausente — adicional NÃO sincronizado"); return { erro: "sem stripe" }; }

    // linha-ok: conta só dispositivos servindo menu — cartão Trybo nunca serve 'menu'
    const { count, error } = await supabase.from("plates")
      .select("id", { count: "exact", head: true })
      .eq("business_id", biz.id).eq("served_mode", "menu");
    if (error) throw new Error(error.message);
    const desejado = Math.max(0, (count || 0) - MENU_INCLUIDOS);

    const sub = await s.subscriptions.retrieve(biz.stripe_subscription_id, { expand: ["items.data.price"] });
    if (!["active", "trialing", "past_due"].includes(sub.status)) return { pulado: true, status: sub.status };
    const item = sub.items.data.find((i) => i.price?.lookup_key === LOOKUP_EXTRA);
    const atual = item?.quantity || 0;
    if (atual === desejado) return { ok: true, extras: desejado, mudou: false };

    // Proporcional: ligou no meio do mês, paga os dias que usou; desligou,
    // recebe o crédito dos dias que não vai usar. Durante o teste grátis o
    // Stripe não cobra o item até o teste acabar.
    if (desejado === 0) {
      await s.subscriptionItems.del(item.id, { proration_behavior: "create_prorations" });
    } else if (item) {
      await s.subscriptionItems.update(item.id, { quantity: desejado, proration_behavior: "create_prorations" });
    } else {
      await s.subscriptionItems.create({
        subscription: sub.id, price: await precoExtra(s), quantity: desejado,
        proration_behavior: "create_prorations",
      });
    }
    console.log(`[menu-extras] negócio ${biz.id}: dispositivos extras ${atual} → ${desejado}`);
    return { ok: true, extras: desejado, mudou: true };
  } catch (e) {
    console.error(`[menu-extras] FALHOU ao sincronizar o adicional do negócio ${biz?.id}: ${e?.message} — menu segue no ar, cobrança desatualizada`);
    return { erro: e?.message };
  }
}
