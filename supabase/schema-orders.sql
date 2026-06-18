-- ============================================================
-- StarTouch — Pedidos (kit NFC) | rodar uma vez no SQL Editor
-- ============================================================
-- O pedido é salvo no momento do checkout (status 'pending', com os
-- itens) e marcado 'paid' pelo webhook do Mercado Pago quando aprovado.
-- Acesso só pelo backend (SUPABASE_SERVICE_KEY).
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  external_reference text unique,        -- kit_<userId>_<timestamp>
  user_id text,
  email text,
  biz_name text,
  items jsonb default '[]',              -- [{id,name,qty,unit_price}]
  total_cents int,
  status text default 'pending',         -- pending | paid
  mp_payment_id text,
  created_at timestamptz default now(),
  paid_at timestamptz
);
create index if not exists idx_orders_created on orders(created_at);
create index if not exists idx_orders_status on orders(status);

alter table orders enable row level security;
