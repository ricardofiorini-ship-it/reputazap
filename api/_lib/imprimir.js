// ============================================================
// StarTouch — A impressão (camada 1 → camada 2)
// ============================================================
// POR QUÊ ESTE ARQUIVO EXISTE
//
// `reimprimir()` nasceu dentro de api/experiences.js, quando o único jeito de
// o destino de um dispositivo mudar era o lojista publicar ou mexer no
// interruptor. Isso deixou de ser verdade quando o cancelamento passou a
// valer no fim do período pago (07/09/2026): agora o destino também muda
// sozinho, na virada da data, sem ninguém tocar em nada.
//
// Quem aplica essa virada é a varredura (api/cron/plan-sweep.js). Se ela
// tivesse a própria cópia da impressão, existiriam DOIS escritores de
// `plates.served_*` com regras que um dia divergiriam — e o dia em que
// divergissem seria o dia em que um assinante em dia serve Google, ou um
// cancelado serve Menu. Então a função saiu de lá e veio pra cá, inteira, e
// os dois caminhos importam esta.
//
// Continua valendo o que já valia: `experiences.draft/published` é do
// lojista e NUNCA é tocado aqui. `plates.served_*` é derivado, descartável e
// reconstruível — apagar tudo e rodar de novo dá o mesmo resultado.
// ============================================================
import { resolvePlano, decidirServido } from "./plan.js";

/**
 * Recalcula `served_*` dos dispositivos de UM negócio. Único escritor desses
 * campos em todo o produto. Idempotente por construção.
 *
 * @param {object} supabase  client com SERVICE_KEY (quem chama fornece)
 * @param {object} biz       linha de `businesses` (precisa de id, plan, datas)
 * @param {string|null} email e-mail do dono — o override de admin depende dele.
 *   Passar null pra quem é admin faria a varredura imprimir Google nos
 *   dispositivos dele e a publicação imprimir Menu logo em seguida: os dois
 *   caminhos brigando pelo mesmo campo. Quem chama é responsável por trazer o
 *   e-mail certo, ou por saber que null é o certo.
 * @returns {Promise<number>} quantos dispositivos mudaram de destino
 */
export async function reimprimir(supabase, biz, email = null) {
  const resolucao = resolvePlano(biz, email || null);

  const [{ data: plates, error: e1 }, { data: exps, error: e2 }] = await Promise.all([
    supabase.from("plates")
      .select("id, experience_id, experience_enabled, served_mode, served_slug, served_reason")
      .eq("business_id", biz.id),
    supabase.from("experiences").select("id, slug, published, published_mode, archived_at").eq("business_id", biz.id)
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const porId = new Map((exps || []).map((e) => [e.id, e]));
  let mudados = 0;

  for (const p of plates || []) {
    const alvo = decidirServido({
      experiencia: p.experience_id ? porId.get(p.experience_id) || null : null,
      dispositivo: p,
      resolucao
    });
    // Só escreve o que mudou: evita encher o banco de escrita à toa e mantém
    // `served_at` significando "quando o destino mudou", não "quando rodou".
    if (p.served_mode === alvo.served_mode &&
        p.served_slug === alvo.served_slug &&
        p.served_reason === alvo.served_reason) continue;

    const { error } = await supabase.from("plates")
      .update({ ...alvo, served_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) console.error("[imprimir] falha ao reimprimir dispositivo", p.id, error.message);
    else mudados++;
  }
  return mudados;
}
