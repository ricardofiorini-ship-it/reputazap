-- ============================================================
-- StarTouch — RELATÓRIO DE ABANDONO DE DISPOSITIVO
-- Só leitura. Supabase → SQL Editor → cola UM BLOCO → Run.
-- ============================================================
-- Pergunta que este relatório responde:
--   "quantos clientes ativaram, usaram meia dúzia de vezes e largaram?"
--
-- A assinatura do abandono são TRÊS números juntos, nunca um só:
--   (a) quantos toques no total       → usou pouco?
--   (b) por quantos dias ele viveu    → morreu cedo?
--   (c) há quantos dias está parado   → já era, ou só esfriou?
-- Um dispositivo com 4 toques pode ser abandono OU ativação de
-- ontem. Só os três juntos separam os dois casos.
--
-- Fonte: plates.total_taps / activated_at / last_tapped_at.
-- Não depende de plate_taps (que pode nunca ter sido criada).
-- ============================================================


-- ╔══════════════════════════════════════════════════════════╗
-- ║ BLOCO 1 — DIAGNÓSTICO DE ABANDONO (cola só isto)         ║
-- ╚══════════════════════════════════════════════════════════╝
with a as (
  select
    p.id,
    coalesce(p.total_taps, 0)                                   as toques,
    (now()::date - p.activated_at::date)                        as dias_desde_ativacao,
    (p.last_tapped_at::date - p.activated_at::date)             as janela_de_vida,
    (now()::date - p.last_tapped_at::date)                      as dias_parado
  from plates p
  where p.status = 'active' and p.activated_at is not null
),
c as (
  select *,
    case
      -- nunca saiu do lugar
      when toques = 0                                then '1. NATIMORTO (ativou e nunca tocou)'
      -- ainda é cedo demais pra julgar: menos de 14 dias de vida
      when dias_desde_ativacao < 14                  then '2. RECÉM-ATIVADO (cedo pra julgar)'
      -- tocou pouco e sumiu: A SUA DESCONFIANÇA
      when toques <= 5 and dias_parado > 14          then '3. DESCARTADO CEDO (<=5 toques, largou)'
      -- pegou tração e depois morreu
      when dias_parado > 30                          then '4. ABANDONADO (usou de verdade e parou)'
      when dias_parado > 7                           then '5. ESFRIANDO (8-30 dias parado)'
      else                                                '6. VIVO (toque nos últimos 7 dias)'
    end as veredito
  from a
)
select
  veredito,
  count(*)                                        as dispositivos,
  round(100.0 * count(*) / sum(count(*)) over (), 1) as pct,
  round(avg(toques), 1)                           as media_toques,
  round(avg(janela_de_vida), 1)                   as media_dias_vivo,
  round(avg(dias_parado), 1)                      as media_dias_parado
from c
group by veredito
order by veredito;


-- ╔══════════════════════════════════════════════════════════╗
-- ║ BLOCO 2 — A CURVA: quantos toques cada um deu na vida    ║
-- ╚══════════════════════════════════════════════════════════╝
-- Se a maior parte da base estiver nas duas primeiras faixas,
-- o produto não entrou na rotina do balcão — virou enfeite.
-- Se houver uma minoria com 50+, o problema não é o produto:
-- é o que acontece (ou não acontece) na primeira semana.
select
  case
    when coalesce(total_taps,0) = 0        then 'a) 0 toques'
    when total_taps between 1 and 2        then 'b) 1-2 toques (testou e parou)'
    when total_taps between 3 and 5        then 'c) 3-5 toques'
    when total_taps between 6 and 20       then 'd) 6-20 toques'
    when total_taps between 21 and 50      then 'e) 21-50 toques'
    else                                        'f) 50+ toques (entrou na rotina)'
  end                                       as faixa,
  count(*)                                  as dispositivos,
  round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
from plates
where status = 'active'
group by faixa
order by faixa;


-- ╔══════════════════════════════════════════════════════════╗
-- ║ BLOCO 3 — VIDA ÚTIL: quanto tempo sobreviveu             ║
-- ╚══════════════════════════════════════════════════════════╝
-- "Sobrevivência" = por quantos dias o dispositivo continuou
-- sendo tocado depois de ativado, comparado com quanto tempo
-- ele existe. 100% = ainda vivo hoje. 5% = morreu na 1ª semana
-- de uma placa que já tem meses.
select
  case
    when coalesce(total_taps,0) = 0                     then 'a) nunca viveu'
    when (last_tapped_at::date - activated_at::date) = 0 then 'b) morreu no dia 1'
    when (last_tapped_at::date - activated_at::date) <= 7  then 'c) morreu na 1ª semana'
    when (last_tapped_at::date - activated_at::date) <= 30 then 'd) durou até 1 mês'
    when (last_tapped_at::date - activated_at::date) <= 90 then 'e) durou até 3 meses'
    else                                                     'f) 3+ meses de uso'
  end                                                    as sobrevivencia,
  count(*)                                               as dispositivos,
  round(avg(coalesce(total_taps,0)), 1)                  as media_toques
from plates
where status = 'active' and activated_at is not null
group by sobrevivencia
order by sobrevivencia;


-- ╔══════════════════════════════════════════════════════════╗
-- ║ BLOCO 4 — NOMES E SOBRENOMES (pra você ligar pra eles)   ║
-- ╚══════════════════════════════════════════════════════════╝
-- Uma linha por dispositivo ativo, do mais abandonado ao mais vivo.
-- Também é aqui que você reconhece as SUAS contas de teste — elas
-- inflam todos os blocos acima e precisam ser descontadas na leitura.
select
  u.email,
  b.name                                          as negocio,
  p.code,
  p.product_type,
  p.activated_at::date                            as ativou_em,
  coalesce(p.total_taps, 0)                       as toques,
  p.last_tapped_at::date                          as ultimo_toque,
  (now()::date - p.last_tapped_at::date)          as dias_parado,
  (p.last_tapped_at::date - p.activated_at::date) as dias_vivo,
  u.last_sign_in_at::date                         as ultimo_login_painel
from plates p
join businesses b on b.id = p.business_id
join auth.users u on u.id = b.user_id
where p.status = 'active'
order by (now()::date - p.last_tapped_at::date) desc nulls first,
         coalesce(p.total_taps, 0) asc;


-- ⚠️ ATENÇÃO (descoberto em 27/08/2026) — OS BLOCOS 5 E 6 NÃO SERVEM AINDA.
-- A tabela plate_taps foi criada em 15/08/2026 e o toque mais antigo nela é
-- desse mesmo dia. Não existe registro anterior. Consequência:
--   • O Bloco 5 parece uma curva de decaimento e NÃO É. Como todos os toques
--     cabem em 13 dias, "semana_de_vida" acabou medindo a IDADE DA PLACA no
--     momento do toque — um histograma de datas de ativação disfarçado de
--     série temporal. O zigue-zague (17→8→4→15) é agrupamento de ativação.
--   • O Bloco 6 é PIOR: ele conta como "não tocou" toda semana de vida
--     anterior a 15/08, quando na verdade ninguém estava gravando. Isso
--     fabrica um colapso de retenção que nunca aconteceu.
-- Os dois só passam a valer quando o log tiver ~3 meses (por volta de nov/2026),
-- e ainda assim contando semanas SÓ a partir de 15/08.
-- Enquanto isso, quem responde abandono são os BLOCOS 1 e 3, que usam
-- plates.total_taps / activated_at / last_tapped_at — o contador é de todos
-- os tempos e enxerga o que aconteceu antes do log existir.

-- ╔══════════════════════════════════════════════════════════╗
-- ║ BLOCO 5 — (opcional) A CURVA SEMANA A SEMANA             ║
-- ╚══════════════════════════════════════════════════════════╝
-- Isto é o abandono visto de VERDADE: toques por semana de vida
-- do dispositivo. Semana 1 alta e semana 4 no chão = novidade que
-- passou. Só funciona se a tabela plate_taps existir.
-- Se der erro "relation plate_taps does not exist", o histórico
-- com data nunca foi ligado — e ele não volta retroativamente.
select
  floor(extract(epoch from (t.tapped_at - p.activated_at)) / 604800)::int + 1 as semana_de_vida,
  count(*)                        as toques,
  count(distinct t.plate_id)      as dispositivos_ativos_na_semana
from plate_taps t
join plates p on p.id = t.plate_id
where p.activated_at is not null and t.tapped_at >= p.activated_at
group by semana_de_vida
having floor(extract(epoch from (t.tapped_at - p.activated_at)) / 604800)::int + 1 <= 12
order by semana_de_vida;


-- ╔══════════════════════════════════════════════════════════╗
-- ║ BLOCO 6 — RETENÇÃO DE VERDADE (corrige o Bloco 5)        ║
-- ╚══════════════════════════════════════════════════════════╝
-- O Bloco 5 estava errado: o denominador mudava a cada semana.
-- Uma placa ativada há 3 semanas NUNCA pode aparecer na semana 9,
-- então a queda no fim do gráfico pode ser só falta de idade —
-- não falta de uso.
--
-- Aqui cada semana só conta os dispositivos que REALMENTE
-- chegaram naquela idade. A pergunta vira: "dos que já viveram
-- N semanas, quantos ainda tocaram na semana N?"
-- Isso é retenção. O Bloco 5 era volume.
with d as (
  select id,
         floor(extract(epoch from (now() - activated_at)) / 604800)::int as semanas_completas
  from plates
  where status = 'active' and activated_at is not null
),
viveu as (  -- expande cada dispositivo nas semanas que ele de fato completou
  select d.id, s.semana
  from d, generate_series(1, d.semanas_completas) as s(semana)
),
tocou as (  -- semanas em que houve pelo menos 1 toque
  select p.id,
         floor(extract(epoch from (t.tapped_at - p.activated_at)) / 604800)::int + 1 as semana
  from plate_taps t
  join plates p on p.id = t.plate_id
  where p.activated_at is not null and t.tapped_at >= p.activated_at
  group by 1, 2
)
select
  v.semana                                                as semana_de_vida,
  count(*)                                                as chegaram_nesta_idade,
  count(t.id)                                             as ainda_tocaram,
  round(100.0 * count(t.id) / count(*), 1)                as pct_retencao
from viveu v
left join tocou t on t.id = v.id and t.semana = v.semana
group by v.semana
order by v.semana;


-- ╔══════════════════════════════════════════════════════════╗
-- ║ BLOCO 7 — QUEM CONCENTRA OS TOQUES                       ║
-- ╚══════════════════════════════════════════════════════════╝
-- Com base pequena, UM cliente movimentado (ou uma placa sua de
-- teste) domina qualquer média. Isto mostra quanto do total cada
-- dispositivo representa — e o acumulado. Se 2 aparelhos fazem
-- 70% dos toques, todo gráfico anterior é o retrato deles, não
-- da sua base.
select
  u.email,
  b.name                            as negocio,
  p.code,
  p.source,
  count(t.id)                       as toques,
  round(100.0 * count(t.id) / sum(count(t.id)) over (), 1)  as pct_do_total,
  round(100.0 * sum(count(t.id)) over (order by count(t.id) desc)
              / sum(count(t.id)) over (), 1)               as pct_acumulado,
  min(t.tapped_at)::date            as primeiro_toque,
  max(t.tapped_at)::date            as ultimo_toque
from plate_taps t
join plates p     on p.id = t.plate_id
left join businesses b on b.id = p.business_id
left join auth.users u on u.id = b.user_id
group by u.email, b.name, p.code, p.source
order by toques desc;


-- ╔══════════════════════════════════════════════════════════╗
-- ║ BLOCO 8 — QUANTO HISTÓRICO EXISTE ANTES DO LOG           ║
-- ╚══════════════════════════════════════════════════════════╝
-- plates.total_taps conta desde sempre; plate_taps só desde 15/08.
-- A diferença entre os dois é o histórico que existe mas não tem
-- data — e é justamente onde mora a resposta sobre abandono.
-- Se 'toques_sem_data' for grande, muita coisa aconteceu antes do
-- log e só os Blocos 1 e 3 conseguem enxergar.
select
  count(*)                                              as dispositivos_ativos,
  sum(coalesce(p.total_taps, 0))                        as toques_contador_total,
  sum(coalesce(l.n, 0))                                 as toques_com_data,
  sum(coalesce(p.total_taps, 0)) - sum(coalesce(l.n,0)) as toques_sem_data,
  min(p.activated_at)::date                             as ativacao_mais_antiga,
  min(t.primeiro)::date                                 as log_comeca_em
from plates p
left join (select plate_id, count(*) n from plate_taps group by 1) l on l.plate_id = p.id
cross join (select min(tapped_at) primeiro from plate_taps) t
where p.status = 'active';
