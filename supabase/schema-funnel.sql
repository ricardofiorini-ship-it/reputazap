-- ============================================================
-- StarTouch — Medição do funil do convidado (anônimo)
-- Rodar uma vez no SQL Editor do Supabase.
-- ============================================================
-- Registra os passos do funil do visitante sem cadastro pra medir onde ele
-- desiste. Anônimo: anon_id é um id aleatório do navegador (localStorage), não
-- identifica a pessoa. Escrito pelo POST /api/track (público, best-effort) e
-- pelo /api/register (signup_complete, server-side). Lido só pelo admin.
create table if not exists funnel_events (
  id uuid primary key default gen_random_uuid(),
  anon_id text,                 -- id aleatório do navegador (não é PII)
  step text not null,           -- guest_search_view | guest_search_submit | guest_panel_view | guest_signup_click | signup_complete
  meta jsonb default '{}',
  created_at timestamptz default now()
);
create index if not exists idx_funnel_events_step on funnel_events(step);
create index if not exists idx_funnel_events_created on funnel_events(created_at);

-- Acesso só pelo backend (SERVICE_KEY). Sem policies públicas.
alter table funnel_events enable row level security;
