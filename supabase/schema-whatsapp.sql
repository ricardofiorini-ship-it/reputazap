-- ============================================================
-- Atendimento por WhatsApp (24/10/2026) — rodar UMA vez no Supabase.
-- ============================================================
-- Guarda as mensagens trocadas no (11) 97694-4026 pelo assistente
-- (api/whatsapp.js). Serve pra três coisas: dar contexto à próxima resposta,
-- não responder duas vezes a mesma mensagem (a Meta reenvia por até 36h) e
-- saber quando o Ricardo assumiu a conversa pelo app (o robô fica quieto).
--
-- Prazo: 6 meses (Política de Privacidade §9), apagado pelo cron de retenção.
-- RLS ligada e SEM policy: só o backend (service key) lê e escreve.
-- ============================================================
create table if not exists whatsapp_mensagens (
  id         bigserial primary key,
  wa_id      text not null,                -- número do cliente, só dígitos
  direcao    text not null check (direcao in ('entrada', 'saida', 'humano', 'escalado')),
  wamid      text unique,                  -- id da mensagem na Meta (dedupe)
  texto      text,
  criado_em  timestamptz not null default now()
);

create index if not exists whatsapp_mensagens_wa_id_idx on whatsapp_mensagens (wa_id, criado_em desc);
create index if not exists whatsapp_mensagens_criado_em_idx on whatsapp_mensagens (criado_em);

alter table whatsapp_mensagens enable row level security;
revoke all on whatsapp_mensagens from anon, authenticated;
