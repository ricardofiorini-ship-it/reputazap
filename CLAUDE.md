# StarTouch

SaaS de gestão de reputação para negócios locais brasileiros.

## Stack

- **Front:** React + Vite
- **Back:** Vercel Serverless Functions (pasta `api/`)
- **Banco:** Supabase
- **APIs externas:** Google Places, Anthropic Claude
- **Deploy:** `git push origin main` (Vercel atualiza sozinho)

## Banco (Supabase)

Tabelas: `profiles`, `businesses` (com `UNIQUE user_id`, colunas `plan`, `stripe_customer_id`, `stripe_subscription_id`), `feedbacks`.

SQL pra colunas Stripe (rodar uma vez):
```sql
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS reply_text TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS sender_name TEXT;
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_customer ON businesses(stripe_customer_id);
```

## Endpoints (`api/`)

Vercel **Pro** (limite de funções já não é gargalo). Funções:
`register`, `login` (aceita `?action=google`/`id_token` pro login Google), `forgot-password`, `reset-password`, `savebiz`, `mybiz`, `reviews` (aceita `?place_id=`), `searchbiz`, `bizinfo` (retorna `plan` + `photoUrl`), `placeid`, `feedback` (GET lista pendentes / POST cria/atualiza, envia email via Resend), `billing` (Stripe — dispatcher por `?action=checkout|checkout-kit|portal|webhook`), `plates` (dispatcher por `?action=create-batch|list-batches|list-stock|activate|my-businesses|my-plates`), `r/[code]` (redirect universal de placa).

Helpers em `api/_lib/` (prefixo `_` = não vira function): `plates.js` (geração de códigos).

## Status atual

Fluxo end-to-end funcionando:
- **Onboarding:** cadastro → `savebiz` → dashboard.
- **Dashboard como vitrine:** 6 produtos (placa balcão, plaquinha mesa, placa parede, cartões NFC + QR Code próprio + link direto). Hardware com link Mercado Livre placeholder; QR e link são gerados pelo app. Cada card mostra inline o flow conforme o plano (Free → direto pro Google, Pro → peneira).
- **`avaliar.html`:** roteia por plano. Pro vê peneira (positivo→Google, negativo→form que envia email pro dono via Resend). Free vai direto pra step neutra de avaliação no Google. Anti-dupla avaliação por device (localStorage 30 dias) roda em ambos.

## Pendências

1. Hardware NFC: os 4 cards do dashboard apontam pro mesmo SKU Mercado Livre placeholder. Trocar por links específicos quando tiver SKU por produto.
2. `RESEND_API_KEY` precisa ser setada na Vercel pro envio de email da peneira Pro funcionar (sem ela, feedback é salvo no Supabase mas email é skipado com log).
3. Deploy backend no Railway (avaliar se ainda faz sentido com Vercel functions).
4. Setup Stripe (ver seção abaixo).

## Setup Stripe

1. Rodar o SQL acima no Supabase pra adicionar `stripe_customer_id` e `stripe_subscription_id`.
2. Criar produto no Stripe Dashboard (Plano Pro, R$49/mês recorrente). Copiar o **Price ID** (começa com `price_…`).
3. Criar webhook em `https://startouch.vercel.app/api/billing?action=webhook` escutando `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Copiar o **Signing secret** (começa com `whsec_…`).
4. Setar envs no Vercel: `STRIPE_SECRET_KEY` (sk_live_…), `STRIPE_PRICE_ID` (price_…), `STRIPE_WEBHOOK_SECRET` (whsec_…).
5. Deploy. O fluxo: cliente clica em "Ativar Plano Pro" → POST `/api/billing?action=checkout` cria session com trial 14d → redirect → após pagamento, webhook em `/api/billing?action=webhook` atualiza `businesses.plan = 'pro'`.

## Sistema de Placas (códigos únicos pré-produzidos)

Modelo "TrustHero adapted" — **FLUXO ÚNICO de ativação independente de canal**. Toda placa (site, ML, loja, parceiro) segue o mesmo fluxo; o canal é só metadado (`source`). Não existe caminho de código por canal.

**Tabelas** (SQL em `supabase/schema-plates.sql`, rodar uma vez):
- `production_batches` — lotes de produção (nome, tipo, qtd, fornecedor, custo, status).
- `plates` — estoque. `code` único (`STAR-XXXXX`), `product_type` (`placa_balcao|placa_mesa|pulseira_nfc|adesivo_nfc`), `status` (`in_stock→assigned→sent→active→disabled`), `business_id` (vinculado só na ativação), `source` (metadado de canal), `total_taps`/`last_tapped_at`. RLS: cliente vê só placas dos próprios negócios; escrita/admin/ativação via SERVICE_KEY no backend. **Sem dependência de tabela `orders`** — vínculo placa↔negócio acontece na ativação pelo cliente, não na compra.

**Fluxo:** placa produzida em lote → `in_stock` → cliente recebe → toca/escaneia `/r/CODE` → `api/r/[code]` decide pelo status: inexistente/disabled→`/ativar-codigo?error=`; não-ativa→`/ativar-codigo?code=` (onboarding novo/existente); ativa→incrementa taps + redireciona `/avaliar?place_id=&plate=`.

**Telas:**
- `/admin/producao` (`admin-producao.html`) — cria lote, gera N códigos, exporta CSV (`codigo,product_type,batch_name,nfc_url,qr_url`) pra gráfica.
- `/admin/estoque` (`admin-estoque.html`) — resumo por tipo/status + lista filtrável.
- `/ativar-codigo` (`ativar-codigo.html`) — onboarding único: "sou novo" (cadastro+savebiz+activate) ou "já tenho conta" (login→escolhe negócio→activate).
- `/app/placas` (aba no `App.jsx`) — placas ativas do cliente + modal "ativar nova" + "comprar mais".

**Admin gating:** email hardcoded `ricardo.fiorini@gmail.com` em `api/plates.js` (evoluir pra `is_admin` depois).

**Produção física:** gráfica/fornecedor grava o NFC (chip NTAG213+, NDEF/URL) e imprime o QR a partir do CSV — ambos apontam pra mesma URL `/r/CODE`.

## Variáveis de ambiente (Vercel)

`PLACES_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` (opcional), `RESEND_FROM` (opcional — ex: `"StarTouch <feedback@startouch.com.br>"`; sem isso usa `onboarding@resend.dev`), `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`.

## Links

- Repo: github.com/ricardofiorini-ship-it/startouch
- Deploy: startouch.vercel.app
