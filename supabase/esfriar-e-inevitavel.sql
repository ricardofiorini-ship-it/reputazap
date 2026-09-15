-- StarTouch — "esfriar é inevitável?" — cola tudo e aperta Run.
-- Cruza a IDADE do dispositivo com a SITUAÇÃO de hoje.
--
-- Como ler:
--   Se a coluna "% vivo" DESPENCA conforme a idade sobe → esfriar é
--   função do tempo. É onda de entusiasmo, e todo mundo esfria na vez.
--   Se "% vivo" ficar parecido em todas as idades → esfriar NÃO é
--   destino: uns clientes sustentam e outros não, e a diferença está
--   no que eles fazem, não em quanto tempo passou.
select
  case
    when (now()::date - activated_at::date) <= 30 then 'a) 0-30 dias de vida'
    when (now()::date - activated_at::date) <= 60 then 'b) 31-60 dias'
    else                                               'c) 61+ dias (os mais velhos)'
  end                                                        as idade,
  count(*)                                                   as dispositivos,
  count(*) filter (
    where last_tapped_at >= now() - interval '7 days')       as vivos,
  round(100.0 * count(*) filter (
    where last_tapped_at >= now() - interval '7 days')
    / count(*), 0)                                           as pct_vivo,
  round(avg(coalesce(total_taps, 0)), 1)                     as media_toques
from plates
where status = 'active' and activated_at is not null
group by idade
order by idade;
