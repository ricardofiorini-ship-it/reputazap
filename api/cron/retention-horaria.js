// ============================================================
// Cron: expurgo HORÁRIO da política de retenção (LGPD)
// ============================================================
// Schedule: de hora em hora, minuto 7 (vercel.json).
//
// Mesma rotina do retention.js, só com os alvos do grupo "horario": hoje, a
// trava contra toque repetido (tap_guard e tap_salt, Política §4.4 v1.7), que
// promete "até 24 horas" — prazo que a rodada diária não cumpriria.
//
// Arquivo à parte, e não `?grupo=` no path do cron, porque um cron que não
// dispara é silencioso: ninguém vê o que não aconteceu. Com rota própria, o
// retention_runs mostra uma linha por hora ou mostra o buraco.
// Teste manual: GET /api/cron/retention-horaria?dry=1&secret=SEU_CRON_SECRET
// ============================================================
import retention from "./retention.js";

export default async function handler(req, res) {
  req.query = { ...(req.query || {}), grupo: "horario" };
  return retention(req, res);
}
