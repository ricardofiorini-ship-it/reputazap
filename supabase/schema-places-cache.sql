-- ============================================================
-- StarTouch — Cache curto de respostas do Google Places
-- Rodar UMA VEZ no SQL Editor do Supabase.
-- ============================================================
-- POR QUÊ: cada abertura de painel/diagnóstico disparava um leque de chamadas
-- ao Places SEM cache nenhum (bizinfo, reviews, lentes). Em julho/2026 isso
-- virou dinheiro: a cota gratuita do SKU "Places Details" acabou no dia 20 e
-- cada chamada passou a custar ~R$0,095 (+R$0,029 quando pede reviews).
-- Nota, endereço, telefone e posição de ranking não mudam de hora em hora —
-- guardar por algumas horas não muda nada pro cliente e corta o custo de
-- revisita (o caso mais comum: F5, trocar de aba, voltar depois).
--
-- Genérico de propósito: uma linha por (chave, payload). A chave carrega o
-- "quem" (bizinfo/reviews/lenses), a versão do formato e os parâmetros.
-- O TTL é decidido por quem LÊ (cada chamador escolhe o seu), não pela tabela.
-- Mesmo padrão já usado em ranking_grid_cache e radar_cache.
-- ============================================================

create table if not exists places_cache (
  cache_key   text primary key,   -- ex: "bizinfo:v1:ChIJ...", "lenses:v1:ChIJ...|padaria|05061100"
  payload     jsonb not null,     -- resposta crua já normalizada pelo chamador
  created_at  timestamptz not null default now()
);

-- Varredura de entradas velhas (limpeza opcional; o TTL é checado na leitura).
create index if not exists idx_places_cache_created on places_cache(created_at);

-- Acesso só pelo backend (SERVICE_KEY). Sem policies públicas.
alter table places_cache enable row level security;

-- Limpeza manual, se algum dia a tabela incomodar (nada depende dela):
--   delete from places_cache where created_at < now() - interval '2 days';
