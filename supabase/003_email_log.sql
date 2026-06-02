-- ============================================================
-- StarTouch — Log de emails enviados (idempotência)
-- ============================================================
-- Cada email transacional só pode ser enviado UMA vez por user.
-- Garante que se um endpoint for chamado 2x (race condition,
-- retry, etc.) o usuário não receba 2 boas-vindas.
-- ============================================================

CREATE TABLE IF NOT EXISTS email_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  email_type TEXT NOT NULL,
  -- Tipos:
  --   welcome              → cadastro novo
  --   business_linked      → vinculou negócio (savebiz com place_id)
  --   first_device         → ativou primeira placa
  --   another_device       → ativou placa adicional
  --   first_review         → primeiro toque na placa virou avaliação
  --   weekly_digest        → resumo semanal (Fase 3)

  to_email TEXT NOT NULL,
  resend_id TEXT,                   -- id retornado pela Resend (rastreio)
  metadata JSONB,                   -- dados extras (place_id, code da placa, etc.)
  sent_at TIMESTAMPTZ DEFAULT NOW(),

  -- Idempotência: pra emails únicos (welcome, business_linked, first_device, first_review)
  -- não permite 2 envios por user. Pra recorrentes (another_device, weekly_digest) é OK ter N.
  -- A regra de unicidade fica no código (não em DB) pra dar flexibilidade.

  UNIQUE (user_id, email_type, sent_at)
);

CREATE INDEX IF NOT EXISTS idx_email_log_user_type
  ON email_log (user_id, email_type);

CREATE INDEX IF NOT EXISTS idx_email_log_sent_at
  ON email_log (sent_at DESC);

-- ============================================================
-- RLS: read-only pro próprio user; writes só via SERVICE_KEY
-- ============================================================
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email log" ON email_log;
CREATE POLICY "Users can view own email log" ON email_log
  FOR SELECT USING (user_id = auth.uid());

COMMENT ON TABLE email_log IS
  'Histórico de emails transacionais enviados. Usado pra idempotência (não enviar 2x) e debug.';
