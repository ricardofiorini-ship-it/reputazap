-- ============================================================
-- StarTouch — Fase 1: Snapshots semanais de concorrentes
-- ============================================================
-- Propósito: guardar 1 snapshot/semana do estado competitivo de
-- cada negócio. Destrava sparkline real, weekGrowth, mapa lat/lng
-- e serve de base pros alertas (Fase 2) e relatórios (Fase 3).
--
-- Rodar uma vez no Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  -- Estado próprio nesta data
  my_rating NUMERIC(2,1),
  my_reviews INT,
  my_rank INT,                  -- posição calculada pelo gscore
  total_competitors INT,
  category TEXT,                -- categoria/keyword usada na busca
  radius_meters INT,

  -- Top concorrentes (JSONB). Cada item:
  -- { place_id, name, rating, reviews, lat, lng, is_me }
  competitors JSONB NOT NULL,

  -- Resposta crua da Places API pra re-cálculo histórico se a
  -- fórmula de scoring mudar no futuro.
  raw_response JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Garantia de 1 snapshot por business por dia (idempotência)
  UNIQUE (business_id, snapshot_date)
);

-- Lookup rápido do snapshot mais recente de um negócio
CREATE INDEX IF NOT EXISTS idx_snapshots_biz_date
  ON competitor_snapshots (business_id, snapshot_date DESC);

-- Pra crons varrerem por data
CREATE INDEX IF NOT EXISTS idx_snapshots_date
  ON competitor_snapshots (snapshot_date DESC);

-- ============================================================
-- RLS: read-only pro próprio dono via supabase auth.
-- Crons usam SERVICE_KEY (ignora RLS).
-- ============================================================
ALTER TABLE competitor_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own snapshots" ON competitor_snapshots;
CREATE POLICY "Users can read own snapshots" ON competitor_snapshots
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Comentários pra documentação automática
COMMENT ON TABLE competitor_snapshots IS
  'Snapshot semanal do estado competitivo. 1 row por negócio por dia. Cron: api/cron/snapshot-competitors.js';
COMMENT ON COLUMN competitor_snapshots.competitors IS
  'Array JSONB com top concorrentes. Shape: [{place_id, name, rating, reviews, lat, lng, is_me}]';
COMMENT ON COLUMN competitor_snapshots.raw_response IS
  'Resposta crua do Google Places (Nearby Search). Permite re-calcular com fórmula nova sem nova chamada.';
