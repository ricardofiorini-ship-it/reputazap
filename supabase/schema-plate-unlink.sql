-- ============================================================
-- StarTouch — DESVINCULAR DISPOSITIVO (voltar de fábrica)
-- Rodar UMA VEZ no Supabase (SQL Editor → cola tudo → Run).
-- Idempotente: rodar de novo não muda nada.
-- ============================================================
--
-- O QUE ISTO HABILITA
-- O cliente aperta "Desvincular dispositivo" no painel, digita o código
-- impresso no cartão e o dispositivo volta ao estado de fábrica: sem dono,
-- sem apelido, sem contagem, sem menu — o código fica livre pra ser ativado
-- por qualquer conta.
--
-- POR QUE ESTAS DUAS COLUNAS EXISTEM
-- O código do dispositivo aparece na URL de quem encosta o celular nele.
-- Enquanto está ativado isso é inofensivo (o sistema recusa quem tenta
-- reativar), mas no instante em que volta pra fábrica ele fica ao alcance de
-- quem tiver anotado o código. Decidido em 10/09/2026 aceitar esse risco em
-- troca do autoatendimento, com uma condição: **toda desvinculação deixa
-- rastro**. Sem `previous_business_id` uma disputa vira palavra contra
-- palavra e não há como devolver o dispositivo a quem era dele.
--
-- Guardam a ÚLTIMA desvinculação, não o histórico — é o que basta pra
-- desfazer. Moram na própria linha da placa de propósito: gravadas no MESMO
-- UPDATE que zera o dispositivo, nunca podem existir uma sem a outra. Um log
-- em tabela separada poderia falhar sozinho e a desvinculação passaria sem
-- rastro — falha silenciosa, o bug nº 1 deste projeto.
--
-- A rota RECUSA desvincular se estas colunas não existirem (erro alto, com o
-- nome deste arquivo na mensagem) em vez de desvincular sem registrar.

ALTER TABLE plates ADD COLUMN IF NOT EXISTS previous_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE plates ADD COLUMN IF NOT EXISTS unlinked_at TIMESTAMPTZ;

COMMENT ON COLUMN plates.previous_business_id IS
  'De quem era este dispositivo antes da última desvinculação. Existe pra devolver o dispositivo ao dono certo se a liberação tiver sido engano ou má-fé.';
COMMENT ON COLUMN plates.unlinked_at IS
  'Quando o dono desvinculou pela última vez. NULL = nunca foi desvinculado.';

-- Pra achar rápido "o que foi liberado nos últimos dias" numa apuração.
CREATE INDEX IF NOT EXISTS idx_plates_unlinked ON plates(unlinked_at DESC) WHERE unlinked_at IS NOT NULL;

-- ── CONFERÊNCIA ─────────────────────────────────────────────
-- Deve devolver 2 linhas.
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_name = 'plates'
   AND column_name IN ('previous_business_id', 'unlinked_at');
