-- ============================================================
-- StarTouch — SCRIPT ÚNICO (22/08/2026)
-- Rodar UMA VEZ no Supabase: SQL Editor -> New query -> cola tudo -> Run
-- ============================================================
-- Junta dois pendentes numa visita só:
--   BLOCO 1 — histórico de toques nas placas (pendente desde 15/08/2026)
--   BLOCO 2 — log da rotina de expurgo (adequação à LGPD)
--
-- Idempotente: tudo é CREATE ... IF NOT EXISTS / ALTER ... IF NOT EXISTS /
-- DROP POLICY IF EXISTS. Rodar de novo não quebra e não apaga dado.
-- ============================================================


-- ============================================================
-- BLOCO 1 — HISTÓRICO DE TOQUES  (= supabase/schema-plate-taps.sql)
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


-- ============================================================
-- BLOCO 2 — LOG DA ROTINA DE EXPURGO
-- ============================================================
-- Por quê: a Política de Privacidade (§9) declara prazos de retenção. Prazo
-- declarado sem rotina que o cumpra é promessa que nenhum log comprova — e o
-- log de execução É a prova de cumprimento, não uma conveniência de debug.
--
-- Esta tabela NÃO é expurgada pela rotina que ela documenta. Log que vive onde
-- a rotina alcança se come: no mês 13 não haveria como provar o mês 1. A guarda
-- se sustenta sozinha no Art. 37 da LGPD (registro das operações de tratamento),
-- independente dos prazos das outras tabelas.
--
-- Sem PII: nome de tabela, prazo, contagem e duração. Nada de conteúdo.
-- ============================================================

CREATE TABLE IF NOT EXISTS retention_runs (
  id          BIGSERIAL PRIMARY KEY,
  ran_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tabela      TEXT NOT NULL,        -- alvo do expurgo
  prazo       TEXT NOT NULL,        -- '30 days' | '12 months' | '24 months'
  linhas      INTEGER NOT NULL,     -- quantas foram apagadas (0 é resultado válido)
  erro        TEXT,                 -- NULL = sucesso
  duracao_ms  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_retention_runs_ran ON retention_runs(ran_at DESC);

-- RLS LIGADA E SEM POLICY: nega tudo para as chaves anon/authenticated, que é
-- exatamente o que se quer aqui — só o backend (SERVICE_KEY, que atravessa RLS)
-- escreve e lê. Mesmo padrão de orders, places_cache e rate_limits.
-- Ligar a RLS não é zelo: sem ela a tabela nasce ABERTA, porque o Supabase dá
-- GRANT ALL para anon em toda tabela do schema public.
ALTER TABLE retention_runs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE retention_runs IS
  'Prova de cumprimento da politica de retencao. NAO e expurgada pela propria rotina - guarda fundada no Art. 37 da LGPD, independente dos prazos das outras tabelas. Escrita por api/cron/retention.js.';
