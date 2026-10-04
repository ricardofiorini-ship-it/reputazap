-- ============================================================
-- StarTouch — TOQUES EM DISPOSITIVO AINDA NÃO ATIVADO
-- Rodar UMA VEZ no Supabase (SQL Editor → cola tudo → Run).
-- Idempotente: rodar de novo não muda nada.
-- ============================================================
--
-- POR QUE EXISTE (04/10/2026)
-- Em 30 dias a página /ativar-codigo foi aberta ~3 mil vezes vindo de toque ou
-- QR de dispositivo — e só chega lá quem toca um dispositivo NÃO ativado. Duas
-- histórias explicam isso e pedem remédios opostos:
--   (a) POUCOS dispositivos tocados MUITAS vezes: revendedor demonstrando,
--       dono testando antes de ativar. Inofensivo.
--   (b) MUITOS dispositivos tocados por DIAS seguidos: cartão já distribuído
--       sem ter sido ativado — o cliente do lojista cai numa tela de cadastro
--       em vez do Google, e a avaliação se perde.
-- O contador por dispositivo separa as duas.
--
-- LGPD: é contagem por dispositivo, sem nada de quem tocou (sem IP, sem
-- aparelho, sem hora individual guardada) — mesma natureza do total_taps,
-- coberta pela Política §4.1 ("registramos apenas contagem e formato").
--
-- Sem estas colunas a rota /r/ NÃO quebra: o toque segue pra /ativar-codigo
-- como sempre e o log avisa "CONTAGEM SEM ATIVAR DESLIGADA" uma vez por instância.

ALTER TABLE plates ADD COLUMN IF NOT EXISTS toques_sem_ativar INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plates ADD COLUMN IF NOT EXISTS dias_com_toque_sem_ativar INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plates ADD COLUMN IF NOT EXISTS primeiro_toque_sem_ativar TIMESTAMPTZ;
ALTER TABLE plates ADD COLUMN IF NOT EXISTS ultimo_toque_sem_ativar TIMESTAMPTZ;

COMMENT ON COLUMN plates.toques_sem_ativar IS
  'Toques recebidos enquanto o dispositivo NÃO estava ativo (caíram em /ativar-codigo). Contagem pura, sem dado de quem tocou. Desde 04/10/2026.';
COMMENT ON COLUMN plates.dias_com_toque_sem_ativar IS
  'Em quantos dias diferentes (fuso de Brasília) houve toque sem ativar. Muitos dias = cartão em uso sem estar ativado.';

-- ── CONFERÊNCIA ─────────────────────────────────────────────
-- Deve devolver 4 linhas.
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'plates'
   AND column_name IN ('toques_sem_ativar', 'dias_com_toque_sem_ativar',
                       'primeiro_toque_sem_ativar', 'ultimo_toque_sem_ativar');

-- ============================================================
-- LEITURA (rodar daqui a 1–2 semanas — só leitura, não muda nada)
-- ============================================================
-- 1) O retrato: quantos dispositivos, quantos toques, em quantos dias.
--    Se poucos dispositivos concentram quase todos os toques → história (a).
--    Se muitos dispositivos têm toque em 3+ dias diferentes → história (b).
-- SELECT
--   count(*)                                             AS dispositivos_tocados_sem_ativar,
--   sum(toques_sem_ativar)                               AS toques,
--   count(*) FILTER (WHERE dias_com_toque_sem_ativar >= 3) AS tocados_em_3_dias_ou_mais,
--   count(*) FILTER (WHERE status = 'active')            AS ja_ativados_depois
-- FROM plates WHERE toques_sem_ativar > 0;
--
-- 2) Os casos: maiores primeiro.
-- SELECT code, status, product_type, toques_sem_ativar, dias_com_toque_sem_ativar,
--        primeiro_toque_sem_ativar, ultimo_toque_sem_ativar
-- FROM plates WHERE toques_sem_ativar > 0
-- ORDER BY dias_com_toque_sem_ativar DESC, toques_sem_ativar DESC LIMIT 50;
