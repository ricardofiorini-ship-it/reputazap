-- ============================================================
-- StarTouch — IA Radar (diagnóstico de presença em IA)
-- Rodar uma vez no SQL Editor do Supabase.
-- ============================================================

-- Cache de respostas dos motores de IA.
-- A chave é normalizada por motor|categoria|cidade|hash(pergunta), então
-- negócios diferentes da MESMA categoria/cidade reaproveitam as respostas
-- (perguntas são genéricas: "melhor barbearia em Sorocaba"), economizando token.
create table if not exists radar_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique not null,   -- normalizado: motor|categoria|cidade|hash_pergunta
  motor text not null,              -- 'gemini' | 'openai' | 'perplexity'
  pergunta text not null,
  resposta text not null,
  created_at timestamptz default now()
);
create index if not exists idx_radar_cache_key on radar_cache(cache_key);

-- Histórico de diagnósticos por negócio (pra mostrar evolução / antes-depois).
create table if not exists radar_diagnostics (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null,
  cidade text not null,
  score int not null,
  mencoes int not null,
  total int not null,
  concorrentes jsonb default '[]',
  detalhe jsonb default '{}',       -- resultado por motor (porMotor)
  created_at timestamptz default now()
);
create index if not exists idx_radar_diagnostics_created on radar_diagnostics(created_at);

-- Observação de RLS: ambas as tabelas são acessadas SOMENTE pelo backend
-- via SUPABASE_SERVICE_KEY (service role, ignora RLS). Não há acesso do client.
-- Por segurança, deixe RLS habilitado sem policies públicas:
alter table radar_cache enable row level security;
alter table radar_diagnostics enable row level security;
