# ReputaZap

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
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_customer ON businesses(stripe_customer_id);
```

## Endpoints (`api/`)

12 functions (limite Hobby Vercel): `register`, `login`, `forgot-password`, `reset-password`, `savebiz`, `mybiz`, `reviews` (aceita `?place_id=`), `searchbiz`, `bizinfo` (retorna `plan`), `placeid`, `feedback` (GET lista pendentes / POST cria/atualiza, envia email via Resend), `billing` (Stripe — dispatcher por `?action=checkout|portal|webhook`).

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
2. Criar produto no Stripe Dashboard (Modo Protegido, R$79/mês recorrente). Copiar o **Price ID** (começa com `price_…`).
3. Criar webhook em `https://reputazap.vercel.app/api/billing?action=webhook` escutando `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Copiar o **Signing secret** (começa com `whsec_…`).
4. Setar envs no Vercel: `STRIPE_SECRET_KEY` (sk_live_…), `STRIPE_PRICE_ID` (price_…), `STRIPE_WEBHOOK_SECRET` (whsec_…).
5. Deploy. O fluxo: cliente clica em "Proteger minha reputação" → POST `/api/billing?action=checkout` cria session com trial 14d → redirect → após pagamento, webhook em `/api/billing?action=webhook` atualiza `businesses.plan = 'pro'`.

## Variáveis de ambiente (Vercel)

`PLACES_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` (opcional), `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`.

## Links

- Repo: github.com/ricardofiorini-ship-it/reputazap
- Deploy: reputazap.vercel.app
