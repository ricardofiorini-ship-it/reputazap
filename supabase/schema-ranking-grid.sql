-- ============================================================
-- StarTouch — Ranking por amostragem em grade (Passo 1)
-- Rodar uma vez no SQL Editor do Supabase. Aditivo e inofensivo: o código de
-- produção não lê nada disso enquanto RANKING_GRID_ENABLED estiver off.
-- ============================================================

-- Termos de busca escolhidos pelo dono (1–3). O ranking passa a ser POR TERMO.
-- Compat: `category_override`/keyword antigo continua sendo lido como fallback.
alter table businesses add column if not exists search_terms text[] default '{}';

-- Cache da grade por (place_id, termo). TTL de 7 dias checado na LEITURA
-- (mesmo padrão do radar_cache). Segura o custo do Places: 5 pontos × termo só
-- são queimados 1x por semana por negócio; revisitas do painel saem do cache.
create table if not exists ranking_grid_cache (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  term_norm text not null,      -- termo normalizado (minúsculo, sem acento)
  term text not null,           -- termo original (exibição)
  result jsonb not null,        -- { points:[{dir,rank,total,top}], avg, coverage, competitors, name, center }
  created_at timestamptz default now(),
  unique (place_id, term_norm)
);
create index if not exists idx_grid_cache_place on ranking_grid_cache(place_id);

-- Acesso só pelo backend (SERVICE_KEY). Sem policies públicas.
alter table ranking_grid_cache enable row level security;
