# StarTouch

SaaS de gestão de reputação para negócios locais brasileiros.

## Stack

- **Front:** React + Vite
- **Back:** Vercel Serverless Functions (pasta `api/`)
- **Banco:** Supabase
- **APIs externas:** Google Places (notas/reviews/concorrentes), Stripe (pagamentos), Supabase (banco/auth), Resend (email)
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

**Pedidos:** rodar `supabase/schema-orders.sql` uma vez (tabela `orders`). O pedido de kit é salvo como `pending` ao criar o checkout (com os itens) e o webhook MP marca `paid` quando aprovado, disparando email pro admin (`ADMIN_NOTIFICATIONS_EMAIL`). Pagamento do Pacote IA também é registrado em `orders` + notifica. Idempotente (não reenvia email se o MP repetir o webhook).

## Endpoints (`api/`)

Vercel **Pro** (limite de funções já não é gargalo). Funções:
`register`, `login` (aceita `?action=google`/`id_token` pro login Google), `forgot-password`, `reset-password`, `savebiz`, `mybiz`, `reviews` (aceita `?place_id=`), `searchbiz`, `bizinfo` (retorna `plan` + `photoUrl`), `placeid`, `feedback` (GET lista pendentes / POST cria/atualiza, envia email via Resend), `billing` (Stripe — dispatcher por `?action=checkout|checkout-kit|portal|webhook`), `plates` (dispatcher por `?action=create-batch|list-batches|list-stock|activate|my-businesses|my-plates`), `r/[code]` (redirect universal de placa), `radar` (POST — IA Radar, ver seção abaixo).

Helpers em `api/_lib/` (prefixo `_` = não vira function): `plates.js` (geração de códigos), `radar/` (motores de IA, cache e score do IA Radar).

## Status atual

Fluxo end-to-end funcionando:
- **Onboarding:** cadastro → `savebiz` → dashboard.
- **Dashboard como vitrine:** 6 produtos (placa balcão, plaquinha mesa, placa parede, cartões NFC + QR Code próprio + link direto). Hardware com link Mercado Livre placeholder; QR e link são gerados pelo app.
- **`avaliar.html`:** ao abrir (toque/scan/link), redireciona **direto pro Google Meu Negócio** pra avaliar — igual pra todos, sem rotear por plano. Anti-dupla avaliação por device (localStorage 30 dias). **Peneira REMOVIDA em 2026-05-23** (commit `95b41d2`): não há mais desvio do insatisfeito pro privado. As telas da peneira (escolha positivo/negativo + form privado) seguem no HTML como código morto — nunca exibidas.

## Pendências

1. Hardware NFC: os 4 cards do dashboard apontam pro mesmo SKU Mercado Livre placeholder. Trocar por links específicos quando tiver SKU por produto.
2. `RESEND_API_KEY` precisa ser setada na Vercel pros emails transacionais (boas-vindas, dispositivo ativado, notificações admin) funcionarem (sem ela, o envio é skipado com log). Obs: não é mais usada pra peneira — ela foi removida.
3. Deploy backend no Railway (avaliar se ainda faz sentido com Vercel functions).
4. Setup Mercado Pago (ver seção abaixo) — provedor ativo.

## Setup Mercado Pago (provedor ativo)

**Por que MP e não Stripe?** Pivot 2026-05-30: Stripe BR exige ~3 dias de análise + KYC mais pesado. Cliente já tinha conta MP funcional. MP cobre PIX/cartão/boleto nativo, tem Checkout Pro hospedado (igual Stripe Checkout) e suporta assinatura via PreApproval. Código do Stripe ficou **preservado dormente** em `api/billing.js` (funções `handle*Stripe`) pra reativar trocando 4 linhas do dispatcher se um dia voltar.

**Setup:**
1. Rodar o SQL acima no Supabase (as colunas `stripe_*` são **reusadas** pra guardar IDs do MP — simplifica schema).
2. Em [developers.mercadopago.com](https://www.mercadopago.com.br/developers/panel/app) → criar aplicação. Em "Configuração avançada", marcar `read`, `offline access`, `write`. URL OAuth: deixar em branco (não usamos OAuth).
3. Copiar o **Access Token de produção** (formato `APP_USR-…`).
4. Em "Notificações" / "Webhooks" → cadastrar URL `https://startouch.com.br/api/billing?action=webhook` escutando eventos de `Assinaturas` e `Pagamentos`. Copiar a **chave secreta** (HMAC) que aparece — vai virar `MP_WEBHOOK_SECRET`.
5. Setar envs na Vercel:
   - `MP_ACCESS_TOKEN` (obrigatório) — Access Token de produção
   - `MP_WEBHOOK_SECRET` (opcional mas recomendado) — chave HMAC pra validar webhooks. Se ausente, validação é skipada com warning no log.
6. Deploy. Fluxo:
   - Cliente clica em "Desbloquear" no `/app` → vai pra `/plano-pro`
   - Clica "Assinar agora" → POST `/api/billing?action=checkout` cria PreApproval no MP → redirect pra Checkout Pro → após autorização, webhook em `/api/billing?action=webhook` atualiza `businesses.plan = 'pro'`
   - Pra kit: POST `/api/billing?action=checkout-kit` cria Preference → Checkout Pro → webhook loga pagamento (kit é manualmente despachado pelo admin via painel MP)
   - Cancelar assinatura: POST `/api/billing?action=portal` cancela via API MP (sem portal nativo como Stripe tem)

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

## IA Radar (diagnóstico de presença em IA)

Feature de **GEO/medição**: o usuário informa nome + categoria + cidade; o backend pergunta a 3 motores de IA com busca real (Gemini Flash, GPT-4o-mini, Perplexity Sonar) "qual a melhor {categoria} em {cidade}?" (6 perguntas/motor), mede em quantas respostas o negócio é citado e quais concorrentes aparecem, e devolve um **score 0-100** (taxa de menção) + concorrentes + diagnóstico em texto.

- **Página:** `/radar` (`public/radar.html`) — form → `fetch POST /api/radar` → score + barras de concorrentes + diagnóstico. Só mostra motores que rodaram.
- **Rota:** `api/radar.js`. Helpers em `api/_lib/radar/`: `engines.js` (3 motores + grounding + cache), `score.js` (perguntas, avaliação via Gemini com fallback heurístico, score), `cache.js` (radar_cache + radar_diagnostics).
- **SQL:** rodar `supabase/schema-radar.sql` uma vez (tabelas `radar_cache` e `radar_diagnostics`).
- **Custo controlado:** cache de 7 dias por `motor|categoria|cidade|hash(pergunta)` (perguntas genéricas → negócios da mesma categoria/cidade reaproveitam respostas), modelos baratos, rate limit 5/IP/hora. `maxDuration` 60s no `vercel.json`.
- **Transparência (regra de negócio):** só reporta motores que de fato rodaram; score é rotulado como taxa de menção, não ranking garantido. Falha de um motor não derruba o diagnóstico.
- **Env vars necessárias:** `GEMINI_API_KEY`, `OPENAI_API_KEY`, `PERPLEXITY_API_KEY` (reusa `SUPABASE_SERVICE_KEY`). Sem nenhuma chave, a rota responde 503; com pelo menos uma, roda só os motores disponíveis. **Avaliação usa Gemini** — sem `GEMINI_API_KEY` cai pro fallback heurístico (só conta menção textual, sem extrair concorrentes).

## Variáveis de ambiente (Vercel)

`PLACES_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` (opcional), `RESEND_FROM` (opcional — ex: `"StarTouch <feedback@startouch.com.br>"`; sem isso usa `onboarding@resend.dev`), **`MP_ACCESS_TOKEN`** (Mercado Pago — provedor ativo), `MP_WEBHOOK_SECRET` (opcional, validação HMAC do webhook MP), `ADMIN_NOTIFICATIONS_EMAIL` (email do admin pra receber aviso de **pedido pago** e **cliente novo**; sem ela, o aviso é pulado com log). **IA Radar:** `GEMINI_API_KEY`, `OPENAI_API_KEY`, `PERPLEXITY_API_KEY` (todas opcionais — a feature roda só os motores cuja chave existe; sem nenhuma, `/api/radar` responde 503). Stripe dormente: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` (não usadas atualmente, manter setadas só se planejar reativar Stripe).

## Links

- Repo: github.com/ricardofiorini-ship-it/reputazap
- Deploy (produção): www.startouch.com.br
- URL Vercel (projeto): reputazap.vercel.app (obs: `startouch.vercel.app` está inativo)
