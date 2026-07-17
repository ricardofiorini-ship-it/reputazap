-- ============================================================
-- StarTouch — Portão de aprovação das dicas (rodar uma vez)
-- ============================================================
-- Guarda, por período (p0, p1, …), o estado da dica:
--   previewed_at  → quando a prévia foi enviada pro admin (1 dia antes)
--   approved_at   → quando o Ricardo clicou "Aprovar e disparar"
--   dispatched_at → quando foi enviada pra TODOS os clientes
-- O cron só dispara pros clientes se approved_at != null e dispatched_at null.
-- Escrita só via SERVICE_KEY (backend) — sem RLS pública.
-- ============================================================
CREATE TABLE IF NOT EXISTS tip_approvals (
  period        TEXT PRIMARY KEY,          -- "p0", "p1", …
  headline      TEXT,                       -- título da dica (referência humana)
  previewed_at  TIMESTAMPTZ,
  approved_at   TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tip_approvals ENABLE ROW LEVEL SECURITY;
-- Sem policies = ninguém acessa via anon/authenticated; só o backend (service key).

COMMENT ON TABLE tip_approvals IS
  'Portão de aprovação da dica por período. previewed→approved→dispatched.';
