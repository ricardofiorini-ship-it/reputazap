-- StarTouch — cola TUDO isto de uma vez no Supabase e aperta Run.
-- Responde: quantos dispositivos estão vivos, quantos foram largados,
-- e quanto do histórico é antigo demais pra ter data.
with a as (
  select
    coalesce(p.total_taps, 0)                       as toques,
    (now()::date - p.activated_at::date)            as dias_desde_ativacao,
    (p.last_tapped_at::date - p.activated_at::date) as janela_de_vida,
    (now()::date - p.last_tapped_at::date)          as dias_parado
  from plates p
  where p.status = 'active' and p.activated_at is not null
),
c as (
  select *,
    case
      when toques = 0                       then '1. NUNCA FOI TOCADO'
      when dias_desde_ativacao < 14         then '2. RECEM-ATIVADO (cedo pra julgar)'
      when toques <= 5 and dias_parado > 14 then '3. DESCARTADO CEDO (usou pouco e largou)'
      when dias_parado > 30                 then '4. ABANDONADO (usou bem e parou)'
      when dias_parado > 7                  then '5. ESFRIANDO (8 a 30 dias parado)'
      else                                       '6. VIVO (tocou nos ultimos 7 dias)'
    end as grupo
  from a
),
h as (
  select
    sum(coalesce(p.total_taps,0))                      as contador,
    sum(coalesce(l.n,0))                               as com_data,
    min(p.activated_at)::date                          as ativacao_mais_antiga
  from plates p
  left join (select plate_id, count(*) n from plate_taps group by 1) l on l.plate_id = p.id
  where p.status = 'active'
)
select * from (

  select 1 as ord, 'A. SITUACAO DE CADA DISPOSITIVO' as secao,
         grupo as item, count(*)::numeric as dispositivos,
         'media ' || round(avg(toques),1) || ' toques, parado ha ' ||
         round(avg(dias_parado),0) || ' dias' as detalhe
    from c group by grupo

  union all
  select 2, 'B. QUANTO TEMPO SOBREVIVEU',
    case
      when toques = 0            then 'a) nunca viveu'
      when janela_de_vida = 0    then 'b) morreu no dia 1'
      when janela_de_vida <= 7   then 'c) morreu na 1a semana'
      when janela_de_vida <= 30  then 'd) durou ate 1 mes'
      when janela_de_vida <= 90  then 'e) durou ate 3 meses'
      else                            'f) 3+ meses de uso'
    end,
    count(*), 'media ' || round(avg(toques),1) || ' toques'
    from c group by 3

  union all
  select 3, 'C. HISTORICO', 'toques no contador (desde sempre)', contador, '' from h
  union all
  select 3, 'C. HISTORICO', 'desses, com data registrada',      com_data, '' from h
  union all
  select 3, 'C. HISTORICO', 'sem data (anteriores ao log)',     contador - com_data, '' from h
  union all
  select 3, 'C. HISTORICO', 'dias desde a ativacao mais antiga',
         (now()::date - ativacao_mais_antiga)::numeric,
         'ativada em ' || ativacao_mais_antiga from h

) x order by ord, item;
