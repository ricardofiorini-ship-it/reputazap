-- ============================================================
-- O histórico de visibilidade está gravando? (15/09/2026)
-- ============================================================
-- Rodar DEPOIS de schema-visibilidade-historico.sql.
--
-- Disparei duas medições novas em produção contra a ficha
-- "Brascatta Vila Leopoldina" (place_id ChIJ0aax3sD4zpQRJdfAUbrvYAo):
--
--   termo "pizzaria napolitana"  → não apareceu em nenhum dos 5 pontos
--   termo "pizza"                → posições 10, ausente, 16, 10, 5
--
-- Os números que DEVEM aparecer na consulta 2 estão calculados à mão abaixo.
-- Se baterem, a gravação está correta de ponta a ponta. Se a tabela estiver
-- vazia, a consulta 1 distingue "não gravou" de "consulta errada".

-- ══════════════════════════════════════════════════════════════
-- 1. CONTROLE: a tabela existe e tem alguma coisa?
-- ══════════════════════════════════════════════════════════════
-- Zero linhas aqui + erro de "relation does not exist" = o SQL não rodou.
-- Zero linhas SEM erro = a tabela existe e a gravação não está acontecendo.
-- São diagnósticos opostos, e sem esta consulta os dois pareceriam iguais.
select
  count(*)                          as linhas_no_historico,
  count(distinct place_id)          as negocios,
  count(distinct term)              as termos,
  min(scanned_at)                   as primeira,
  max(scanned_at)                   as ultima
from visibility_scans;

-- ══════════════════════════════════════════════════════════════
-- 2. A PROVA: as duas medições que eu disparei agora
-- ══════════════════════════════════════════════════════════════
-- ESPERADO (calculado antes de olhar, a partir das posições que a API devolveu):
--
--   termo "pizza"                → medidos 5 · nao_achou 1 · top3 0,00
--                                  top10 0,60 · top20 0,80
--                                  mediana 10 · media 10,3
--   termo "pizzaria napolitana"  → medidos 5 · nao_achou 5 · top3 0,00
--                                  top10 0,00 · top20 0,00
--                                  mediana null · media null
--
-- `grid_version` tem que ser 3 nas duas.
select
  term                                             as termo,
  scanned_at                                       as medido_em,
  grid_version                                     as versao_da_grade,
  spacing_m                                        as espacamento_m,
  (metrics->>'measured_points')::int                as pontos_medidos,
  (metrics->>'not_found_count')::int                as nao_achou,
  (metrics->>'top3_coverage')::numeric              as top3,
  (metrics->>'top10_coverage')::numeric             as top10,
  (metrics->>'top20_coverage')::numeric             as top20,
  (metrics->>'median_position_when_visible')::numeric  as mediana,
  (metrics->>'average_position_when_visible')::numeric as media,
  jsonb_array_length(coalesce(competitors, '[]'::jsonb)) as concorrentes_guardados
from visibility_scans
where place_id = 'ChIJ0aax3sD4zpQRJdfAUbrvYAo'
order by scanned_at desc;

-- ══════════════════════════════════════════════════════════════
-- 3. O confronto direto foi guardado junto?
-- ══════════════════════════════════════════════════════════════
-- Cada linha é um concorrente que ficou ACIMA do negócio em pelo menos um
-- ponto. `ficou_acima` nunca pode passar de `apareceu_junto` — se passar, a
-- conta está errada.
select
  s.term                                  as termo,
  c->>'name'                              as concorrente,
  (c->>'appearance_count')::int           as apareceu,
  (c->>'co_occurrences_with_client')::int as apareceu_junto,
  (c->>'times_above_client')::int         as ficou_acima,
  (c->>'head_to_head_win_rate')::numeric  as taxa
from visibility_scans s
cross join lateral jsonb_array_elements(coalesce(s.competitors, '[]'::jsonb)) c
where s.place_id = 'ChIJ0aax3sD4zpQRJdfAUbrvYAo'
order by s.scanned_at desc, (c->>'times_above_client')::int desc;

-- ══════════════════════════════════════════════════════════════
-- 4. Daqui pra frente: o histórico está crescendo sozinho?
-- ══════════════════════════════════════════════════════════════
-- Rodar daqui a alguns dias. Cada negócio deve ganhar ~1 linha por termo por
-- semana (o cache dura 7 dias, e só medição NOVA grava).
select
  date_trunc('day', scanned_at)::date as dia,
  count(*)                            as scans,
  count(distinct place_id)            as negocios
from visibility_scans
group by 1
order by 1 desc
limit 14;
