-- ============================================================
-- StarTouch — DE QUE ERA CADA LOTE, DE VERDADE?
-- Só leitura. Supabase → SQL Editor → cola TUDO → Run.
-- ============================================================
-- Por que existe: o "Cartão NFC" só virou opção na tela de
-- produção em 23/06/2026. Todo cartão produzido ANTES disso
-- teve que ser cadastrado com outro tipo (provavelmente
-- "Placa de Balcão"). Ou seja, plates.product_type não diz o
-- que a peça É — diz o que estava disponível no menu no dia.
--
-- Como usar: olhe a coluna `batch_name` (foi você que
-- escreveu) e a data. Para cada lote, me diga o que foi
-- produzido de verdade. Aí eu escrevo o UPDATE corrigindo
-- pelo batch_id — que é seguro, porque um lote é uma produção
-- só, de um produto só.
--
-- ⚠️ Se algum lote misturou produtos, me avise: esse não dá
-- pra corrigir em bloco e vai ter que ser código a código.
-- ============================================================

select
  b.created_at::date                                   as criado_em,
  b.batch_name                                         as nome_do_lote,
  b.product_type                                       as tipo_declarado,
  case when b.created_at < '2026-06-23' then '⚠️ ANTES DO CARTAO EXISTIR'
       else 'ok (cartao ja era opcao)' end             as suspeita,
  count(p.id)                                          as codigos_gerados,
  count(p.id) filter (where p.status = 'active')       as ativados,
  count(p.id) filter (where p.status = 'in_stock')     as em_estoque,
  coalesce(sum(p.total_taps), 0)                       as toques_do_lote,
  min(p.activated_at)::date                            as 1a_ativacao,
  max(p.activated_at)::date                            as ultima_ativacao
from production_batches b
left join plates p on p.batch_id = b.id
group by b.id, b.created_at, b.batch_name, b.product_type
order by b.created_at;

-- ── Códigos SEM lote (se houver, foram criados fora da tela) ──
-- Se este número for grande, parte do estoque não tem como ser
-- corrigida por lote e precisa de outro critério.
select
  'SEM LOTE (batch_id nulo)' as aviso,
  product_type               as tipo_declarado,
  count(*)                   as codigos,
  count(*) filter (where status = 'active') as ativados
from plates
where batch_id is null
group by product_type;
