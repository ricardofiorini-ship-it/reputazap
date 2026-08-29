-- ============================================================
-- StarTouch — Fase 0 do V3: Experiências (o manuscrito e a placa na porta)
-- Rodar UMA VEZ no Supabase: SQL Editor → New query → cola tudo → Run
-- ============================================================
-- POR QUÊ ESTE ARQUIVO EXISTE
--
-- Hoje o /r/CODE sabe uma resposta só: placa ativa → Google. Isto aqui é o
-- banco que permite ele PERGUNTAR ao negócio o que fazer, sem perder nada da
-- confiabilidade atual e sem que a cobrança encoste no trabalho do lojista.
--
-- A arquitetura tem DUAS CAMADAS com donos diferentes:
--
--   CAMADA 1 — PERMANENTE (`experiences.draft` / `experiences.published`)
--     O que o lojista escreveu. UM ÚNICO ESCRITOR: a ação "Publicar" dele.
--     Cobrança, cancelamento, fim de trial e cron NÃO escrevem aqui. Nunca.
--
--   CAMADA 2 — DESCARTÁVEL (`plates.served_*`)
--     O que o consumidor encontra AGORA. É impressa a partir da camada 1
--     somada ao plano vigente. Pode ser apagada inteira e reimpressa idêntica.
--
-- Cancelar o PRO troca a placa da porta; nunca toca no manuscrito. A prova
-- mecânica: zerar todos os campos served_* e mandar reconstruir devolve o mesmo
-- estado. O que se reconstrói sozinho não é original de nada.
--
-- O toque continua custando UMA leitura: o /r/CODE lê a linha da plate (que já
-- lê hoje) e obedece served_mode. Nenhuma consulta de assinatura no caminho do
-- consumidor — é por isso que a camada 2 existe.
--
-- DEPOIS DE RODAR ISTO, NADA MUDA PARA NINGUÉM:
--   • toda plate existente recebe served_mode='google_direto' (= hoje);
--   • o api/r/[code].js não lê nenhuma coluna nova ainda (isso é a Fase 2);
--   • as tabelas novas nascem vazias.
-- ============================================================


-- ============================================================
-- 1. TABELA: experiences — O MANUSCRITO (camada permanente)
-- ============================================================
-- Pendurada em business_id, NUNCA em user_id. Hoje é 1 negócio por conta
-- (businesses tem UNIQUE user_id), mas o dia em que multi-unidade entrar não
-- pode custar reescrita de tabela. Custo de acertar agora: zero.
CREATE TABLE IF NOT EXISTS experiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                    -- nome interno: "Menu da Mesa", "Cartão da Mariana"

  -- Endereço público estável: /m/<slug>. Leva sufixo aleatório de propósito —
  -- slug adivinhável ("cafe-central") permite montar por tentativa a lista de
  -- todos os nossos clientes. O menu é público; a nossa carteira não é.
  slug TEXT UNIQUE NOT NULL,

  -- ── O conteúdo. JSONB e não colunas porque a lista de tipos de botão vai
  -- crescer (cardápio, WhatsApp, promoção, pesquisa, lead) e tipo novo não
  -- pode custar ALTER TABLE. Formato: { version, mode, brand:{}, buttons:[] }.
  draft JSONB NOT NULL DEFAULT '{}'::jsonb,     -- o que ele está editando
  published JSONB,                              -- NULL = nunca publicou

  -- Espelho do `mode` de dentro do published. Existe só pra listar/filtrar sem
  -- abrir o JSON. Quem manda é o JSON; esta coluna é conveniência.
  published_mode TEXT,                          -- google_direto | menu

  draft_updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  published_by UUID,                            -- auth.users.id de quem publicou

  -- Arquivar em vez de apagar. Apagar quebraria dispositivos que apontam pra
  -- ela e destruiria o histórico de Resultados. Decisão aprovada em 29/08/2026.
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE experiences DROP CONSTRAINT IF EXISTS experiences_published_mode_check;
ALTER TABLE experiences ADD CONSTRAINT experiences_published_mode_check
  CHECK (published_mode IS NULL OR published_mode IN ('google_direto', 'menu'));

CREATE INDEX IF NOT EXISTS idx_experiences_business ON experiences(business_id);
-- Busca por slug é o caminho da página pública /m/<slug>: precisa ser rápida e
-- ignorar as arquivadas.
CREATE INDEX IF NOT EXISTS idx_experiences_slug_ativa ON experiences(slug) WHERE archived_at IS NULL;

COMMENT ON TABLE experiences IS
  'CAMADA PERMANENTE. draft/published são escritos SOMENTE pela ação do lojista. Nenhuma rotina de cobrança, cron ou downgrade escreve aqui.';
COMMENT ON COLUMN experiences.published IS
  'Escritor único: o botão Publicar. Se algum dia uma rotina automática precisar escrever nesta coluna, a arquitetura foi violada.';


-- ============================================================
-- 2. ALTER plates — A PLACA NA PORTA (camada descartável)
-- ============================================================
-- Reaproveita a tabela que já é confiável (ativação, contagem de toques, RLS,
-- retentativas no /r/CODE). O link avulso do §9 entra como linha AQUI, com
-- kind='link' e sem lote de produção, rodando pelo MESMO /r/CODE — zero código
-- novo no caminho quente. O nome "plates" fica impreciso; corrigimos na tela
-- (Dispositivo / Ponto de Contato), não no banco: a tabela é citada por seis
-- arquivos e pelas policies, e renomear é risco sem retorno.

-- Origem do ponto de contato. Toda linha existente vira 'hardware' sozinha.
ALTER TABLE plates ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'hardware';

-- Qual experiência este dispositivo usa. NULL = Google Direto (o padrão de
-- fábrica de todo dispositivo novo, conforme decidido).
ALTER TABLE plates ADD COLUMN IF NOT EXISTS experience_id UUID REFERENCES experiences(id) ON DELETE SET NULL;

-- ── Os campos impressos (derivados, descartáveis, reconstruíveis) ──
-- O DEFAULT é o que garante que rodar este arquivo não muda nada: toda plate
-- que existe hoje passa a dizer explicitamente o que ela já fazia.
ALTER TABLE plates ADD COLUMN IF NOT EXISTS served_mode TEXT NOT NULL DEFAULT 'google_direto';
ALTER TABLE plates ADD COLUMN IF NOT EXISTS served_slug TEXT;
ALTER TABLE plates ADD COLUMN IF NOT EXISTS served_reason TEXT NOT NULL DEFAULT 'padrao';
ALTER TABLE plates ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ;

ALTER TABLE plates DROP CONSTRAINT IF EXISTS plates_kind_check;
ALTER TABLE plates ADD CONSTRAINT plates_kind_check
  CHECK (kind IN ('hardware', 'link'));

ALTER TABLE plates DROP CONSTRAINT IF EXISTS plates_served_mode_check;
ALTER TABLE plates ADD CONSTRAINT plates_served_mode_check
  CHECK (served_mode IN ('google_direto', 'menu'));

-- ── O INTERRUPTOR (camada 1 — intenção do lojista) ──────────
-- Liga/desliga o Menu por DISPOSITIVO. Não é served_mode: served_* é derivado
-- e a varredura diária o reescreve. O interruptor é ENTRADA do cálculo, nunca
-- resultado dele — é o que impede um segundo mecanismo paralelo brigando pelo
-- mesmo campo.
--
-- DEFAULT false porque um padrão errado aqui falha ABERTO: bastaria um fluxo
-- futuro gravar experience_id sem tocar no interruptor pra um menu ir ao ar
-- sozinho, no aparelho de um cliente que já está no balcão. Com false, o mesmo
-- descuido resulta em "continua no Google e o painel avisa que está desligado":
-- barulhento, visível e resolvido num toque. A garantia mora no BANCO e não na
-- disciplina de quem escreve código depois — promessa de "o serviço sempre
-- define" só vale enquanto todo caminho futuro lembrar, e esquecer calado é o
-- modo de falha nº1 deste projeto.
ALTER TABLE plates ADD COLUMN IF NOT EXISTS experience_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN plates.experience_enabled IS
  'CAMADA 1 (intenção do lojista). Liga/desliga o Menu neste dispositivo. Nenhuma rotina de plano escreve aqui. Desligar não apaga nem altera a experiência.';

-- served_reason é o que faz o rebaixamento ser VISÍVEL em vez de silencioso.
-- Sem ele, cancelar o PRO viraria o modo de falha nº1 daqui: o menu some, o
-- dispositivo continua funcionando e ninguém entende o que houve.
--   padrao               → sem experiência: leva ao Google (comportamento de sempre)
--   publicado            → o lojista publicou e o plano permite
--   rebaixado_plano      → tem Menu publicado, PRO inativo. A config está intacta
--   experiencia_removida → a experiência foi arquivada pelo lojista
--   desligado            → o interruptor deste dispositivo está desligado.
--                          Nome neutro de propósito: cobre tanto "o dono
--                          desligou" quanto "ainda não foi ligado" (todo
--                          dispositivo nasce assim). Dizer "desligado pelo
--                          dono" atribuiria a ele uma ação que pode não ter
--                          havido — e o painel estaria mentindo sobre a causa.
ALTER TABLE plates DROP CONSTRAINT IF EXISTS plates_served_reason_check;
ALTER TABLE plates ADD CONSTRAINT plates_served_reason_check
  CHECK (served_reason IN ('padrao', 'publicado', 'rebaixado_plano', 'experiencia_removida', 'desligado'));

-- Índice pro reconciliador varrer só o que interessa (quem tem experiência).
CREATE INDEX IF NOT EXISTS idx_plates_experience ON plates(experience_id) WHERE experience_id IS NOT NULL;

COMMENT ON COLUMN plates.served_mode IS
  'CAMADA DESCARTÁVEL. Derivado de experiences.published + plano vigente. Pode ser zerado e reconstruído a qualquer momento.';
COMMENT ON COLUMN plates.served_reason IS
  'Por que este dispositivo serve o que serve. Existe pro painel explicar o rebaixamento ao gestor em vez de a config parecer perdida.';


-- ============================================================
-- 2b. FECHANDO O FURO QUE O PASSO 2 ABRIRIA
-- ============================================================
-- ⚠️ LEIA: a policy "plates_update_own" (criada em schema-plates.sql) permite
-- que o NAVEGADOR escreva na tabela plates com a chave pública (anon), desde
-- que a linha seja de um negócio do próprio usuário. Hoje isso é inofensivo —
-- dá pra renomear a própria placa. A partir do momento em que `served_mode`
-- mora nesta tabela, deixa de ser: um usuário Free conseguiria escrever
-- served_mode='menu' direto no banco e servir o Menu Inteligente sem pagar.
--
-- Fechamos revogando UPDATE de anon/authenticated. É seguro porque NENHUMA tela
-- fala com o Supabase diretamente — verificado: não existe cliente supabase em
-- src/. Toda escrita passa por api/*, com SERVICE_KEY, que ignora RLS e grants.
--
-- Em Postgres, privilégio de coluna NÃO restringe quem já tem UPDATE na tabela
-- inteira: por isso é REVOKE no todo, e não um REVOKE só das colunas novas.
REVOKE UPDATE ON plates FROM anon, authenticated;

-- A policy fica inerte (sem privilégio, ela não é alcançada). Não estou
-- removendo pra manter esta migração reversível com uma linha: se algum dia o
-- navegador precisar escrever, basta um GRANT UPDATE (coluna) específico.


-- ============================================================
-- 3. TABELA: experience_events — o log que vira a tela de Resultados
-- ============================================================
-- Irmão do plate_taps, mesma disciplina: NENHUM dado pessoal. Sem IP, sem
-- identificador de aparelho — a Política de Privacidade §4.1 declara que não
-- coletamos dado pessoal de quem encosta o celular, e isso continua valendo.
--
-- Nasce na Fase 0 e não na Fase 3 (Resultados) de propósito: o log precisa
-- estar gravando desde o primeiro menu no ar. Evento não gravado não volta —
-- é a lição do plate_taps, que só passou a existir no dia em que foi criado.
-- Criar agora custa nada; criar depois custa o passado.
CREATE TABLE IF NOT EXISTS experience_events (
  id BIGSERIAL PRIMARY KEY,

  experience_id UUID REFERENCES experiences(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,

  -- Vazios quando a abertura veio do link compartilhado (/m/<slug>) em vez de
  -- um dispositivo físico. É justamente o §7: o menu vive fora do NFC também.
  plate_id UUID REFERENCES plates(id) ON DELETE SET NULL,
  code TEXT,                             -- desnormalizado: o log sobrevive ao dispositivo

  -- open  = abriu o menu
  -- click = tocou num botão
  -- Os dois juntos respondem a leitura simples do §22: "527 pessoas abriram,
  -- dessas 183 foram pro Google, 142 abriram o cardápio…"
  kind TEXT NOT NULL,

  button_id TEXT,                        -- id do botão dentro do JSON da experiência
  action TEXT,                           -- google | link | whatsapp | instagram | promo | lead | survey | outro

  happened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contexto leve, idêntico ao plate_taps
  medium TEXT,                           -- nfc | qr | link | outro
  device TEXT,                           -- mobile | desktop
  referer_host TEXT
);

ALTER TABLE experience_events DROP CONSTRAINT IF EXISTS experience_events_kind_check;
ALTER TABLE experience_events ADD CONSTRAINT experience_events_kind_check
  CHECK (kind IN ('open', 'click'));

-- Índices desenhados nas duas perguntas reais da tela: "o que aconteceu neste
-- negócio no período X" e "o que aconteceu nesta experiência no período X".
CREATE INDEX IF NOT EXISTS idx_exp_events_biz_time ON experience_events(business_id, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_exp_events_exp_time ON experience_events(experience_id, happened_at DESC);

COMMENT ON TABLE experience_events IS
  'Log de aberturas e cliques nas experiências. Sem dado pessoal (mesma regra do plate_taps). Base da tela Resultados.';


-- ============================================================
-- 4. ALTER businesses — o trial de 14 dias
-- ============================================================
-- O plano PRO já vive em businesses.plan (escrito pelo webhook do Mercado
-- Pago). Falta só o trial. Quem decide o plano efetivo a partir daqui é UM
-- lugar só, no servidor: api/_lib/plan.js.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN businesses.trial_ends_at IS
  'Fim do teste de 14 dias. Vencimento é aplicado pela varredura diária, não em tempo real — verificação de plano não entra no caminho do toque.';


-- ============================================================
-- 5. SEGURANÇA — RLS + privilégios
-- ============================================================
-- O Supabase dá GRANT ALL pra anon e authenticated em TODA tabela criada no
-- schema public. Chave anônima é pública. Tabela criada sem isto nasce aberta
-- pra INSERT, UPDATE, DELETE e TRUNCATE de qualquer um — descoberto do jeito
-- caro em 22/08/2026. Duas travas, não uma:
--   RLS   → filtra QUAIS LINHAS o usuário enxerga
--   GRANT → filtra QUAIS OPERAÇÕES ele pode fazer
-- Escrita é exclusivamente do backend com SERVICE_KEY (que ignora as duas).

-- ── experiences ──
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON experiences FROM anon, authenticated;
GRANT SELECT ON experiences TO authenticated;

DROP POLICY IF EXISTS "experiences_select_own" ON experiences;
CREATE POLICY "experiences_select_own" ON experiences
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- ── experience_events ──
ALTER TABLE experience_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON experience_events FROM anon, authenticated;
GRANT SELECT ON experience_events TO authenticated;
-- Sem INSERT pra ninguém além do backend: com a chave pública, qualquer um
-- inventaria interação e sujaria a tela de Resultados do cliente.
REVOKE USAGE, SELECT ON SEQUENCE experience_events_id_seq FROM anon, authenticated;

DROP POLICY IF EXISTS "experience_events_select_own" ON experience_events;
CREATE POLICY "experience_events_select_own" ON experience_events
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );


-- ============================================================
-- 6. CONFERÊNCIA (rode e leia — deve dar tudo o que está descrito)
-- ============================================================
-- Nenhum dispositivo mudou de comportamento: todos devem sair 'google_direto'.
--   SELECT served_mode, served_reason, count(*) FROM plates GROUP BY 1,2;
--
-- As tabelas novas existem e estão vazias:
--   SELECT count(*) FROM experiences;
--   SELECT count(*) FROM experience_events;
--
-- RLS ligada nas duas:
--   SELECT relname, relrowsecurity FROM pg_class
--    WHERE relname IN ('experiences','experience_events','plates');
--
-- O navegador não escreve mais em plates (deve voltar VAZIO):
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--    WHERE table_name='plates' AND privilege_type='UPDATE'
--      AND grantee IN ('anon','authenticated');
-- ============================================================
