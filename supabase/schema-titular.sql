-- ============================================================
-- StarTouch — Canal do titular (Art. 18 da LGPD)
-- Rodar UMA VEZ no Supabase: SQL Editor -> New query -> cola tudo -> Run
-- ============================================================
-- A Política promete os direitos do Art. 18. Direito sem porta de entrada é
-- promessa: esta tabela é a porta, e o prazo de 15 dias começa a correr da
-- solicitação — por isso `prazo_em` é calculado na gravação, não depois.
--
-- NÃO É EXPURGADA pela rotina de retenção, mesma família do retention_runs:
-- registro de atendimento a titular é a prova de que o direito foi atendido.
-- Guarda fundada no Art. 37 (registro das operações de tratamento).
-- ============================================================

CREATE TABLE IF NOT EXISTS titular_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo     TEXT UNIQUE NOT NULL,       -- ex: ST-2608-4F7K (o que o titular recebe)
  tipo          TEXT NOT NULL,              -- confirmacao|acesso|correcao|eliminacao|portabilidade|revogacao
  email         TEXT NOT NULL,
  nome          TEXT,
  mensagem      TEXT,

  -- Conferência interna: o e-mail informado bate com um usuário do sistema?
  -- NUNCA é devolvido a quem preenche o formulário — seria oráculo de
  -- enumeração. Serve pro admin saber se é cliente ou terceiro (ex: avaliador
  -- pedindo remoção do cache).
  identidade_confere BOOLEAN,

  status        TEXT NOT NULL DEFAULT 'aberto',   -- aberto | atendido | recusado
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prazo_em      TIMESTAMPTZ NOT NULL,             -- criado_em + 15 dias (Art. 18)
  atendido_em   TIMESTAMPTZ,
  resposta      TEXT,                             -- o que foi feito (preenchido pelo admin)

  -- Lembretes já disparados, pra não repetir a cada rodada do cron diário.
  aviso_d3_em   TIMESTAMPTZ,
  aviso_d0_em   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_titular_status ON titular_requests(status, prazo_em);
CREATE INDEX IF NOT EXISTS idx_titular_email ON titular_requests(email, criado_em DESC);

-- RLS LIGADA E SEM POLICY: nega tudo pras chaves anon/authenticated. Só o
-- backend (SERVICE_KEY) entra. Sem isso a tabela nasceria ABERTA — o Supabase
-- dá GRANT ALL pra anon em toda tabela do schema public (ver CLAUDE.md).
-- Aqui isso seria grave: a tabela guarda e-mail e texto livre de titulares.
ALTER TABLE titular_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE titular_requests IS
  'Solicitacoes do Art. 18 da LGPD. NAO e expurgada pela rotina de retencao - e a prova de atendimento (Art. 37). Escrita por api/titular.js; lembretes de prazo por api/cron/retention.js.';
