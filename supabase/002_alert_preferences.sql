-- ============================================================
-- StarTouch — Fase 2a: Preferências de alertas
-- ============================================================
-- Onde o usuário quer receber alertas (email, WhatsApp, painel)
-- e com qual frequência. Consumido pelo cron de geração de
-- alertas (Fase 2b) quando entrar.
--
-- Rodar uma vez no Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS alert_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Painel (sempre on; só guardado pra consistência)
  dashboard_enabled BOOLEAN DEFAULT TRUE,

  -- Email
  email_enabled BOOLEAN DEFAULT TRUE,
  email_frequency TEXT DEFAULT 'realtime',  -- realtime | daily_digest | weekly_digest
  email_to TEXT,                            -- default = email do user logado

  -- WhatsApp
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  whatsapp_phone TEXT,
  whatsapp_critical_only BOOLEAN DEFAULT TRUE,

  -- Tipos de evento opt-in/out (vazio = todos habilitados)
  enabled_types JSONB DEFAULT '{}'::jsonb,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garante que email_frequency seja um dos valores aceitos
ALTER TABLE alert_preferences DROP CONSTRAINT IF EXISTS email_frequency_check;
ALTER TABLE alert_preferences ADD CONSTRAINT email_frequency_check
  CHECK (email_frequency IN ('realtime', 'daily_digest', 'weekly_digest'));

-- ============================================================
-- RLS: user só vê/edita as próprias preferências.
-- Crons usam SERVICE_KEY (ignora RLS) pra ler todos.
-- ============================================================
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON alert_preferences;
CREATE POLICY "Users can view own preferences" ON alert_preferences
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own preferences" ON alert_preferences;
CREATE POLICY "Users can update own preferences" ON alert_preferences
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own preferences" ON alert_preferences;
CREATE POLICY "Users can insert own preferences" ON alert_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE alert_preferences IS
  'Preferências de notificação por usuário. Consumido pelo cron de geração de alertas (Fase 2b).';
