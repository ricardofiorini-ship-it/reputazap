-- ============================================================
-- Sonda: a tabela está vazia, ou a minha consulta está errada?
-- ============================================================
-- A consulta da manchete devolveu zero em TODAS as colunas. Zero sem controle
-- é indistinguível de consulta mal escrita — regra do projeto desde 22/08.
-- Estas três perguntas separam um caso do outro.

-- 1. Existe alguma linha?
select count(*) as linhas_no_cache,
       min(created_at) as mais_antiga,
       max(created_at) as mais_recente
from ranking_grid_cache;

-- 2. Se existe, qual é a FORMA do `result`? (chaves do primeiro nível)
--    Se não vier "competitors" aqui, a minha consulta procurava no lugar errado.
select jsonb_object_keys(result) as chave, count(*) as vezes
from ranking_grid_cache
group by 1
order by 2 desc;

-- 3. E dentro de `competitors`, como é um item?
--    Mostra o primeiro item cru de três linhas — é o que revela se os campos
--    se chamam `reviews`/`is_me` mesmo, ou outra coisa.
select place_id,
       term,
       jsonb_array_length(coalesce(result->'competitors', '[]'::jsonb)) as qtd_concorrentes,
       (result->'competitors'->0) as primeiro_item_cru
from ranking_grid_cache
order by created_at desc
limit 3;
