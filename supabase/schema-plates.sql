-- ============================================================
-- StarTouch — Sistema de Placas Pré-Produzidas (FLUXO ÚNICO)
-- Rodar UMA VEZ no Supabase: SQL Editor → New query → cola tudo → Run
-- ============================================================
-- Princípio: placa é estoque genérico. Vínculo placa↔negócio acontece
-- na ATIVAÇÃO pelo cliente, não na compra. O canal de venda (source)
-- é apenas metadado. Não há dependência de tabela `orders`.
-- ============================================================

-- ── TABELA: production_batches (lotes de produção) ──────────
CREATE TABLE IF NOT EXISTS production_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_name TEXT NOT NULL,
  product_type TEXT NOT NULL,            -- placa_balcao | placa_mesa | pulseira_nfc | adesivo_nfc
  quantity_planned INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  supplier TEXT,
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(10,2),
  status TEXT DEFAULT 'planning',        -- planning | ordered | producing | received
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_batches_status ON production_batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_product ON production_batches(product_type);

-- ── TABELA: plates (estoque de placas + status) ─────────────
CREATE TABLE IF NOT EXISTS plates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,             -- ex: STAR-X7K9P
  product_type TEXT NOT NULL,           -- placa_balcao | placa_mesa | pulseira_nfc | adesivo_nfc
  batch_id UUID REFERENCES production_batches(id),

  status TEXT NOT NULL DEFAULT 'in_stock',
  -- in_stock | assigned | sent | active | disabled

  business_id UUID REFERENCES businesses(id),
  channel_name TEXT,                     -- apelido dado na ativação ("Balcão Principal")

  source TEXT DEFAULT 'site',            -- site | ml | loja_fisica | parceiro | demo (metadado)
  ml_order_number TEXT,
  ml_buyer_name TEXT,
  ml_buyer_phone TEXT,

  total_taps INTEGER DEFAULT 0,
  last_tapped_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_plates_code ON plates(code);
CREATE INDEX IF NOT EXISTS idx_plates_status ON plates(status);
CREATE INDEX IF NOT EXISTS idx_plates_business ON plates(business_id);

-- ── RLS (Row Level Security) ────────────────────────────────
-- Cliente só enxerga placas dos próprios negócios (placas em estoque
-- têm business_id NULL → ficam invisíveis pro cliente, correto).
-- Toda escrita/admin/ativação roda no backend com SERVICE_KEY (bypassa RLS).
ALTER TABLE plates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plates_select_own" ON plates;
CREATE POLICY "plates_select_own" ON plates
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "plates_update_own" ON plates;
CREATE POLICY "plates_update_own" ON plates
  FOR UPDATE USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- production_batches: só backend (service key) acessa. RLS ligado sem policy
-- pública = ninguém via anon key. Admin usa service key.
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
