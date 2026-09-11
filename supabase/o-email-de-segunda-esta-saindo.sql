-- ============================================================
-- "O resumo semanal está SAINDO mesmo?" — 11/09/2026
-- ============================================================
-- Agendado ≠ entregando. Esta consulta responde as duas coisas de uma vez:
--
--   BLOCO 1 — uma linha por segunda-feira, com quantos resumos saíram.
--   BLOCO 2 — CONTROLE POSITIVO. Todos os tipos de e-mail dos últimos 60 dias.
--   BLOCO 3 — CONTROLE. A tabela tem alguma linha?
--   BLOCO 4 — quantos DEVERIAM receber (negócios com place_id).
--
-- Por que os controles: o registro de envio (email_log) já é sabidamente
-- incompleto — o insert não confere o erro do banco, então falha de escrita é
-- muda. Sem controle, "zero resumos" é indistinguível de "o log parou de
-- gravar". Se o BLOCO 2 mostrar outros e-mails recentes e o BLOCO 1 estiver
-- vazio, aí sim o resumo não está saindo.
--
-- BLOCO 1 vs BLOCO 4 é a outra pergunta: se saíram 40 e deveriam ser 108,
-- o cron está morrendo no meio do caminho.
--
-- Cole inteiro no SQL Editor do Supabase e rode uma vez. Só lê, não escreve.
-- ============================================================

select
  '1. RESUMO SEMANAL — por segunda-feira'            as bloco,
  to_char(date_trunc('week', sent_at), 'DD/MM/YYYY') as linha,
  count(*)                                           as quantidade,
  max(sent_at)                                       as mais_recente
from email_log
where email_type = 'weekly_digest'
  and sent_at > now() - interval '10 weeks'
group by 2

union all

select
  '2. CONTROLE — todos os tipos (60 dias)',
  email_type,
  count(*),
  max(sent_at)
from email_log
where sent_at > now() - interval '60 days'
group by 2

union all

select
  '3. CONTROLE — a tabela tem linha?',
  'total em email_log, desde sempre',
  count(*),
  max(sent_at)
from email_log

union all

select
  '4. Quantos DEVERIAM receber',
  'negócios com place_id',
  count(*),
  null::timestamptz
from businesses
where place_id is not null

order by 1, 4 desc nulls last, 3 desc;
