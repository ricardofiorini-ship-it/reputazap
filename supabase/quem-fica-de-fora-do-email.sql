-- ============================================================
-- "Quem ficou de fora do resumo de 07/09?" — v2, 11/09/2026
-- ============================================================
-- A v1 desta consulta ESTAVA ERRADA e por um motivo conhecido: ela comparava
-- a lista de HOJE (108 negócios) com um envio de SEGUNDA (07/09). Negócio
-- cadastrado terça, quarta ou quinta aparecia como "não recebeu" — quando na
-- verdade nem existia na hora do envio. Numerador e denominador medindo
-- populações diferentes: o mesmo erro do funil, três dias depois.
--
-- Agora o corte é a data do cadastro. Três baldes:
--
--   A. RECEBEU
--   B. não existia ainda  → nada a fazer, recebe na próxima segunda
--   C. EXISTIA e não recebeu → ESTE é o problema de verdade
--
-- Pro balde C, a suspeita nº1 é o Google não ter devolvido dados daquele
-- place_id na hora (negócio fechado, ficha removida, place_id errado) — ou
-- o próprio freio de 120 chamadas/hora do nosso site, que o cron encosta
-- quando a base passa de ~120 negócios.
--
-- Só lê, não escreve. Cole inteiro no SQL Editor do Supabase.
-- ============================================================

with base as (
  select
    b.name                                   as negocio,
    b.created_at,
    exists (
      select 1 from email_log e
      where e.user_id    = b.user_id
        and e.email_type = 'weekly_digest'
        and e.metadata->>'week' = '2026-09-07'
    )                                        as recebeu
  from businesses b
  where b.place_id is not null
),
classificado as (
  select
    negocio,
    created_at,
    case
      when recebeu then 'A. RECEBEU'
      when created_at >= timestamptz '2026-09-07 12:00:00+00'
           then 'B. nao existia ainda — cadastrou depois de segunda'
      else 'C. EXISTIA e NAO recebeu — investigar'
    end as situacao
  from base
),
contagem as (
  select situacao, count(*) as quantos from classificado group by 1
)

select
  c.situacao,
  ct.quantos,
  c.negocio,
  to_char(c.created_at, 'DD/MM HH24:MI') as cadastrado_em
from classificado c
join contagem ct using (situacao)
where c.situacao <> 'A. RECEBEU'

union all

select situacao, quantos, '(nao listado — deu certo)', '—'
from contagem
where situacao = 'A. RECEBEU'

order by 1, 4;
