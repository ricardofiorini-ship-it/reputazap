-- ============================================================
-- TRYBO 003 — a conta pode nascer sem Google
-- Rodar UMA VEZ no Supabase. Idempotente.
-- ============================================================
--
-- POR QUE
--
-- Na StarTouch, toda conta nasce de uma busca no Google: o lojista escolhe o
-- negócio dele e o `place_id` vem junto. O produto INTEIRO gira em torno
-- disso, então a coluna nunca foi opcional na prática.
--
-- A Trybo quebra essa premissa. A barbearia que compra um cartão de redes
-- sociais pode não ter (ou não se importar com) ficha no Google — e o produto
-- não precisa dela pra nada: o destino do cartão é o Instagram, não a
-- avaliação. Exigir o Google na ativação seria pedir ao cliente uma coisa que
-- não tem nada a ver com o que ele comprou, no passo mais frágil do funil.
--
-- O QUE MUDA NA PRÁTICA: nada para quem já existe.
-- Afrouxar um NOT NULL nunca reprova linha gravada. Nenhuma conta atual fica
-- sem `place_id` por causa disto, e o `savebiz` (por onde passa toda conta da
-- StarTouch) continua EXIGINDO o campo no código — a regra da avaliação
-- continua valendo onde ela importa.
--
-- O QUE PASSA A SER POSSÍVEL: uma conta com `place_id` nulo, criada pela
-- ativação da Trybo. Quem ler o banco depois precisa saber disso — é por isso
-- que existe o COMMENT abaixo, e não só este arquivo.
-- ============================================================

ALTER TABLE businesses ALTER COLUMN place_id DROP NOT NULL;

COMMENT ON COLUMN businesses.place_id IS
  'Ficha do Google. NULO é legítimo desde 23/09/2026: conta criada pela ativação de um cartão Trybo, que não depende do Google. Toda conta vinda do savebiz (StarTouch) tem valor.';

-- ── CONFERENCIA ─────────────────────────────────────────────
-- is_nullable deve ser YES; e o segundo número deve ser 0 hoje
-- (ninguém ficou sem place_id por causa desta mudança).
SELECT
  (SELECT is_nullable FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'place_id') AS aceita_nulo,
  (SELECT count(*) FROM businesses WHERE place_id IS NULL)        AS contas_sem_google;
