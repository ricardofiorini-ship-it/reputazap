-- ============================================================
-- StarTouch — CARIMBO DE GRAVAÇÃO DO CHIP (/admin/gravar)
-- Rodar UMA VEZ no Supabase (SQL Editor → cola tudo → Run).
-- Idempotente: rodar de novo não muda nada.
-- ============================================================
--
-- O QUE ISTO HABILITA
-- A tela /admin/gravar lê o QR impresso, grava o chip NFC com a URL que o
-- servidor manda e CARIMBA o código. Se o mesmo código aparecer de novo, a
-- tela fica vermelha antes de o cartão ir pro envelope.
--
-- POR QUE EXISTE
-- 23/09/2026: STAR-CXHFCP saiu impresso em DUAS vias pela gráfica e o cliente
-- recebeu um cartão que abria a ótica de outra pessoa. As duas cópias passaram
-- pela mão do Ricardo no mesmo lote, antes de qualquer cliente tocar nelas —
-- então "este cartão já foi lido?" responderia "não" pras duas. O que pega o
-- duplicado é "este código já foi GRAVADO?", e isso só existe se a gravação
-- deixar rastro.
--
-- POR QUE COLUNAS NOVAS E NÃO status='sent'
-- `sent` já existe, mas o cartão gravado ainda está no estoque (vai pro Mercado
-- Livre, pra gaveta). Mudar o status derrubaria a contagem "Em estoque" do
-- /admin/estoque e dispararia o alerta de estoque baixo à toa.
--
-- A rota RECUSA carimbar se estas colunas não existirem (erro alto, com o nome
-- deste arquivo na mensagem) em vez de gravar o chip sem rastro.

ALTER TABLE plates ADD COLUMN IF NOT EXISTS nfc_gravado_em TIMESTAMPTZ;
ALTER TABLE plates ADD COLUMN IF NOT EXISTS nfc_repeticoes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plates ADD COLUMN IF NOT EXISTS nfc_ultima_repeticao TIMESTAMPTZ;

COMMENT ON COLUMN plates.nfc_gravado_em IS
  'Quando o chip foi gravado e conferido pelo /admin/gravar. NULL = nunca passou pela tela (inclui todo o estoque anterior a 24/09/2026).';
COMMENT ON COLUMN plates.nfc_repeticoes IS
  'Quantas vezes este código apareceu de novo na gravação depois de carimbado. Maior que zero = suspeita de cartão impresso em dobro.';
COMMENT ON COLUMN plates.nfc_ultima_repeticao IS
  'Quando o código reapareceu pela última vez na gravação.';

-- Pra achar rápido os códigos suspeitos de duplicidade.
CREATE INDEX IF NOT EXISTS idx_plates_nfc_repeticoes ON plates(nfc_ultima_repeticao DESC) WHERE nfc_repeticoes > 0;

-- ── CONFERÊNCIA ─────────────────────────────────────────────
-- Deve devolver 3 linhas.
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_name = 'plates'
   AND column_name IN ('nfc_gravado_em', 'nfc_repeticoes', 'nfc_ultima_repeticao');
