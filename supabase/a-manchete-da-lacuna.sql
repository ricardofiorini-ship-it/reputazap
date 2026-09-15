-- ============================================================
-- A manchete da lacuna: ela seria verdadeira e forte, ou murcha?
-- ============================================================
-- Ideia a testar (15/09/2026): trocar a manchete do painel do visitante de
-- "1,4º lugar" (posição média na grade) por "faltam N avaliações pra você
-- passar a [Concorrente]".
--
-- Antes de desenhar a tela, medir se a frase se sustenta na base real. Se o
-- concorrente à frente costuma ter 3 avaliações a mais, a manchete murcha e
-- a ideia morre aqui — que é mais barato do que morrer depois de pronta.
--
-- De onde sai o dado: `ranking_grid_cache.result->'ranking'`, o mesmo
-- array que o painel já desenha em forma de tabela. Cada item traz
-- `name`, `rating`, `reviews`, `points`, `avg` e `is_me`. Ou seja, NADA de dado
-- novo — a pergunta é só se o que já está na tela dá uma boa frase.
--
-- Uma linha por place_id: a medição mais recente. Um negócio pode ter vários
-- termos medidos; pegar todos contaria o mesmo negócio várias vezes.

with grade as (
  select distinct on (place_id) place_id, term, result, created_at
  from ranking_grid_cache
  order by place_id, created_at desc
),

itens as (
  select
    g.place_id,
    g.term,
    c->>'name'                              as nome,
    coalesce((c->>'is_me')::boolean, false) as sou_eu,
    nullif(c->>'reviews', '')::int          as reviews,
    nullif(c->>'rating', '')::numeric       as nota,
    nullif(c->>'points', '')::int           as pontos
  from grade g
  cross join lateral jsonb_array_elements(g.result->'ranking') c
),

eu as (
  select place_id, term, reviews as meus_reviews, nota as minha_nota, pontos as meus_pontos
  from itens
  where sou_eu and reviews is not null
),

-- O concorrente imediatamente à frente EM AVALIAÇÕES (não em posição):
-- o de menor total entre os que têm mais que eu. É o alvo alcançável, e é
-- a mesma regra que a meta do e-mail semanal já usa.
proximo as (
  select
    e.place_id, e.term, e.meus_reviews, e.minha_nota,
    r.nome        as rival,
    r.reviews     as reviews_rival,
    r.nota        as nota_rival,
    r.reviews - e.meus_reviews as faltam
  from eu e
  left join lateral (
    select i.nome, i.reviews, i.nota
    from itens i
    where i.place_id = e.place_id
      and i.term = e.term
      and not i.sou_eu
      and i.reviews is not null
      and i.reviews > e.meus_reviews
    order by i.reviews asc
    limit 1
  ) r on true
)

select
  count(*)                                                     as negocios_com_grade,
  count(*) filter (where rival is null)                        as sao_lideres_em_avaliacoes,
  count(*) filter (where rival is not null)                    as tem_alguem_a_frente,

  -- A força da manchete. Abaixo de ~10 a frase murcha ("faltam 3 avaliações"
  -- não move ninguém); acima de ~200 ela desanima em vez de motivar.
  count(*) filter (where faltam between 1 and 9)               as lacuna_1_a_9,
  count(*) filter (where faltam between 10 and 49)             as lacuna_10_a_49,
  count(*) filter (where faltam between 50 and 199)            as lacuna_50_a_199,
  count(*) filter (where faltam >= 200)                        as lacuna_200_ou_mais,

  round(percentile_cont(0.5) within group (order by faltam)::numeric, 0) as lacuna_mediana,

  -- A linha que fecha o argumento sozinha: nota melhor e mesmo assim atrás.
  -- Se isto for raro, o texto não pode depender dela.
  count(*) filter (where rival is not null and minha_nota > nota_rival)  as nota_melhor_e_atras
from proximo;

-- ══════════════════════════════════════════════════════════════
-- Segunda consulta: os 25 casos mais apertados, pra LER a frase.
-- Número agregado não diz se a manchete soa bem. Estes 25 dizem.
-- ══════════════════════════════════════════════════════════════

with grade as (
  select distinct on (place_id) place_id, term, result, created_at
  from ranking_grid_cache
  order by place_id, created_at desc
),

itens as (
  select
    g.place_id,
    g.term,
    c->>'name'                              as nome,
    coalesce((c->>'is_me')::boolean, false) as sou_eu,
    nullif(c->>'reviews', '')::int          as reviews,
    nullif(c->>'rating', '')::numeric       as nota,
    nullif(c->>'points', '')::int           as pontos
  from grade g
  cross join lateral jsonb_array_elements(g.result->'ranking') c
),

eu as (
  select place_id, term, reviews as meus_reviews, nota as minha_nota, pontos as meus_pontos
  from itens
  where sou_eu and reviews is not null
),

-- O concorrente imediatamente à frente EM AVALIAÇÕES (não em posição):
-- o de menor total entre os que têm mais que eu. É o alvo alcançável, e é
-- a mesma regra que a meta do e-mail semanal já usa.
proximo as (
  select
    e.place_id, e.term, e.meus_reviews, e.minha_nota,
    r.nome        as rival,
    r.reviews     as reviews_rival,
    r.nota        as nota_rival,
    r.reviews - e.meus_reviews as faltam
  from eu e
  left join lateral (
    select i.nome, i.reviews, i.nota
    from itens i
    where i.place_id = e.place_id
      and i.term = e.term
      and not i.sou_eu
      and i.reviews is not null
      and i.reviews > e.meus_reviews
    order by i.reviews asc
    limit 1
  ) r on true
)

select
  meus_reviews                                    as minhas_avaliacoes,
  faltam                                          as faltam,
  rival                                           as concorrente_a_frente,
  reviews_rival                                   as avaliacoes_dele,
  minha_nota,
  nota_rival,
  case when minha_nota > nota_rival then 'SIM' else '' end as tenho_nota_melhor,
  term                                            as termo_medido
from proximo
where rival is not null
order by faltam asc
limit 25;
