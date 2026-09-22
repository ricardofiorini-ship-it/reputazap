-- ============================================================
-- TRYBO — Passo 0: o que existe DE VERDADE no banco.
-- Cola TUDO isto de uma vez no Supabase (SQL Editor) e aperta Run.
-- Nao altera nada. So le e conta.
-- ============================================================
-- Responde cinco coisas antes de a gente escrever uma linha de codigo:
--   A. quais tabelas ja existem (e quais nomes do pacote Trybo colidem)
--   B. o que a tabela de cartoes tem hoje (quais ALTER ja rodaram)
--   C. o que a tabela de contas tem hoje
--   D. a protecao (RLS) esta ligada em cada uma
--   E. o formato dos codigos ja impressos -- a trava que reprovaria o schema
--   F. as travas da tabela de contas (o "um negocio por conta")
-- ============================================================
with alvo as (
  select unnest(array[
    -- o que a StarTouch tem hoje
    'businesses','profiles','plates','production_batches','plate_taps',
    'experiences','experience_events','orders','page_hits','retention_runs',
    -- o que o pacote da Trybo quer criar
    'accounts','tags','taps','batches','redirects','members',
    'social_profiles','destination_kinds','tag_destinations',
    'account_entitlements','follower_snapshots'
  ]) as nome
),
existe as (
  select a.nome,
         (select count(*) from information_schema.tables t
           where t.table_schema = 'public' and t.table_name = a.nome) > 0 as tem
    from alvo a
)
select * from (

  select 1 as ord, 'A. TABELAS' as secao, nome::text as item,
         case when tem then 'EXISTE' else 'nao existe' end::text as detalhe
    from existe

  union all
  select 2, 'B. COLUNAS DE plates', column_name::text, data_type::text
    from information_schema.columns
   where table_schema = 'public' and table_name = 'plates'

  union all
  select 3, 'C. COLUNAS DE businesses', column_name::text, data_type::text
    from information_schema.columns
   where table_schema = 'public' and table_name = 'businesses'

  union all
  select 4, 'D. PROTECAO (RLS) LIGADA?', c.relname::text,
         case when c.relrowsecurity then 'sim' else 'NAO -- tabela aberta' end::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and c.relname in (select nome from alvo)

  union all
  select 5, 'E. FORMATO DOS CODIGOS',
         (split_part(code, '-', 1) || '- com ' ||
          length(split_part(code, '-', 2)) || ' caracteres')::text,
         (count(*) || ' cartoes')::text
    from plates
   group by split_part(code, '-', 1), length(split_part(code, '-', 2))

  union all
  select 6, 'F. TRAVAS EM businesses', conname::text,
         pg_get_constraintdef(oid)::text
    from pg_constraint
   where conrelid = 'businesses'::regclass

) x order by ord, secao, item;
