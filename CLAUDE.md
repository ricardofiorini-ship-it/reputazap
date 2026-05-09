# ReputaZap

SaaS de gestão de reputação para negócios locais brasileiros.

## Stack

- **Front:** React + Vite
- **Back:** Vercel Serverless Functions (pasta `api/`)
- **Banco:** Supabase
- **APIs externas:** Google Places, Anthropic Claude
- **Deploy:** `git push origin main` (Vercel atualiza sozinho)

## Banco (Supabase)

Tabelas: `profiles`, `businesses` (com `UNIQUE user_id`), `feedbacks`.

## Endpoints (`api/`)

`register`, `login`, `forgot-password`, `reset-password`, `savebiz`, `mybiz`, `reviews` (aceita `?place_id=`), `searchbiz`, `bizinfo` (retorna `plan`), `feedback` (envia email via Resend se `RESEND_API_KEY` definida), `placeid`.

## Status atual

Fluxo end-to-end funcionando:
- **Onboarding:** cadastro → `savebiz` → dashboard.
- **Dashboard como vitrine:** 6 produtos (placa balcão, plaquinha mesa, placa parede, cartões NFC + QR Code próprio + link direto). Hardware com link Mercado Livre placeholder; QR e link são gerados pelo app. Cada card mostra inline o flow conforme o plano (Free → direto pro Google, Pro → peneira).
- **`avaliar.html`:** roteia por plano. Pro vê peneira (positivo→Google, negativo→form que envia email pro dono via Resend). Free vai direto pra step neutra de avaliação no Google. Anti-dupla avaliação por device (localStorage 30 dias) roda em ambos.

## Pendências

1. Hardware NFC: os 4 cards do dashboard apontam pro mesmo SKU Mercado Livre placeholder. Trocar por links específicos quando tiver SKU por produto.
2. Endpoint pra trocar plano Free↔Pro (hoje é manual no Supabase). Sem ele, não dá pra cliente real fazer upgrade pelo app.
3. `RESEND_API_KEY` precisa ser setada na Vercel pro envio de email da peneira Pro funcionar (sem ela, feedback é salvo no Supabase mas email é skipado com log).
4. Deploy backend no Railway (avaliar se ainda faz sentido com Vercel functions).

## Variáveis de ambiente (Vercel)

`PLACES_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` (opcional — sem ela, peneira Pro salva feedback mas não envia email).

## Links

- Repo: github.com/ricardofiorini-ship-it/reputazap
- Deploy: reputazap.vercel.app
