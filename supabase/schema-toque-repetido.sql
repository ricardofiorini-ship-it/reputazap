-- ============================================================
-- StarTouch + Trybo — PROTEÇÃO CONTRA TOQUE REPETIDO
-- Rodar UMA VEZ no Supabase (SQL Editor → cola tudo → Run).
-- Idempotente: rodar de novo não muda nada.
-- ============================================================
--
-- O QUE ISTO HABILITA
-- O mesmo aparelho encostando no mesmo cartão conta UMA vez por dia. O
-- garçom que encosta o próprio celular 50 vezes soma 1 toque — e 49
-- repetidos, que aparecem no painel do dono em vez de sumir.
--
-- COMO, SEM GUARDAR DADO PESSOAL (Política de Privacidade §4.4, versão 1.7)
-- No toque, a rota calcula um código embaralhado (HMAC-SHA256) de IP +
-- navegador + código do cartão, com um SAL que muda todo dia. O código vai
-- pra `tap_guard`, que só responde "já vi isto hoje?". Nada disso entra em
-- `plate_taps` — o registro de toques continua sem identificador (§4.1).
--
-- PRAZOS (cumpridos pelo cron de retenção HORÁRIO, com prova em retention_runs):
--   tap_guard → apagado com 23 horas (a Política promete "até 24 horas")
--   tap_salt  → o sal de ontem é apagado depois da meia-noite de Brasília.
--               Sem o sal, nem nós conseguimos refazer o código — é o que
--               torna verdade o "nem para nós" da Política.
--
-- RLS ligada e SEM policy nas duas: só o servidor (service key) toca nelas.
-- A chave anônima é pública e tem GRANT ALL em tudo do schema public — a RLS
-- é a única defesa (ver CLAUDE.md, Princípios).
--
-- Se estas tabelas não existirem, a rota NÃO quebra: o toque conta como
-- sempre e o log avisa "PROTEÇÃO DESLIGADA" uma vez por instância.

CREATE TABLE IF NOT EXISTS tap_guard (
  hash TEXT PRIMARY KEY,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tap_guard_criado ON tap_guard(criado_em);
ALTER TABLE tap_guard ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS tap_salt (
  dia DATE PRIMARY KEY,               -- dia no fuso de Brasília
  sal TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE tap_salt ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE tap_guard IS
  'Códigos temporários contra toque repetido (Política §4.4). Não individualiza sem o sal do dia; apagado em até 24h pelo cron de retenção horário.';
COMMENT ON TABLE tap_salt IS
  'Sal diário do código de tap_guard. O de ontem é apagado depois da meia-noite de Brasília — depois disso o código não pode mais ser refeito por ninguém.';

-- O que o dono vê: quantos toques NÃO contaram, por dispositivo.
ALTER TABLE plates ADD COLUMN IF NOT EXISTS toques_repetidos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plates ADD COLUMN IF NOT EXISTS ultimo_repetido_em TIMESTAMPTZ;
COMMENT ON COLUMN plates.toques_repetidos IS
  'Toques do mesmo aparelho no mesmo dia que não entraram na contagem (total_taps). Número alto = alguém tocando o próprio cartão.';

-- ── CONFERÊNCIA ─────────────────────────────────────────────
-- Deve devolver 2 linhas com rls = true, e depois 2 colunas.
SELECT relname, relrowsecurity AS rls FROM pg_class WHERE relname IN ('tap_guard', 'tap_salt');
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'plates' AND column_name IN ('toques_repetidos', 'ultimo_repetido_em');
