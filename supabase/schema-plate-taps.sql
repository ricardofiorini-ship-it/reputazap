-- ============================================================
-- StarTouch — Histórico de toques nas placas (log de eventos)
-- Rodar UMA VEZ no Supabase: SQL Editor → New query → cola tudo → Run
-- ============================================================
-- Por quê: `plates.total_taps` é um CONTADOR — sabe "quantas vezes",
-- nunca "quando". Sem log não existe "toques desta semana", comparação
-- entre meses, nem gráfico. E é histórico que não volta: cada dia sem
-- gravar é um dia perdido pra sempre.
--
-- Esta tabela NÃO substitui `total_taps`. O contador continua sendo a
-- fonte da soma histórica (inclusive dos toques anteriores a este log);
-- o log responde as perguntas com data. Os dois convivem.
-- ============================================================

CREATE TABLE IF NOT EXISTS plate_taps (
  id BIGSERIAL PRIMARY KEY,

  plate_id UUID NOT NULL REFERENCES plates(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  code TEXT NOT NULL,                    -- desnormalizado de propósito: o log sobrevive à placa

  tapped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Como o cliente chegou: nfc (encostou), qr (escaneou), link (mandou por mensagem).
  -- Vem do utm_medium repassado pelo /r/:code; placa antiga sem parâmetro cai em 'nfc'.
  medium TEXT,
  source TEXT,                           -- utm_source (normalmente 'placa')
  campaign TEXT,                         -- utm_campaign, quando houver

  -- Contexto leve, sem dado pessoal: nada de IP, nada de identificador de aparelho.
  device TEXT,                           -- mobile | desktop | outro
  referer_host TEXT
);

-- Índices pensados nas duas perguntas reais da tela:
-- "toques deste negócio no período X" e "toques desta placa no período X".
CREATE INDEX IF NOT EXISTS idx_plate_taps_biz_time ON plate_taps(business_id, tapped_at DESC);
CREATE INDEX IF NOT EXISTS idx_plate_taps_plate_time ON plate_taps(plate_id, tapped_at DESC);

-- ── MARCO ZERO (parcial do hodômetro) ───────────────────────
-- O dono vai querer "zerar o contador" — mudou a placa de lugar, quer contar
-- a partir da campanha nova, quer limpar toques de teste. Zerar NÃO apaga:
-- guarda a data do recomeço e quanto o contador marcava naquele instante.
-- O parcial vira (total_taps - counter_reset_taps), o total continua intacto
-- e desfazer é só limpar as duas colunas. Dado apagado não volta; marco volta.
ALTER TABLE plates ADD COLUMN IF NOT EXISTS counter_reset_at TIMESTAMPTZ;
ALTER TABLE plates ADD COLUMN IF NOT EXISTS counter_reset_taps INTEGER DEFAULT 0;

-- ── RLS ─────────────────────────────────────────────────────
-- Mesma regra das placas: o cliente enxerga só o que é dos próprios negócios.
-- A escrita acontece no backend com SERVICE_KEY (bypassa RLS) — ninguém
-- consegue inventar toque com a chave pública.
ALTER TABLE plate_taps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plate_taps_select_own" ON plate_taps;
CREATE POLICY "plate_taps_select_own" ON plate_taps
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );
