// ============================================================
// StarTouch — Cron: virada dos planos que venceram
// ============================================================
// Schedule: diário, 05:00 UTC (vercel.json).
//
// POR QUE ESTA ROTINA PRECISA EXISTIR
//
// Cancelar passou a valer no fim do período pago (07/09/2026). Isso cria uma
// mudança de estado que acontece SOZINHA, na virada de uma data, sem ninguém
// tocar em nada — e ninguém estava encarregado de aplicá-la.
//
// Sem esta varredura o cancelamento sairia mentiroso do outro lado: o
// resolvePlano diria "free" na data certa, mas `businesses.plan` seguiria
// 'pro' pra sempre (é ele que o painel lê pra escrever PRO no rodapé) e
// `plates.served_mode` seguiria 'menu' pra sempre — e é ele, congelado, que o
// toque na placa obedece (api/r/[code].js). Ou seja: cancelar daria Pro
// eterno.
//
// ESCOPO: só o cancelamento. O trial de 14 dias tem um buraco parecido (quando
// vence, `plates.served_*` também fica velho), mas ele não é resolvido aqui —
// enquanto o Pro não estiver à venda não existe trial rodando, e misturar as
// duas viradas numa rotina só esconderia qual delas quebrou.
//
// A varredura é a CORREÇÃO, não a defesa. A defesa é o resolvePlano, que está
// certo mesmo se este cron não rodar — a regra da casa é que proteção não pode
// depender de cron que pode não ter subido (CLAUDE.md, "cron que não tinha
// deployado"). Aqui o pior caso de falha é dado velho, não porta aberta.
//
// NÃO APAGA NADA. Mexe em `businesses.plan` (o rótulo) e em `plates.served_*`
// (o destino impresso). `experiences.draft/published` — o que o lojista
// escreveu — é intocável e continua guardado, esperando ele voltar.
//
// Auth: header x-vercel-cron (cron real) OU ?secret=CRON_SECRET (teste).
// Teste manual: GET /api/cron/plan-sweep?dry=1&secret=SEU_CRON_SECRET
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { reimprimir } from "../_lib/imprimir.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CRON_SECRET = process.env.CRON_SECRET;

function checkAuth(req) {
  if (req.headers["x-vercel-cron"] === "1") return true;
  if (CRON_SECRET && (req.headers.authorization || "") === `Bearer ${CRON_SECRET}`) return true;
  if (CRON_SECRET && req.query.secret === CRON_SECRET) return true;
  return false;
}

// O e-mail do dono decide o override de admin dentro do resolvePlano. Sem ele,
// a varredura imprimiria Google nos dispositivos do administrador e a
// publicação imprimiria Menu de volta — dois escritores brigando pelo mesmo
// campo. Falha aqui não derruba a virada: volta null e o negócio é tratado
// como cliente comum, que é o caso de 100% da base.
async function emailDoDono(userId) {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) throw error;
    return data?.user?.email || null;
  } catch (e) {
    console.warn(`[cron/plan-sweep] não consegui ler o e-mail do dono ${userId}: ${e?.message}`);
    return null;
  }
}

export default async function handler(req, res) {
  if (!checkAuth(req)) return res.status(404).end();

  const dry = req.query.dry === "1";
  const agora = new Date().toISOString();
  const resultado = { ok: true, dry, verificados: 0, rebaixados: [], dispositivos: 0, erros: [] };

  try {
    // `select("*")` de propósito, e não a lista de colunas que esta rotina usa.
    // Duas razões, as duas aprendidas do jeito caro:
    //   1. A linha inteira é entregue ao resolvePlano lá embaixo. Se eu
    //      escolhesse colunas a dedo e esquecesse uma que ele lê (trial_ends_at,
    //      por exemplo), ele decidiria diferente aqui e no api/experiences.js —
    //      e os dois escrevem no MESMO campo `plates.served_*`.
    //   2. `trial_ends_at` chega com supabase/schema-experiences.sql e pode não
    //      ter rodado ainda. Pedir uma coluna que não existe derruba a consulta
    //      INTEIRA (o billing.js já contorna isso na mão, em ?action=debug).
    //      Com `*` o banco devolve o que tem e a rotina roda de qualquer jeito.
    // A tabela é pequena (centenas de linhas) e isto roda uma vez por dia.
    const { data: candidatos, error } = await supabase
      .from("businesses").select("*").eq("plan", "pro");
    if (error) throw new Error(error.message);

    resultado.verificados = (candidatos || []).length;

    for (const biz of candidatos || []) {
      const fim = biz.stripe_cancel_at_period_end === true ? biz.stripe_current_period_end : null;
      const venceu = !!fim && new Date(fim).getTime() <= Date.now();
      if (!venceu) continue;

      if (dry) {
        resultado.rebaixados.push({ id: biz.id, name: biz.name, venceuEm: fim, simulado: true });
        continue;
      }

      const { error: e1 } = await supabase
        .from("businesses")
        .update({ plan: "free", stripe_subscription_id: null })
        .eq("id", biz.id);
      if (e1) {
        // Não reimprime se o rótulo não virou: imprimir Google com o banco
        // ainda dizendo 'pro' deixaria os dois discordando, que é pior do que
        // um dia a mais de Pro. Fica pro próximo dia, e o erro sai daqui alto.
        console.error(`[cron/plan-sweep] falha ao rebaixar ${biz.id}: ${e1.message}`);
        resultado.erros.push({ id: biz.id, etapa: "plano", erro: e1.message });
        continue;
      }

      let mudados = 0;
      try {
        const email = await emailDoDono(biz.user_id);
        mudados = await reimprimir(supabase, { ...biz, plan: "free" }, email);
      } catch (e2) {
        console.error(`[cron/plan-sweep] falha ao reimprimir ${biz.id}: ${e2.message}`);
        resultado.erros.push({ id: biz.id, etapa: "impressao", erro: e2.message });
      }

      resultado.dispositivos += mudados;
      resultado.rebaixados.push({ id: biz.id, name: biz.name, venceuEm: fim, dispositivos: mudados });
      console.log(`[cron/plan-sweep] ${biz.name} (${biz.id}) → free (período pago terminou em ${fim}); ${mudados} dispositivo(s) voltaram ao Google.`);
    }

    // Execução silenciosa é o normal aqui — a base de assinantes é pequena e
    // a maioria dos dias não tem ninguém vencendo. Mesmo assim o log sai
    // sempre: dia sem linha nenhuma é indistinguível de cron que não rodou.
    console.log(`[cron/plan-sweep] ${agora} — ${resultado.verificados} pro(s) conferido(s), ${resultado.rebaixados.length} rebaixado(s), ${resultado.dispositivos} dispositivo(s) reimpresso(s)${dry ? " [SIMULACAO]" : ""}`);
    return res.json(resultado);
  } catch (err) {
    console.error("[cron/plan-sweep] erro:", err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
