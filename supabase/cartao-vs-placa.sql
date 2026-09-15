-- ============================================================
-- StarTouch — CARTÃO vs PLACA: qual pega o cliente de verdade?
-- Só leitura. Supabase → SQL Editor → cola TUDO → Run.
-- ============================================================
-- Serve pra decidir se a placa sai de linha com base em dado,
-- e não só em intuição. Também gera o número que pode virar
-- argumento no anúncio do Mercado Livre.
--
-- ⚠️ ATENÇÃO — existem DOIS vieses opostos aqui. Ignorar
-- qualquer um dos dois leva à conclusão errada:
--
--   (1) "Média de toques por aparelho" é INJUSTA COM O CARTÃO.
--       Um negócio com 10 cartões divide os toques dele por 10;
--       a placa é uma só e concentra tudo. O cartão perde nessa
--       conta mesmo quando traz mais resultado. Por isso existe
--       o BLOCO C, que mede POR NEGÓCIO.
--
--   (2) "% vivo" é INJUSTA COM A PLACA. Os cartões chegaram
--       agora (venda no ML), então quase todos são novos — e
--       aparelho novo sempre parece vivo. Por isso existe o
--       BLOCO B, que só compara quem já tem 30+ dias de vida.
--
-- Leia os três. O BLOCO B e o BLOCO C são os que decidem.
-- E lembre: as suas contas de teste estão aqui dentro.
-- ============================================================

with base as (
  select
    p.product_type,
    p.business_id,
    coalesce(p.total_taps, 0)            as toques,
    p.last_tapped_at,
    (now()::date - p.activated_at::date) as idade
  from plates p
  where p.status = 'active' and p.activated_at is not null
)
select * from (

  -- ── A) RETRATO DE CADA TIPO (todos os ativados) ──────────
  select 1 as ord,
    'A. TODOS OS ATIVADOS'                                   as secao,
    product_type                                             as tipo,
    count(*)::numeric                                        as quantidade,
       round(100.0 * count(*) filter (where last_tapped_at >= now() - interval '7 days') / count(*))::text
    || '% vivo · '
    || round(100.0 * count(*) filter (where toques = 0) / count(*))::text
    || '% nunca tocado · mediana '
    || round(percentile_cont(0.5) within group (order by toques)::numeric, 1)::text
    || ' toques · media '
    || round(avg(toques), 1)::text
    || ' · idade media '
    || round(avg(idade))::text || ' dias'                    as detalhe
  from base
  group by product_type

  union all

  -- ── B) COMPARAÇÃO JUSTA: só quem já tem 30+ dias de vida ──
  -- Tira a vantagem artificial do cartão, que é recém-chegado.
  -- Tipo que não aparecer aqui é porque não tem nenhum aparelho
  -- com 30 dias — o que já é uma informação por si só.
  select 2,
    'B. SO OS COM 30+ DIAS (comparacao justa)',
    product_type,
    count(*)::numeric,
       round(100.0 * count(*) filter (where last_tapped_at >= now() - interval '7 days') / count(*))::text
    || '% vivo · '
    || round(100.0 * count(*) filter (where toques = 0) / count(*))::text
    || '% nunca tocado · mediana '
    || round(percentile_cont(0.5) within group (order by toques)::numeric, 1)::text
    || ' toques · media '
    || round(avg(toques), 1)::text
  from base
  where idade >= 30
  group by product_type

  union all

  -- ── C) POR NEGÓCIO (tira o viés da equipe) ────────────────
  -- Esta é a medida que não sofre NENHUM dos dois vieses:
  -- soma tudo o que o tipo de produto entregou pra cada cliente,
  -- independente de estar espalhado em 1 ou em 10 aparelhos.
  select 3,
    'C. POR NEGOCIO (tira o vies da equipe)',
    product_type,
    count(distinct business_id)::numeric,
       round(100.0 * count(distinct business_id) filter (where last_tapped_at >= now() - interval '7 days')
             / nullif(count(distinct business_id), 0))::text
    || '% dos negocios vivos · '
    || round(count(*)::numeric / nullif(count(distinct business_id), 0), 1)::text
    || ' aparelhos por negocio · '
    || round(sum(toques)::numeric / nullif(count(distinct business_id), 0), 1)::text
    || ' toques por negocio'
  from base
  where business_id is not null
  group by product_type

) x
order by ord, quantidade desc;
