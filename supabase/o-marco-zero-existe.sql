-- ============================================================
-- "Dá pra dizer ao cliente quantas avaliações ele ganhou?" — 11/09/2026
-- ============================================================
-- O marco zero EXISTE: `businesses.total_reviews` é gravado pelo savebiz no
-- momento em que o negócio é vinculado à conta, e NADA no sistema atualiza
-- esse campo depois (varrido em api/ e src/). Com `created_at` ao lado, dá
-- pra dizer "eram N quando você entrou".
--
-- Antes de mostrar isso a 108 clientes, três coisas precisam ser conferidas.
-- É o que esta consulta faz:
--
--   BLOCO 1 — quantos têm o número guardado, e quantos não têm.
--             Quem não tem NÃO PODE ver o bloco. Melhor calar que errar.
--
--   BLOCO 2 — o histórico semanal (competitor_snapshots). O cron que alimenta
--             essa tabela está PAUSADO desde 21/06/2026. Aqui se vê até onde
--             ele chegou — é o que decide se o gráfico "está melhorando?"
--             tem dados ou nasce vazio.
--
--   BLOCO 3 — distância entre criar a conta e ativar o primeiro dispositivo.
--             É o que define a FRASE certa: quem ativou no mesmo dia (caminho
--             Mercado Livre) pode ler "desde que você instalou"; quem ativou
--             semanas depois só pode ler "desde que você criou a conta" —
--             senão a gente credita ao cartão avaliações que vieram antes dele.
--
-- Só lê, não escreve. Cole inteiro no SQL Editor do Supabase.
-- ============================================================

with primeira_ativacao as (
  select business_id, min(activated_at) as ativou_em
  from plates
  where business_id is not null and activated_at is not null
  group by 1
)

select
  '1. MARCO ZERO — o numero do dia do cadastro' as bloco,
  case
    when b.total_reviews is null then 'sem numero guardado — NAO mostrar o bloco'
    when b.total_reviews = 0     then 'guardado como zero — conferir caso a caso'
    else                              'tem numero — pode mostrar'
  end as linha,
  count(*) as quantidade,
  min(b.created_at)::date::text || '  ate  ' || max(b.created_at)::date::text as periodo
from businesses b
where b.place_id is not null
group by 2

union all

select
  '2. HISTORICO semanal (cron pausado em 21/06)',
  'linhas em competitor_snapshots',
  count(*),
  coalesce(min(snapshot_date)::text || '  ate  ' || max(snapshot_date)::text,
           'tabela vazia')
from competitor_snapshots

union all

select
  '3. Conta vs 1a ativacao — decide a FRASE',
  case
    when p.ativou_em is null                                    then 'nunca ativou dispositivo'
    when p.ativou_em - b.created_at < interval '2 days'         then 'ativou em ate 2 dias (pode dizer "desde que instalou")'
    when p.ativou_em - b.created_at < interval '30 days'        then 'ativou em ate 30 dias'
    else                                                             'ativou 30+ dias depois (so pode dizer "desde que criou a conta")'
  end,
  count(*),
  null
from businesses b
left join primeira_ativacao p on p.business_id = b.id
where b.place_id is not null
group by 2

order by 1, 3 desc;
