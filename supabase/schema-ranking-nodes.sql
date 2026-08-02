-- ============================================================
-- StarTouch — Malha compartilhada de medição (nós de grade)
-- Rodar UMA VEZ no SQL Editor do Supabase.
-- ============================================================
-- POR QUE ISTO EXISTE
-- Até aqui cada negócio media 5 pontos ao redor da PRÓPRIA PORTA, e o
-- resultado era guardado por (negócio, termo). Duas padarias na mesma quadra
-- faziam praticamente a mesma pergunta ao Google e pagávamos as duas vezes —
-- e cada consulta devolve 20 negócios dos quais aproveitávamos 1.
--
-- Aqui a medição passa a ser guardada por (PONTO DO MAPA, termo). Os pontos
-- vêm de uma malha fixa (~1 km), igual pra todo mundo. Assim:
--   · o 2º negócio de um bairro já medido custa ZERO;
--   · o custo cresce com a ÁREA coberta, não com o número de clientes;
--   · e some o viés de auto-centragem — ninguém joga em casa, porque os
--     pontos não são desenhados ao redor de ninguém.
--
-- Guardamos a LISTA CRUA que o Google devolveu no ponto (ordem + coordenadas).
-- O corte por distância e a agregação acontecem na leitura, então dá pra mudar
-- a regra de cálculo sem remedir nada.

create table if not exists ranking_node_cache (
  -- Índices inteiros da malha: lat = node_i * 0.009, lng = node_j * 0.009.
  -- Inteiro (e não o par lat/lng em float) de propósito: é a chave que faz dois
  -- negócios vizinhos caírem EXATAMENTE no mesmo registro. Com float, um
  -- arredondamento diferente criaria duas linhas e o compartilhamento morreria.
  node_i      integer not null,
  node_j      integer not null,
  term_norm   text    not null,   -- termo normalizado (sem acento, minúsculo)
  term        text,               -- termo como foi digitado (só pra depuração)
  lat         double precision,   -- coordenada do nó (derivável dos índices)
  lng         double precision,
  result      jsonb   not null,   -- { v, list:[{place_id,name,rating,reviews,lat,lng}] }
  created_at  timestamptz not null default now(),
  primary key (node_i, node_j, term_norm)
);

-- Varredura por validade (limpeza e diagnóstico de cobertura).
create index if not exists idx_ranking_node_cache_created on ranking_node_cache(created_at);
create index if not exists idx_ranking_node_cache_term    on ranking_node_cache(term_norm);

-- Só o backend escreve/lê (SERVICE_KEY). Sem policy pública: a lista crua traz
-- o mapa competitivo inteiro de uma região e não deve vazar pelo anon key.
alter table ranking_node_cache enable row level security;

-- ------------------------------------------------------------
-- Quanto da malha já está pago e fresco (rodar quando quiser):
--
--   select term_norm,
--          count(*)                                        as nos_medidos,
--          count(*) filter (where created_at > now() - interval '7 days') as frescos,
--          min(created_at)::date                           as mais_antigo
--   from ranking_node_cache
--   group by term_norm
--   order by nos_medidos desc;
--
-- Cada linha "fresca" é uma consulta ao Google que NÃO será repetida enquanto
-- valer. É a economia acontecendo, e dá pra ver crescer.
-- ------------------------------------------------------------
