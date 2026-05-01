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

`register`, `login`, `savebiz`, `mybiz`, `reviews` (aceita `?place_id=`), `searchbiz`, `bizinfo`, `feedback`, `placeid`.

## Status atual

Fluxo principal funcionando: cadastro → `savebiz` → dashboard mostra empresa real do usuário com reviews do Google.

## Pendências (foco em layout)

1. Cards do dashboard mostram só 5 reviews mas exibem como total — corrigir labels para refletir os números reais do Google.
2. Mobile sidebar quebrado, hambúrguer não aparece no celular.
3. `CustomerPage` em `App.jsx` ainda tem "Café Bello Vista" hardcoded.
4. Aba Google ainda mostra dados fake.
5. `place_id` real no botão "Avaliar no Google".
6. Gerar QR code.
7. Bloqueio anti-dupla avaliação por device.
8. Deploy backend no Railway.

## Variáveis de ambiente (Vercel)

`PLACES_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Links

- Repo: github.com/ricardofiorini-ship-it/reputazap
- Deploy: reputazap.vercel.app
