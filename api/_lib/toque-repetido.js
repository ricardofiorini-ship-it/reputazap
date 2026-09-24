// ============================================================
// PROTEÇÃO CONTRA TOQUE REPETIDO (StarTouch e Trybo) — 24/09/2026
// ============================================================
// Pergunta uma coisa só: "este aparelho já encostou neste cartão hoje?".
// Se sim, o toque é REPETIDO: não soma na contagem do cartão, não entra em
// plate_taps e vira +1 em plates.toques_repetidos, que o dono vê no painel.
//
// Por que existe: o dono distribui cartão pra equipe e acompanha quem traz
// mais toques. Sem trava, o garçom encosta o próprio celular 50 vezes e
// vira o campeão. Isto NÃO fecha todas as portas (três celulares, os
// colegas tocando) — o único número que ele não fabrica é o total de
// avaliações no Google. Por isso o painel diz "toques", nunca "avaliações".
//
// LGPD (Política §4.4, versão 1.7): o código é HMAC de IP + navegador +
// cartão, com um SAL que muda por dia (tap_salt) e é apagado depois da
// meia-noite. Mora em tap_guard, NUNCA em plate_taps, e sai em até 24h pelo
// cron de retenção horário. Não usar este código pra mais nada — a base
// legal (prevenção de fraude na contagem) não cobre outra finalidade.
//
// NUNCA derruba o toque: qualquer falha aqui = o toque conta como sempre. E
// a falha grita uma vez por instância, porque proteção desligada calada é o
// bug nº1 deste projeto (ver _lib/places-cache.js, mesmo padrão).
// ============================================================
import { createHmac, randomBytes } from "crypto";

const FUSO_BR_MS = 3 * 3600000;   // Brasil sem horário de verão desde 2019

export function diaBR(agora = Date.now()) {
  return new Date(agora - FUSO_BR_MS).toISOString().slice(0, 10);
}

let salCache = { dia: null, sal: null };
let avisou = false;

function avisarDesligada(motivo) {
  if (avisou) return;
  avisou = true;
  console.warn(
    `[toque-repetido] PROTEÇÃO DESLIGADA nesta instância: ${motivo}. ` +
    "Todo toque está contando, inclusive o repetido. Se as tabelas não existem, rode supabase/schema-toque-repetido.sql."
  );
}

async function salDoDia(supabase) {
  const dia = diaBR();
  if (salCache.dia === dia) return salCache.sal;
  // Duas instâncias podem chegar juntas na virada do dia: as duas tentam
  // gravar, só uma ganha, e as duas LEEM o que ficou. Sem a releitura,
  // cada uma usaria o seu sal e o mesmo aparelho contaria duas vezes.
  const { error: insErr } = await supabase
    .from("tap_salt")
    .upsert({ dia, sal: randomBytes(32).toString("hex") }, { onConflict: "dia", ignoreDuplicates: true });
  if (insErr) throw new Error(insErr.message);
  const { data, error } = await supabase.from("tap_salt").select("sal").eq("dia", dia).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.sal) throw new Error("sal do dia não ficou gravado");
  salCache = { dia, sal: data.sal };
  return data.sal;
}

function ipDe(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || String(req.headers["x-real-ip"] || "") || req.socket?.remoteAddress || "";
}

// true = repetido (não contar). false = conta. Nunca lança.
export async function toqueRepetido(supabase, req, code) {
  try {
    const ip = ipDe(req);
    const ua = String(req.headers["user-agent"] || "");
    // Sem nada que diferencie aparelhos, todo mundo viraria "o mesmo" e só o
    // primeiro toque do dia contaria. Melhor contar tudo.
    if (!ip && !ua) return false;
    const sal = await salDoDia(supabase);
    const lang = String(req.headers["accept-language"] || "");
    const hash = createHmac("sha256", sal).update(`${ip}|${ua}|${lang}|${code}`).digest("hex");
    const { error } = await supabase.from("tap_guard").insert({ hash });
    if (!error) return false;
    if (error.code === "23505") return true;          // já vimos hoje
    avisarDesligada(error.message);
    return false;
  } catch (e) {
    avisarDesligada(e?.message || String(e));
    return false;
  }
}

// Soma o repetido no dispositivo. Coluna ausente (SQL não rodado) só loga:
// o toque já foi decidido, isto é só o placar.
export async function marcarRepetido(supabase, plateId) {
  try {
    // linha-ok: um dispositivo só, pelo id
    const { data, error } = await supabase
      .from("plates").select("toques_repetidos").eq("id", plateId).maybeSingle();
    if (error) throw new Error(error.message);
    // linha-ok: um dispositivo só, pelo id
    const { error: updErr } = await supabase
      .from("plates")
      .update({ toques_repetidos: (data?.toques_repetidos || 0) + 1, ultimo_repetido_em: new Date().toISOString() })
      .eq("id", plateId);
    if (updErr) throw new Error(updErr.message);
  } catch (e) {
    console.error("[toque-repetido] não somou o repetido no dispositivo:", e?.message || e);
  }
}
