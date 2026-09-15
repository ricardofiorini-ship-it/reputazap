-- ============================================================
-- StarTouch — Estados do pedido (passo 1 de 5) | rodar UMA VEZ
-- ============================================================
-- POR QUE ISTO EXISTE
-- -------------------
-- Até 15/09/2026 o pedido conhecia dois estados: `pending` e `paid`. Só.
--
-- O primeiro revendedor (Lírios restaurante, R$ 855,38, pago em 4 minutos)
-- perguntou onde acompanhava o pedido dele. E a resposta honesta era: em lugar
-- nenhum — nem o admin tinha onde ver, porque das sete telas de /admin nenhuma
-- é de vendas.
--
-- Uma "área do revendedor" construída sobre dois estados mostraria "✅ Pago"
-- para sempre. O cliente entraria, não veria nada mudar em 10 dias úteis, e
-- ligaria do mesmo jeito — agora achando que o sistema está quebrado.
-- A área não é o trabalho; ter o que mostrar nela é.
--
-- O CICLO DE VIDA
-- ---------------
--   pending      pedido criado, pagamento não confirmado (inclui boleto emitido)
--   paid         dinheiro entrou (webhook do Stripe)
--   em_producao  saiu da fila e está sendo produzido
--   postado      despachado — exige código de rastreio
--   entregue     confirmado pelo cliente ou pela transportadora
--   cancelado    desistência, estorno, boleto vencido
--
-- `status` é TEXT, não enum, de propósito: acrescentar estado novo num enum
-- exige ALTER TYPE, que trava a tabela e não roda dentro de transação em
-- algumas versões. Com texto, a regra vive no código — onde ela pode ser
-- testada.
-- ============================================================

-- Momento de cada virada. Colunas separadas em vez de um jsonb de histórico:
-- a pergunta que se faz na prática é "quantos dias entre pagar e postar", e
-- isso é uma subtração, não uma varredura de array.
alter table orders add column if not exists production_started_at timestamptz;
alter table orders add column if not exists shipped_at            timestamptz;
alter table orders add column if not exists delivered_at          timestamptz;
alter table orders add column if not exists cancelled_at          timestamptz;

-- Rastreio. O nome da transportadora NÃO entra aqui: já está em
-- `shipping.frete.transportadora`, escolhido na cotação da Frenet. Duplicar
-- seria criar duas verdades sobre quem está com a caixa.
alter table orders add column if not exists tracking_code text;

-- Quem mexeu e quando. Sem isto, "o pedido voltou pra produção" é um mistério
-- de três pessoas apontando uma pra outra.
alter table orders add column if not exists status_updated_at timestamptz;
alter table orders add column if not exists status_updated_by text;

-- Anotação interna do admin (ex.: "cliente pediu pra segurar até dia 20").
-- NÃO aparece pro cliente em lugar nenhum.
alter table orders add column if not exists admin_note text;

-- A tela de pedidos lista por status e por data; a de revenda filtra por tipo,
-- que mora dentro do jsonb.
create index if not exists idx_orders_status_created on orders(status, created_at desc);
create index if not exists idx_orders_tipo on orders((shipping->>'tipo'));

-- ============================================================
-- RLS já está ligada em `orders` (schema-orders.sql) e continua sem policy:
-- ninguém entra pela chave anônima. Backend lê e escreve com SERVICE_KEY.
-- ============================================================

-- ============================================================
-- Conferência — rodar depois do ALTER
-- ============================================================
-- Tem que listar as 8 colunas novas. Se vier menos, algum ALTER não passou.
--
-- select column_name, data_type
-- from information_schema.columns
-- where table_name = 'orders'
--   and column_name in ('production_started_at','shipped_at','delivered_at',
--                       'cancelled_at','tracking_code','status_updated_at',
--                       'status_updated_by','admin_note')
-- order by column_name;
--
-- E o retrato de onde os pedidos estão hoje:
--
-- select status, count(*), sum(total_cents)/100.0 as reais
-- from orders group by status order by 2 desc;
