-- ============================================================
-- TRYBO 001 — o banco do cartao de redes sociais, dentro da StarTouch
-- Rodar UMA VEZ no Supabase: SQL Editor -> New query -> cola tudo -> Run.
-- Idempotente: rodar de novo nao muda nada.
-- ============================================================
--
-- DEPOIS DE RODAR ISTO, NADA MUDA PARA NINGUEM.
--    - nenhum cartao da StarTouch troca de comportamento;
--    - nenhuma linha existente e alterada;
--    - as tabelas novas nascem vazias;
--    - nenhuma rota le as colunas novas ainda.
--
-- E uma migracao que SO ADICIONA. Nao ha DROP de tabela, nao ha ALTER de tipo
-- de coluna, nao ha UPDATE em linha existente. Os unicos DROP sao de dois
-- CHECK que voltam ALARGADOS (passam a aceitar MAIS valores, nunca menos) --
-- operacao que nao tem como reprovar dado que ja esta gravado.
--
-- ------------------------------------------------------------
-- TRADUCAO — o pacote da Trybo x o que existe aqui
-- ------------------------------------------------------------
-- O pacote (TRYBO-SPEC.md / trybo-001-schema.sql) foi escrito supondo banco
-- vazio. Aqui o banco tem 2.034 cartoes e clientes pagando. Quem ler a SPEC
-- depois traduz por esta tabela:
--
--   SPEC                  ->  AQUI                    por que
--   accounts              ->  businesses              ja e a conta do lojista
--   tags                  ->  plates                  "uma tabela de cartao so" (briefing 2.2)
--   batches               ->  production_batches      ja existe, com CSV pra grafica
--   taps                  ->  plate_taps              ja existe, com o habito da casa
--   redirects             ->  experience_events       ja existe e ja registra clique em botao
--   tag_destinations      ->  plate_destinations      nome segue a tabela que existe
--   account_entitlements  ->  business_entitlements   idem
--
-- ------------------------------------------------------------
-- TRES DIVERGENCIAS DELIBERADAS (22/09/2026)
-- ------------------------------------------------------------
-- 1. SEM TRAVA DE FORMATO NO CODIGO.
--    O pacote exige '^(TRY|STAR)-[...]{6}$'. Medido no banco: 424 dos 2.034
--    cartoes tem 5 caracteres (era anterior a 01/09/2026). A trava reprovaria
--    esses 424 e a migracao pararia no meio. Nenhuma rota valida formato hoje
--    (busca e trim + upper + match exato), entao as duas eras convivem -- que
--    e exatamente como a StarTouch ja opera desde sempre.
--
-- 2. UM DONO SO PRO DESTINO DO CARTAO.
--    O pacote traz `tags.mode` (choice/split/url/instagram/tiktok) E a tabela
--    tag_destinations. Sao dois mecanismos decidindo a mesma coisa: mexer num
--    nao muda nada e nao da erro nenhum -- o modo de falha mais caro daqui.
--    Fica so a tabela de destinos. O modo e DERIVADO da contagem:
--        1 destino  -> 302 direto        (o que mais converte)
--        2 destinos -> pagina de escolha
--    O `split` (sorteio ponderado 50/50) sai junto: e um teste A/B que ninguem
--    pediu e que impede o lojista de saber o que o proprio cartao faz.
--
-- 3. A TRAVA DE PLANO SAI DO CAMINHO DO TOQUE.
--    O pacote consulta 5 tabelas a CADA TOQUE (get_tag_config) pra decidir se
--    a conta pagou os R$ 49 -- no caminho onde a propria SPEC exige resposta
--    em menos de 200ms e funcionamento com o banco fora do ar.
--    A StarTouch ja resolveu isto ao contrario, em producao: a resposta e
--    calculada FORA do toque e gravada na linha do cartao (`served_*`), e o
--    toque le uma linha so. A Trybo entra como TERCEIRO VALOR do mesmo
--    mecanismo:
--        served_mode = google_direto | menu | social
--    com os destinos JA FILTRADOS por plano em `served_destinations`.
--    Um mecanismo, tres produtos.
-- ============================================================


-- ============================================================
-- 1. members — os atendentes
-- ============================================================
-- "Cada cadeira, um cartao." Quem tem os seguidores e o profissional, nao a
-- loja. Pendurado em business_id (a conta), nunca em user_id: o atendente
-- quase nunca tem login proprio -- `user_id` fica NULL e isso e o caso comum.
CREATE TABLE IF NOT EXISTS members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                 -- "Leo", "Cadeira 2"
  user_id     UUID,                          -- NULL = nao tem login proprio
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_business ON members(business_id);

COMMENT ON TABLE members IS
  'Atendentes da loja. Cada um pode ter o proprio cartao Trybo, com o proprio @.';


-- ============================================================
-- 2. destination_kinds — o catalogo, e quem e gratis
-- ============================================================
-- A regra do produto e uma frase: NUNCA se trava o que o cliente ve impresso
-- no cartao que segurou na mao. Os quatro logos da arte sao gratis pra sempre.
-- O resto e o desbloqueio unico de R$ 49.
CREATE TABLE IF NOT EXISTS destination_kinds (
  kind    TEXT PRIMARY KEY,
  label   TEXT NOT NULL,
  is_free BOOLEAN NOT NULL DEFAULT false,
  ordem   SMALLINT NOT NULL DEFAULT 100
);

-- ATENCAO: `whatsapp_canal` entra como PAGO, divergindo do pacote (que o
-- trazia gratis). Motivo: ele NAO esta impresso na arte, e a regra declarada
-- e "gratis e o que esta impresso". Se um dia o Canal do WhatsApp entrar na
-- arte, muda aqui -- e nao o contrario.
INSERT INTO destination_kinds (kind, label, is_free, ordem) VALUES
  ('instagram',      'Instagram',         true,   10),
  ('tiktok',         'TikTok',            true,   20),
  ('whatsapp',       'WhatsApp',          true,   30),
  ('youtube',        'YouTube',           true,   40),
  ('url',            'Link livre',        false,  50),
  ('whatsapp_canal', 'Canal do WhatsApp', false,  60),
  ('linkedin',       'LinkedIn',          false,  70),
  ('spotify',        'Spotify',           false,  80),
  ('kwai',           'Kwai',              false,  90),
  ('threads',        'Threads',           false, 100),
  ('facebook',       'Facebook',          false, 110),
  ('telegram',       'Telegram',          false, 120)
ON CONFLICT (kind) DO NOTHING;


-- ============================================================
-- 3. social_profiles — os perfis que a conta cadastrou
-- ============================================================
-- A conta cadastra QUANTOS QUISER aqui. O limite de dois e por CARTAO, nao
-- por conta (isso e a tabela 4).
--
-- Divergencia do pacote: la `platform` era um tipo fechado com dois valores
-- (instagram, tiktok) -- o que nao cabe as quatro redes gratis, nem o YouTube
-- da loja. Aqui aponta pro catalogo, que e onde a lista cresce sem ALTER.
CREATE TABLE IF NOT EXISTS social_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  member_id   UUID REFERENCES members(id) ON DELETE CASCADE,  -- NULL = perfil da loja
  kind        TEXT NOT NULL REFERENCES destination_kinds(kind),
  handle      TEXT,                          -- sem @
  url         TEXT NOT NULL CHECK (url ~* '^https?://'),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_profiles_business ON social_profiles(business_id);

-- Um perfil por rede por dono (loja ou atendente). COALESCE porque em Postgres
-- NULL nunca e igual a NULL -- sem isso a loja poderia cadastrar tres Instagram.
CREATE UNIQUE INDEX IF NOT EXISTS uq_social_profiles_dono
  ON social_profiles (business_id, COALESCE(member_id, '00000000-0000-0000-0000-000000000000'::uuid), kind);


-- ============================================================
-- 4. plate_destinations — pra onde CADA CARTAO leva
-- ============================================================
-- A regra que impede a pagina de toque virar link-in-bio mora AQUI, no banco:
-- `posicao in (1,2)`. Nao e disciplina de quem escreve a tela -- a tela pode
-- errar; o banco recusa. Motivo de produto: um botao converte mais que dois,
-- e dois convertem mais que tres. O cliente do lojista esta de pe no balcao
-- com dois segundos de atencao.
CREATE TABLE IF NOT EXISTS plate_destinations (
  plate_id   UUID NOT NULL REFERENCES plates(id) ON DELETE CASCADE,
  posicao    SMALLINT NOT NULL CHECK (posicao IN (1, 2)),
  kind       TEXT NOT NULL REFERENCES destination_kinds(kind),
  url        TEXT NOT NULL CHECK (url ~* '^https?://'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (plate_id, posicao)
);


-- ============================================================
-- 5. business_entitlements — os desbloqueios
-- ============================================================
-- Por que nao virou um valor novo em `businesses.plan`: aquela coluna tem um
-- CHECK que so aceita 'free' e 'pro' (conferido no banco em 22/09/2026), e
-- alarga-la misturaria a assinatura da StarTouch com uma compra unica da
-- Trybo -- duas coisas com ciclos de vida diferentes.
-- Serve aos tres produtos da casa. `expires_at` NULL = pra sempre.
CREATE TABLE IF NOT EXISTS business_entitlements (
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  feature     TEXT NOT NULL,                 -- destinos | equipe | relatorios | marca
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  source      TEXT,                          -- compra_unica | assinatura | cortesia
  PRIMARY KEY (business_id, feature)
);

CREATE OR REPLACE FUNCTION has_entitlement(p_business UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM business_entitlements e
     WHERE e.business_id = p_business
       AND e.feature = p_feature
       AND (e.expires_at IS NULL OR e.expires_at > NOW())
  );
$fn$;

-- Quem pergunta "esta conta pagou?" e o backend, nunca o navegador. Sem isto
-- um usuario logado poderia sondar o desbloqueio de qualquer conta.
REVOKE ALL ON FUNCTION has_entitlement(UUID, TEXT) FROM public, anon, authenticated;


-- ============================================================
-- 6. ALTER plates — o cartao ganha linha de produto, dono e destino servido
-- ============================================================

-- Qual produto da casa este cartao e. DEFAULT 'avaliacao' e o que garante que
-- rodar isto nao muda nada: os 2.034 cartoes existentes passam a dizer
-- explicitamente o que eles ja eram.
--
-- NAO reaproveitar a coluna `product_type` pra isto, apesar do pacote pedir.
-- Ela ja existe e mede OUTRA COISA: o formato fisico (placa_balcao, cartao_nfc,
-- pulseira_nfc, placa_mesa). Escrever 'avaliacao' ali destruiria a informacao
-- de qual peca e qual, e seis arquivos do codigo leem essa coluna.
ALTER TABLE plates ADD COLUMN IF NOT EXISTS linha TEXT NOT NULL DEFAULT 'avaliacao';

ALTER TABLE plates DROP CONSTRAINT IF EXISTS plates_linha_check;
ALTER TABLE plates ADD CONSTRAINT plates_linha_check
  CHECK (linha IN ('avaliacao', 'social', 'contato'));

-- De qual atendente e este cartao. NULL = cartao da loja.
ALTER TABLE plates ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;

-- Cartao perdido: bloqueia o antigo e aponta pro novo, que herda a config.
-- O historico fica com o antigo e o painel soma os dois.
ALTER TABLE plates ADD COLUMN IF NOT EXISTS replaced_by UUID REFERENCES plates(id) ON DELETE SET NULL;

-- -- O destino JA RESOLVIDO (camada descartavel) --
-- Formato: [{"posicao":1,"kind":"instagram","label":"Instagram","url":"https://..."}]
-- Ja filtrado por plano. Vazio = nada configurado ainda.
-- Escrito por `trybo_destinos_resolvidos` (secao 8) na hora em que o lojista
-- salva e pela varredura diaria. NUNCA lido pra decidir regra -- e resultado.
ALTER TABLE plates ADD COLUMN IF NOT EXISTS served_destinations JSONB NOT NULL DEFAULT '[]'::jsonb;

-- served_mode ganha o terceiro valor. Alargamento puro: nenhuma linha atual
-- deixa de passar.
ALTER TABLE plates DROP CONSTRAINT IF EXISTS plates_served_mode_check;
ALTER TABLE plates ADD CONSTRAINT plates_served_mode_check
  CHECK (served_mode IN ('google_direto', 'menu', 'social'));

CREATE INDEX IF NOT EXISTS idx_plates_linha ON plates(linha) WHERE linha <> 'avaliacao';
CREATE INDEX IF NOT EXISTS idx_plates_member ON plates(member_id) WHERE member_id IS NOT NULL;

COMMENT ON COLUMN plates.served_destinations IS
  'CAMADA DESCARTAVEL. Destinos ja filtrados por plano. Pode ser zerada e reconstruida identica por trybo_destinos_resolvidos(). Nao e fonte de verdade de nada.';


-- ============================================================
-- 7. ALTER plate_taps — o toque da Trybo precisa contar direito
-- ============================================================
-- Na StarTouch o toque e indicador. Na Trybo o toque E o produto medido, e
-- ainda decide um RANKING ENTRE FUNCIONARIOS -- o que cria um incentivo que
-- nao existia: encostar no proprio cartao a tarde toda.
--
-- ip_hash / ua_hash: HMAC-SHA256 com sal rotativo mensal, para (a) nao contar
-- a mesma pessoa duas vezes em 60s e (b) filtrar robo. NAO identificam ninguem
-- e NAO voltam ao IP original.
--
-- ELES SO PODEM COMECAR A SER ESCRITOS DEPOIS DA POLITICA DE PRIVACIDADE
-- REVISADA. A rota da StarTouch (/r/CODE) continua gravando NULL nas duas --
-- o 4.1 da Politica vigente diz que nao coletamos nada de quem encosta o
-- celular, e isso continua verdade enquanto a coluna estiver vazia.
ALTER TABLE plate_taps ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE plate_taps ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE plate_taps ADD COLUMN IF NOT EXISTS ip_hash TEXT;
ALTER TABLE plate_taps ADD COLUMN IF NOT EXISTS ua_hash TEXT;
ALTER TABLE plate_taps ADD COLUMN IF NOT EXISTS device_os TEXT;   -- ios | android | outro

CREATE INDEX IF NOT EXISTS idx_plate_taps_member ON plate_taps(member_id, tapped_at DESC) WHERE member_id IS NOT NULL;

COMMENT ON COLUMN plate_taps.ip_hash IS
  'HMAC-SHA256 com sal rotativo mensal. Existe para dedupe de 60s e filtro de robo. NAO preencher antes da revisao da Politica de Privacidade.';


-- ============================================================
-- 8. trybo_destinos_resolvidos — a UNICA dona da regra de plano
-- ============================================================
-- Chamada quando o lojista salva e pela varredura diaria. NUNCA no caminho do
-- toque. Existir uma funcao so evita o erro de a tela aplicar uma regra e o
-- cron aplicar outra.
--
-- A "rede de seguranca" do fim e o que cumpre a promessa "downgrade degrada,
-- nao quebra": se a filtragem por plano zerar os destinos (a conta perdeu o
-- desbloqueio e os dois destinos eram pagos), cai no primeiro perfil GRATIS
-- da conta. Cartao impresso, na mao de um cliente, nunca vira erro por causa
-- de cobranca.
CREATE OR REPLACE FUNCTION trybo_destinos_resolvidos(p_plate UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH cartao AS (
    SELECT id, business_id FROM plates WHERE id = p_plate
  ),
  permitidos AS (
    SELECT d.posicao, d.kind, k.label, d.url
      FROM cartao c
      JOIN plate_destinations d ON d.plate_id = c.id
      JOIN destination_kinds  k ON k.kind = d.kind
     WHERE k.is_free
        OR has_entitlement(c.business_id, 'destinos')
     ORDER BY d.posicao
     LIMIT 2
  ),
  rede_de_seguranca AS (
    SELECT 1::SMALLINT AS posicao, p.kind, k.label, p.url
      FROM cartao c
      JOIN social_profiles p ON p.business_id = c.business_id AND p.is_active
      JOIN destination_kinds k ON k.kind = p.kind AND k.is_free
     ORDER BY k.ordem
     LIMIT 1
  )
  SELECT COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
              'posicao', posicao, 'kind', kind, 'label', label, 'url', url
            ) ORDER BY posicao) FROM permitidos),
    (SELECT jsonb_agg(jsonb_build_object(
              'posicao', posicao, 'kind', kind, 'label', label, 'url', url
            )) FROM rede_de_seguranca),
    '[]'::jsonb
  );
$fn$;

-- So o backend (service role) chama. A pagina de toque nao chama nada disso.
REVOKE ALL ON FUNCTION trybo_destinos_resolvidos(UUID) FROM public, anon, authenticated;


-- ============================================================
-- 9. VIEWS — as tres perguntas do painel
-- ============================================================
-- security_invoker = true faz a view respeitar a RLS de quem consulta. Sem
-- isso a view rodaria com os privilegios de quem a criou e um cliente veria
-- o movimento dos outros.

-- Quantos toques e quantos encaminhamentos, por dia.
-- A taxa de encaminhamento (encaminhamentos / toques) e o numero que diz se a
-- pagina de escolha esta funcionando. Abaixo de 60%, o problema e a pagina.
CREATE OR REPLACE VIEW v_trybo_metricas_diarias
WITH (security_invoker = true) AS
WITH toques AS (
  SELECT p.business_id,
         t.tapped_at::date          AS dia,
         COUNT(*)                   AS toques,
         COUNT(DISTINCT t.plate_id) AS cartoes_tocados
    FROM plate_taps t
    JOIN plates p ON p.id = t.plate_id
   WHERE p.linha = 'social' AND t.is_bot = false
   GROUP BY 1, 2
),
encaminhamentos AS (
  SELECT e.business_id,
         e.happened_at::date AS dia,
         COUNT(*)            AS encaminhamentos
    FROM experience_events e
    JOIN plates p ON p.id = e.plate_id
   WHERE p.linha = 'social' AND e.kind = 'click'
   GROUP BY 1, 2
)
SELECT COALESCE(t.business_id, x.business_id) AS business_id,
       COALESCE(t.dia, x.dia)                 AS dia,
       COALESCE(t.toques, 0)                  AS toques,
       COALESCE(t.cartoes_tocados, 0)         AS cartoes_tocados,
       COALESCE(x.encaminhamentos, 0)         AS encaminhamentos
  FROM toques t
  FULL OUTER JOIN encaminhamentos x
    ON x.business_id = t.business_id AND x.dia = t.dia;

-- Ranking entre atendentes, ultimos 30 dias.
CREATE OR REPLACE VIEW v_trybo_ranking_equipe
WITH (security_invoker = true) AS
SELECT m.business_id,
       m.id   AS member_id,
       m.name,
       COUNT(t.id) AS toques_30d
  FROM members m
  LEFT JOIN plate_taps t
    ON t.member_id = m.id
   AND t.is_bot = false
   AND t.tapped_at >= NOW() - INTERVAL '30 days'
 WHERE m.is_active
 GROUP BY 1, 2, 3;

-- Cartao parado: ja teve movimento e sumiu. Cartao que NUNCA teve toque fica
-- de fora de proposito -- aquilo e outro problema (ninguem esta oferecendo), e
-- avisar "seu cartao parou" sobre um cartao que nunca andou soa errado.
CREATE OR REPLACE VIEW v_trybo_cartoes_parados
WITH (security_invoker = true) AS
SELECT p.business_id,
       p.id AS plate_id,
       p.code,
       p.channel_name,
       p.member_id,
       p.total_taps,
       p.last_tapped_at,
       (NOW()::date - p.last_tapped_at::date) AS dias_parado
  FROM plates p
 WHERE p.linha = 'social'
   AND p.status = 'active'
   AND p.total_taps > 0
   AND p.last_tapped_at < NOW() - INTERVAL '7 days';


-- ============================================================
-- 10. SEGURANCA — RLS + privilegios
-- ============================================================
-- O Supabase da GRANT ALL pra anon e authenticated em TODA tabela criada no
-- schema public. A chave anonima e publica. Tabela criada sem isto nasce
-- aberta pra INSERT, UPDATE, DELETE e TRUNCATE de qualquer um -- descoberto do
-- jeito caro em 22/08/2026. Sao DUAS travas, nao uma:
--   RLS   -> filtra QUAIS LINHAS o usuario enxerga
--   GRANT -> filtra QUAIS OPERACOES ele pode fazer
-- Toda escrita e do backend com SERVICE_KEY, que ignora as duas.

ALTER TABLE members               ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE plate_destinations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_kinds     ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON members               FROM anon, authenticated;
REVOKE ALL ON social_profiles       FROM anon, authenticated;
REVOKE ALL ON plate_destinations    FROM anon, authenticated;
REVOKE ALL ON business_entitlements FROM anon, authenticated;
REVOKE ALL ON destination_kinds     FROM anon, authenticated;

GRANT SELECT ON members               TO authenticated;
GRANT SELECT ON social_profiles       TO authenticated;
GRANT SELECT ON plate_destinations    TO authenticated;
GRANT SELECT ON business_entitlements TO authenticated;
GRANT SELECT ON destination_kinds     TO authenticated;

GRANT SELECT ON v_trybo_metricas_diarias TO authenticated;
GRANT SELECT ON v_trybo_ranking_equipe   TO authenticated;
GRANT SELECT ON v_trybo_cartoes_parados  TO authenticated;

-- O cliente enxerga so o que e dos proprios negocios. Mesma regra ja usada em
-- plates, plate_taps, experiences e experience_events.
DROP POLICY IF EXISTS "members_select_own" ON members;
CREATE POLICY "members_select_own" ON members
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "social_profiles_select_own" ON social_profiles;
CREATE POLICY "social_profiles_select_own" ON social_profiles
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "plate_destinations_select_own" ON plate_destinations;
CREATE POLICY "plate_destinations_select_own" ON plate_destinations
  FOR SELECT USING (
    plate_id IN (
      SELECT p.id FROM plates p
       WHERE p.business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "business_entitlements_select_own" ON business_entitlements;
CREATE POLICY "business_entitlements_select_own" ON business_entitlements
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- O catalogo de destinos e a unica coisa publica: e a lista de redes que a
-- tela de configuracao mostra. Nao tem dado de ninguem.
DROP POLICY IF EXISTS "destination_kinds_read_all" ON destination_kinds;
CREATE POLICY "destination_kinds_read_all" ON destination_kinds
  FOR SELECT USING (true);


-- ============================================================
-- 11. CONFERENCIA — rode e leia
-- ============================================================
-- (a) NENHUM cartao mudou de comportamento. Todos devem sair 'google_direto',
--     e `linha` deve dar 2.034 em 'avaliacao' e zero em 'social':
--       SELECT linha, served_mode, count(*) FROM plates GROUP BY 1,2;
--
-- (b) As tabelas novas existem e estao vazias (menos o catalogo, com 12):
--       SELECT 'members', count(*) FROM members
--       UNION ALL SELECT 'social_profiles', count(*) FROM social_profiles
--       UNION ALL SELECT 'plate_destinations', count(*) FROM plate_destinations
--       UNION ALL SELECT 'business_entitlements', count(*) FROM business_entitlements
--       UNION ALL SELECT 'destination_kinds', count(*) FROM destination_kinds;
--
-- (c) A protecao esta ligada nas cinco novas (deve dar 'true' em todas):
--       SELECT relname, relrowsecurity FROM pg_class
--        WHERE relname IN ('members','social_profiles','plate_destinations',
--                          'business_entitlements','destination_kinds');
--
-- (d) O navegador NAO escreve em nenhuma delas (deve voltar VAZIO):
--       SELECT table_name, grantee, privilege_type
--         FROM information_schema.role_table_grants
--        WHERE grantee IN ('anon','authenticated')
--          AND privilege_type IN ('INSERT','UPDATE','DELETE')
--          AND table_name IN ('members','social_profiles','plate_destinations',
--                             'business_entitlements','destination_kinds');
-- ============================================================
