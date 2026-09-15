-- ============================================================
-- StarTouch — Histórico de visibilidade (passo 8)
-- Rodar UMA VEZ no SQL Editor do Supabase.
-- ============================================================
-- POR QUE UMA TABELA NOVA, E NÃO O CACHE
-- --------------------------------------
-- `ranking_grid_cache` guarda UMA linha por (place_id, termo) e a sobrescreve a
-- cada medição. Ele responde "como você está agora". Não tem como responder
-- "melhorou ou piorou desde a semana passada" — a medição anterior já foi
-- apagada pela atual.
--
-- E a regra do projeto é explícita desde 22/08: log não pode viver onde a
-- rotina que ele documenta alcança. Guardar histórico dentro do cache é
-- garantir que, no dia em que o cache for limpo, a série histórica vá junto.
--
-- É uma tabela de SÉRIE TEMPORAL: só insere, nunca atualiza.
--
-- VALIDADA EM PRODUÇÃO NO DIA 15/09/2026. Duas medições disparadas de verdade
-- contra a ficha ChIJ0aax3sD4zpQRJdfAUbrvYAo, com os valores calculados à mão
-- ANTES de olhar o banco — e os sete bateram:
--
--   "pizza"  → posições 10, ausente, 16, 10, 5
--              medidos 5 · não achou 1 · top10 0,60 · top20 0,80
--              mediana 10 · média 10,3 · grid_version 3
--
-- A linha de "pizzaria napolitana" (ausente nos 5 pontos) fechou com
-- mediana e média `null` — a ausência ficou na coluna dela, e NÃO virou
-- "21ª posição" dentro da média. Era o ponto principal da mudança.
-- Consulta de conferência em supabase/confere-historico.sql.
-- ============================================================

create table if not exists visibility_scans (
  id           uuid primary key default gen_random_uuid(),
  place_id     text not null,
  term         text not null,

  -- GEOMETRIA DA MEDIÇÃO. Scan de grades diferentes NÃO SE COMPARA: mudar o
  -- espaçamento muda o número sem que nada tenha acontecido com o negócio
  -- (medido em 15/09: passar de 1 km para 450 m melhorou a posição em 12 de 12
  -- casos, por inflação). Sem este campo, um gráfico mostraria "melhora" no dia
  -- em que a gente mexesse na grade. Quem lê o histórico DEVE filtrar por ele.
  grid_version int not null default 3,
  spacing_m    int,
  radius_m     int,

  scanned_at   timestamptz not null default now(),

  -- O bloco `client` de api/_lib/visibilidade.js: top3/top10/top20_coverage,
  -- not_found_count, median/average_position_when_visible, measured_points.
  metrics      jsonb not null,

  -- Os principais concorrentes com o confronto direto (quantas vezes apareceu
  -- junto, quantas ficou acima). Guardado para responder "quem me passou desde
  -- o último scan", que é pergunta diferente de "como eu estou".
  competitors  jsonb
);

-- ============================================================
-- A REGRA DE LEITURA: place_id NÃO IDENTIFICA UMA SÉRIE
-- ============================================================
-- Uma série é `place_id + term + grid_version`. Os TRÊS, sempre. Quem ler só
-- por place_id vai comparar coisas diferentes e chamar isso de tendência.
--
--   ✅  where place_id = :p and term = :t and grid_version = :v
--       order by scanned_at desc
--
--   ❌  where place_id = :p order by scanned_at desc
--
-- POR QUE O MESMO NEGÓCIO TEM VÁRIOS TERMOS NO HISTÓRICO — e não é bug:
--
-- 1. O dono pode trocar a busca medida ("Trocar busca" no painel). A série
--    antiga continua válida para o termo antigo; não é a mesma coisa medida.
--
-- 2. A SEGUNDA TENTATIVA (api/diagnostico.js:262). Quando o termo automático
--    não acha o negócio em nenhum ponto, o sistema remede com um termo reserva
--    antes de dar a má notícia. Essa medição é real, custou 5 chamadas ao
--    Places, e grava — mesmo quando o resultado é descartado e a tela continua
--    mostrando o termo original.
--
--    Observado em 15/09, na ficha ChIJ0aax3sD4zpQRJdfAUbrvYAo: a medição de
--    "restaurante" não achou o negócio, o sistema tentou "bar", também não
--    achou, e manteve "restaurante" na tela. O histórico ficou com as duas.
--    É informação boa (sabemos que os dois termos falharam) e é exatamente o
--    tipo de linha que arruína um gráfico lido sem filtro de termo.
--
-- 3. O mesmo negócio pode ter até 3 termos medidos de propósito.
--
-- O índice abaixo está nesta ordem para que o caminho certo seja também o mais
-- rápido — a consulta errada não ganha nada por ser errada.
create index if not exists idx_visibility_scans_serie
  on visibility_scans (place_id, term, grid_version, scanned_at desc);

-- Para o expurgo por idade (ver nota de retenção no fim).
create index if not exists idx_visibility_scans_data
  on visibility_scans (scanned_at);

-- ============================================================
-- RLS — OBRIGATÓRIA, e não é boa prática: é a única defesa.
-- ============================================================
-- O Supabase concede GRANT ALL para `anon` e `authenticated` em TODA tabela
-- criada no schema public. A chave anônima é pública e viaja no navegador de
-- qualquer visitante. Sem RLS esta tabela nasce com INSERT, UPDATE, DELETE e
-- TRUNCATE liberados para o mundo.
--
-- Descoberto do jeito caro em 22/08/2026: a policy "Service can insert
-- feedbacks" (INSERT, roles={public}, with_check=true) deixava qualquer um
-- gravar na tabela `feedbacks` direto pela chave anônima. O nome enganava —
-- `service_role` IGNORA RLS por definição e nunca precisou de policy.
--
-- Aqui: nenhuma policy. Ninguém entra pela chave anônima. O backend escreve e
-- lê com SUPABASE_SERVICE_KEY, que passa por cima da RLS.
alter table visibility_scans enable row level security;

-- ============================================================
-- RETENÇÃO — decidir ANTES de ligar a escrita
-- ============================================================
-- A Política de Privacidade vige desde 22/08/2026 e a tabela `retention_runs` é
-- a prova de que ela é cumprida. Toda tabela que acumula dado precisa de prazo,
-- e o prazo precisa estar no texto publicado.
--
-- O que esta tabela guarda: `place_id` (identificador público de ficha do
-- Google), o termo de busca e números de visibilidade — tudo derivado de
-- informação pública. Não há dado de pessoa natural. Mas a ficha de um MEI PODE
-- ser o nome de uma pessoa, então o caminho conservador é declarar o prazo.
--
-- PROPOSTA (aguardando decisão): 24 meses. Dois anos permitem comparação
-- ano-contra-ano, que é o que dá sentido ao histórico; mais do que isso não
-- serve a nenhuma pergunta que a gente saiba responder.
--
-- Quando decidido, o expurgo entra em api/cron/retention.js junto com os
-- outros e GRAVA EM `retention_runs` — senão não há prova de cumprimento, e
-- silêncio parece sucesso.
--
-- delete from visibility_scans where scanned_at < now() - interval '24 months';
