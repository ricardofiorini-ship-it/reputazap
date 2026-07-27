-- ============================================================
-- StarTouch — Limite de uso (rate limit) dos endpoints públicos
-- Rodar UMA VEZ no SQL Editor do Supabase.
-- ============================================================
-- POR QUÊ: `/api/diagnostico`, `/api/searchbiz`, `/api/bizinfo`, `/api/reviews`
-- e `/api/radar` são abertos (sem login) e cada chamada gasta cota do Google
-- Places ou da IA. Desde 26/jul as cotas do Google são FINITAS (1.000/dia no
-- Places) — então um laço maluco ou um curioso com F5 não gera mais só fatura:
-- ele consome a cota e derruba o painel dos clientes que pagam.
--
-- POR QUE NO BANCO E NÃO EM MEMÓRIA: o rate limit do radar.js é um Map em
-- memória. A Vercel roda N instâncias em paralelo, cada uma com o seu Map —
-- o limite real vira N × o limite configurado. Contador no Postgres é
-- compartilhado por todas as instâncias e sobrevive a reinício.
-- ============================================================

create table if not exists rate_limits (
  bucket_key   text primary key,       -- ex: "ip:diagnostico:187.1.2.3" | "global:diagnostico"
  window_start timestamptz not null,
  hits         integer not null default 0
);

-- Acesso só pelo backend (SERVICE_KEY). Sem policies públicas.
alter table rate_limits enable row level security;

-- ------------------------------------------------------------
-- Incremento ATÔMICO da janela. Sem isso, duas requisições
-- simultâneas leem o mesmo contador e as duas passam (o clássico
-- read-then-write). Aqui o próprio Postgres resolve na linha.
-- Se a janela expirou, zera e começa outra.
-- ------------------------------------------------------------
create or replace function rl_hit(p_key text, p_window_ms integer)
returns integer
language plpgsql
as $$
declare
  v_now   timestamptz := now();
  v_limit timestamptz := now() - (p_window_ms || ' milliseconds')::interval;
  v_hits  integer;
begin
  insert into rate_limits (bucket_key, window_start, hits)
  values (p_key, v_now, 1)
  on conflict (bucket_key) do update
    set hits = case when rate_limits.window_start < v_limit then 1
                    else rate_limits.hits + 1 end,
        window_start = case when rate_limits.window_start < v_limit then v_now
                            else rate_limits.window_start end
  returning hits into v_hits;
  return v_hits;
end;
$$;

-- Limpeza opcional (nada depende do histórico):
--   delete from rate_limits where window_start < now() - interval '2 days';
