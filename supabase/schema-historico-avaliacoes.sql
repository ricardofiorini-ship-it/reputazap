-- ============================================================
-- StarTouch — Histórico semanal de avaliações
-- Rodar UMA VEZ no Supabase: SQL Editor → New query → cola tudo → Run
-- ============================================================
-- POR QUE EXISTE. `businesses.total_reviews` guarda o MARCO ZERO (quantas
-- avaliações o negócio tinha quando entrou) e o Google diz quantas ele tem
-- AGORA. Duas pontas, nenhum meio: não existe "como foi em agosto".
--
-- A tabela que teria esse meio é `competitor_snapshots`, e o cron que a
-- alimenta está PAUSADO desde 21/06/2026 — decisão registrada no topo de
-- api/cron/snapshot-competitors.js, tomada quando as features Pro foram
-- escondidas. Passado não volta; o que dá pra fazer é parar de perder o
-- presente.
--
-- O CUSTO É ZERO. O resumo semanal já pergunta ao Google a nota e o total de
-- CADA negócio toda segunda-feira — e joga fora depois de montar o e-mail.
-- Aqui ele passa a gravar. Nenhuma chamada nova, nenhum gasto novo. É o mesmo
-- truque que aposentou o robô diário de avaliações em agosto: pegar carona
-- num dado que já foi pago.
--
-- POR QUE TABELA PRÓPRIA e não reusar `competitor_snapshots`: aquela tabela
-- tem `competitors JSONB NOT NULL` e `my_rank`. Gravar linha sem concorrente
-- e sem posição faria as duas colunas mentirem, e quebraria quem as lê no dia
-- em que o cron pausado voltar. Tabela que guarda outra coisa é outra tabela.
--
-- NÃO É DADO PESSOAL: são os números públicos do perfil do negócio no Google
-- — os mesmos que já estão em `businesses.rating` e `businesses.total_reviews`
-- hoje, agora com data. Nenhuma categoria nova de dado é coletada.
-- ============================================================

CREATE TABLE IF NOT EXISTS review_history (
  id BIGSERIAL PRIMARY KEY,

  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Dia da medição. DATE e não TIMESTAMP de propósito: a pergunta é "como
  -- estava na semana tal", e o par (negócio, dia) é o que dá idempotência —
  -- re-rodar o cron no mesmo dia não duplica linha.
  on_date DATE NOT NULL,

  rating NUMERIC(2,1),
  reviews INT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (business_id, on_date)
);

-- A única pergunta real da tela: "a série deste negócio, do mais novo pro mais velho".
CREATE INDEX IF NOT EXISTS idx_review_history_biz_date
  ON review_history (business_id, on_date DESC);

-- ============================================================
-- RLS — obrigatória. O Supabase concede GRANT ALL pra `anon` em toda tabela
-- nova do schema public, e a chave anônima é pública: sem RLS esta tabela
-- nasce aberta pra INSERT, UPDATE e DELETE de qualquer um.
-- O cron escreve com SERVICE_KEY, que ignora RLS e não precisa de policy.
-- ============================================================
ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dono le o proprio historico" ON review_history;
CREATE POLICY "Dono le o proprio historico" ON review_history
  FOR SELECT
  USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

COMMENT ON TABLE review_history IS
  'Série semanal de nota e total de avaliações por negócio. Gravada pelo cron weekly-digest com dado que ele já busca. Sem dado pessoal.';
