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

**Pedidos:** rodar `supabase/schema-orders.sql` uma vez (tabela `orders`; inclui coluna `shipping jsonb` via ALTER idempotente). O pedido de kit é salvo como `pending` ao criar o checkout (com os itens) e o webhook MP marca `paid` quando aprovado, disparando email pro admin (`ADMIN_NOTIFICATIONS_EMAIL`). Pagamento do Pacote IA também é registrado em `orders` + notifica. Idempotente (não reenvia email se o MP repetir o webhook).

**Compra guest (sem login) — direto da landing.** Visitante compra sem criar conta; a conta nasce depois, na ativação da placa recebida. Fluxo: vitrine `#produtos` da `landing.html` → botão **Comprar** (`/kit?add=<product_id>`) → `kit.html` pré-seleciona o item → **Finalizar compra**. Se **não há `rz_token`** (visitante), abre um **modal de entrega** (nome, email, WhatsApp, CEP+endereço com autofill via ViaCEP) e chama `POST /api/billing?action=checkout-kit-guest` (público, sem auth) → Mercado Pago. O endpoint valida itens (`KIT_CATALOG`) + endereço, cria Preference MP (payer + `shipments.receiver_address`), salva `orders` `pending` com `shipping` e `external_reference` `kit_guest_<ts>`. O webhook reusa o ramo `kit_` (marca `paid` + notifica admin **com o endereço**). `?compra=sucesso` mostra banner "volte pra ativar". **Cliente logado** segue o fluxo antigo (`checkout-kit`, autenticado) — intacto. **Sem a coluna `shipping`, o insert guest falha e o aviso não sai** — rodar o ALTER. (Implementado 2026-06-20.)

**Aviso de pedido pago — LIVE (validado 2026-06-20).** Cadeia de 3 elos, toda verde em produção: (1) tabela `orders` criada no Supabase; (2) `ADMIN_NOTIFICATIONS_EMAIL` setada na Vercel; (3) `RESEND_API_KEY` setada + domínio `startouch.com.br` **verified** no Resend (envia de `alertas@startouch.com.br`). Diagnóstico self-service no `billing.js`: `?action=debug` mostra `order_notifications.ready` (checa tabela `orders` + envs + status do domínio no Resend); `?action=test-email` dispara um email de teste pro admin e devolve a resposta crua do Resend.

**⚠️ Os diagnósticos exigem segredo desde 05/08/2026.** Uso: `?action=debug&secret=<CRON_SECRET>` (ou cabeçalho `Authorization: Bearer <CRON_SECRET>`). Vale pra `debug`, `health`, `test-email`, `test-weekly`, `mp-probe` e `resend-dns`. O segredo é o **`CRON_SECRET`** que já existe na Vercel; pra usar um separado, setar `DIAG_SECRET` (tem prioridade). **Fecha por padrão:** sem nenhuma das duas envs, ninguém entra — inclusive você. Sem segredo válido responde **404** (e não 401) de propósito: 401 confirmaria que o endpoint existe; 404 não conta nada a quem está sondando. O cron `api-health` manda o segredo no cabeçalho (`auth: true` na sonda do billing). Motivo do fechamento: as actions eram abertas e mostravam quais envs existem, o prefixo do token do MP e o domínio de email — e `test-email` disparava email de verdade, então um laço queimaria a cota do Resend. **Nota Resend:** manter o recurso **"Enable Receiving" DESLIGADO** — ele pede um MX `inbound-smtp…amazonaws.com` no `@` que não é usado pra envio e, se adicionado, sequestraria o recebimento de email do domínio. Com ele ligado o domínio fica `partially_failed` (envio ainda funciona, mas reporta sujo).

**Medição de venda server-side (GA4 → Google Ads) — implementado 2026-07-12.** O disparo de conversão de compra era **client-side na volta do checkout** (`?compra=sucesso`), que quebrava em PIX/boleto (não retornam), device diferente e aba fechada. Pior: o site disparava direto pras contas Ads **antigas/canceladas** (`AW-18239737019`, `AW-18229338581`), enquanto a conta viva (**Star Touch `398-430-4796`**) mede compra **importando o evento GA4 `purchase`** — que o site nunca enviava. Fix: o **webhook do MP** (`billing.js`, `sendGa4Purchase`) dispara `purchase` via **Measurement Protocol** quando o pagamento vira `approved` — idempotente (kit: gated na transição `pending→paid`; ia: gated no insert único). Alimenta GA4 **e** a conversão "Compra" do Ads de uma vez, sem depender do cliente. O `client_id`/`session_id` do GA4 (cookies `_ga`/`_ga_HCLV0Z640L`) são capturados no checkout (`kit.html`, `radar-plano.html` → `gaIds()`) e trafegam via metadata do MP pra amarrar a venda à sessão/campanha de origem; sem eles, usa fallback `mp.<payment_id>` (conta receita, sem atribuição). Requer `GA4_API_SECRET` na Vercel. Diagnóstico: `?action=debug` → `ga4_purchase.ready`. **Pendente (itens 2 e 3 da faxina de analytics):** alinhar nomes dos eventos de lead (`generate_lead`/`diag_report` vs `radar_lead`/`plano_view`) e remover os disparos diretos pras contas Ads canceladas.

## Endpoints (`api/`)

Vercel **Pro** (limite de funções já não é gargalo). Funções:
`register`, `login` (aceita `?action=google`/`id_token` pro login Google), `forgot-password`, `reset-password`, `savebiz`, `mybiz`, `reviews` (aceita `?place_id=`), `searchbiz`, `bizinfo` (retorna `plan` + `photoUrl`), `placeid`, `feedback` (GET lista pendentes / POST cria/atualiza, envia email via Resend. **Auth desde 05/08:** os ramos `reply_text` e `update` exigem token **e** que o feedback seja de um negócio do usuário — responde 404 pro feedback alheio, pra não confirmar que aquele id existe. Só o insert anônimo — `place_id` + `text`, sem `id` — segue público, que é o caminho legítimo de quem deixa feedback), `billing` (Mercado Pago — dispatcher por `?action=checkout|checkout-kit|checkout-kit-guest|checkout-ia|portal|webhook`; `checkout-kit-guest` e `checkout-ia` são públicos/sem auth; diagnósticos GET **protegidos por segredo** desde 05/08: `debug`, `health`, `test-email`, `test-weekly`, `mp-probe`, `resend-dns` — ver abaixo), `plates` (dispatcher por `?action=create-batch|list-batches|list-stock|activate|my-businesses|my-plates`), `r/[code]` (redirect universal de placa), `radar` (POST — IA Radar, ver seção abaixo).

Helpers em `api/_lib/` (prefixo `_` = não vira function): `plates.js` (geração de códigos), `radar/` (motores de IA, cache e score do IA Radar).

## Status atual

Fluxo end-to-end funcionando:
- **Onboarding:** cadastro → `savebiz` → dashboard.
- **Dashboard como vitrine:** 6 produtos (placa balcão, plaquinha mesa, placa parede, cartões NFC + QR Code próprio + link direto). Hardware com link Mercado Livre placeholder; QR e link são gerados pelo app.
- **`avaliar.html`:** ao abrir (toque/scan/link), redireciona **direto pro Google Meu Negócio** pra avaliar — igual pra todos, sem rotear por plano. Anti-dupla avaliação por device (localStorage 30 dias). **Peneira REMOVIDA em 2026-05-23** (commit `95b41d2`): não há mais desvio do insatisfeito pro privado — e as telas dela já saíram do HTML (hoje só existem `stepThanks`, `stepError` e `stepLoading`).
- **`avaliar.html` — SEM GA4 e SEM Meta Pixel desde 22/08/2026 (LGPD).** Quem atravessa esta página é o **consumidor do lojista**: não tem relação com a StarTouch e não teve onde consentir. É o que a Política de Privacidade declara (§4.2) e o que a landing promete no card do Cartão NFC. **Não reintroduzir** — há comentário no `<head>` avisando. **Efeito na medição, pra ninguém se assustar com o gráfico:** a partir dessa data as sessões com `utm_source=placa` somem do GA4. **Não é placa parada, é o rastreamento que saiu** — o volume de toques continua íntegro em `plate_taps` (data, meio, dispositivo) e no painel do cliente. Anotação criada no GA4 na data do deploy. Se um dia o volume precisar aparecer no GA4, o caminho é **server-side** (Measurement Protocol a partir do `api/r/[code].js`, sem cookie no aparelho do consumidor) — registrado como opção, **não construído**.
- **Banner de cookies + Consent Mode v2 desde 22/08/2026** (`public/consent.js`). GA4 e Meta Pixel só disparam com cookie de aceite; quem não decide fica **negado** e o banner volta na visita seguinte. **Segundo efeito na medição, e é esperado:** o número de **usuários** no GA4 cai — só conta com identificador quem aceitou. As **conversões modeladas caem bem menos**, porque o Consent Mode segue mandando ping sem cookie e o Google modela a diferença; por isso é Consent Mode e não bloqueio bruto do script. Quem comparar agosto com julho vai ver degrau nos dois gráficos: no de usuários é grande, no de conversões é pequeno. Não é queda de tráfego nem campanha quebrada. `/avaliar` e as páginas legais seguem sem tag nenhuma, com ou sem aceite.

## Princípios (aprendidos do jeito caro)

**Falha silenciosa é o bug nº1 daqui.** Cache que não guardava, cron que não tinha subido, 429 do Google virando "sem concorrente" — todos passaram despercebidos porque falharam calados. Regra: **toda proteção precisa provar que está ligada**. Padrão a seguir, já implementado: `_lib/places-cache.js:34-44` e `_lib/rate-limit.js:36-44` avisam uma vez por instância quando estão desligados, em vez de simplesmente não funcionar.

**Log não pode viver onde a rotina que ele documenta alcança** (22/08/2026). Registro de expurgo guardado numa tabela que o próprio expurgo apaga se come: no mês 13 não há como provar o mês 1. Vale como princípio geral, não só pro caso que originou (avaliamos usar `email_log` como log da rotina de retenção e caiu por isto). O log de qualquer rotina de eliminação precisa de tabela própria, com base de guarda independente — Art. 37 da LGPD (registro das operações de tratamento) sustenta a guarda sozinho, fora dos prazos das outras tabelas.

**RLS não é boa prática neste projeto, é a única defesa.** O Supabase concede `GRANT ALL` pra `anon` e `authenticated` em **toda** tabela criada no schema `public` — a chave anônima é pública e tem INSERT, UPDATE, DELETE e TRUNCATE em tudo. A única coisa que impede é a RLS. Tabela criada sem RLS nasce aberta. **Toda tabela nova nasce com RLS ligada e policies explícitas** — incluindo a tabela de log do expurgo. Descoberto do jeito caro em 22/08/2026: a policy `"Service can insert feedbacks"` (INSERT, `roles={public}`, `with_check=true`) deixava qualquer um gravar na tabela `feedbacks` direto pela chave anônima, sem passar pelo endpoint. O nome era enganoso — `service_role` ignora RLS por definição e nunca precisou de policy.

**A lista de alvos de uma verificação deriva dos ARQUIVOS ALTERADOS, nunca de páginas escolhidas a dedo.** Controle negativo prova que a sonda enxerga; **não** prova que a lista está completa. Caso que originou (22/08/2026, item 4 da LGPD): quatro páginas verificadas em `public/`, todas limpas — mas `index.html` e `index-v2.html` vivem na **raiz** e ficaram fora do `git add`, então `/app` e `/app-legacy` seguiram rastreando sem consentimento. As duas coisas que faltavam eram a mesma: o `git add` por diretório e a sonda por amostra. **O controle POSITIVO — um alvo que se SABE conter o termo — não é redundância: é o que distingue "não está lá" de "a sonda parou de enxergar".** Caso: o anti-bot da Vercel passou a responder **403** ao `curl` e devolveu uma tabela de zeros **indistinguível de sucesso**; só a `/landing` na lista, sabidamente positiva, denunciou a sonda cega. **Toda verificação leva um alvo positivo conhecido, sempre.**

**Sonda que devolve exatamente o resultado esperado precisa de controle negativo** antes de virar relatório: a mesma sonda, no mesmo formato, contra um alvo onde o resultado **deve** ser diferente de zero. Cinco zeros sem controle são indistinguíveis de grep mal escrito. Estabelecido em 22/08/2026 na verificação de que o Pixel/GA4 tinham saído da `/avaliar` — a checagem só virou conclusiva com o controle na `/landing` (`fbq: 6`, `gtag: 5`).

## Pendências

1. Hardware NFC: os cards com link pro **SKU placeholder do Mercado Livre** sobrevivem só no painel **legado** (`src/App.jsx:1436-1437, 1876`, servido em `/app-legacy`). O painel atual (`AppV2.jsx`) já vende pelo checkout próprio (`/kit?add=…` → Mercado Pago). Decidir se o legado morre ou se os links são corrigidos.
2. Deploy backend no Railway (avaliar se ainda faz sentido com Vercel functions).
3. **`email_log` não registra tudo o que parece** (achado 22/08/2026, **fora do escopo LGPD**, não corrigir junto): (a) o insert em `_lib/email-sender.js:118` não confere o `{error}` devolvido pelo supabase-js, então **qualquer** falha de escrita é muda — nem o `catch` dispara; (b) `billing.js:225` manda a string `"admin"` pra coluna `user_id UUID NOT NULL`, o que o Postgres recusa — ou seja, os e-mails administrativos (`admin_new_order`) são enviados e **nunca logados**. Conferir com `select email_type, count(*) from email_log group by 1`. Não trava a publicação da Política (o texto descreve o registro de envios a usuários, e esse funciona), mas a tabela hoje é menos completa do que o nome sugere.

**Resolvido (2026-06-20):** `RESEND_API_KEY` setada na Vercel + domínio verificado no Resend. Emails transacionais (boas-vindas, dispositivo ativado, notificações admin, **aviso de pedido pago**) funcionando em produção. Ver seção "Aviso de pedido pago — LIVE" acima.

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

**UTMs de placa (atribuição, 2026-07-02):** o CSV grava `nfc_url` com `?utm_source=placa&utm_medium=nfc` e `qr_url` com `?utm_source=placa&utm_medium=qr` (mesma rota `/r/CODE`; o medium distingue o meio físico). O servidor `api/r/[code].js` **repassa** os UTMs que chegam na URL pro destino final (`/avaliar`, `/ativar-codigo` — onde vive o GA4/gtag). **Placas antigas** foram gravadas sem parâmetros: quando batidas, o servidor aplica o padrão `utm_source=placa&utm_medium=nfc` — sem regravar o chip físico. Assim toda batida chega na landing com atribuição.

## IA Radar (diagnóstico de presença em IA)

Feature de **GEO/medição**: o usuário informa nome + categoria + cidade; o backend pergunta a 3 motores de IA com busca real (Gemini Flash, GPT-4o-mini, Perplexity Sonar) "qual a melhor {categoria} em {cidade}?" (6 perguntas/motor), mede em quantas respostas o negócio é citado e quais concorrentes aparecem, e devolve um **score 0-100** (taxa de menção) + concorrentes + diagnóstico em texto.

- **Página:** `/radar` (`public/radar.html`) — form → `fetch POST /api/radar` → score + barras de concorrentes + diagnóstico. Só mostra motores que rodaram.
- **Rota:** `api/radar.js`. Helpers em `api/_lib/radar/`: `engines.js` (3 motores + grounding + cache), `score.js` (perguntas, avaliação via Gemini com fallback heurístico, score), `cache.js` (radar_cache + radar_diagnostics).
- **SQL:** rodar `supabase/schema-radar.sql` uma vez (tabelas `radar_cache` e `radar_diagnostics`).
- **Custo controlado:** cache de 7 dias por `motor|categoria|cidade|hash(pergunta)` (perguntas genéricas → negócios da mesma categoria/cidade reaproveitam respostas), modelos baratos, rate limit 5/IP/hora. `maxDuration` 60s no `vercel.json`.
- **Transparência (regra de negócio):** só reporta motores que de fato rodaram; score é rotulado como taxa de menção, não ranking garantido. Falha de um motor não derruba o diagnóstico.
- **Env vars necessárias:** `GEMINI_API_KEY`, `OPENAI_API_KEY`, `PERPLEXITY_API_KEY` (reusa `SUPABASE_SERVICE_KEY`). Sem nenhuma chave, a rota responde 503; com pelo menos uma, roda só os motores disponíveis. **Avaliação usa Gemini** — sem `GEMINI_API_KEY` cai pro fallback heurístico (só conta menção textual, sem extrair concorrentes).

## Variáveis de ambiente (Vercel)

`PLACES_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` (opcional), `RESEND_FROM` (opcional — ex: `"StarTouch <feedback@startouch.com.br>"`; sem isso usa `onboarding@resend.dev`), **`MP_ACCESS_TOKEN`** (Mercado Pago — provedor ativo), `MP_WEBHOOK_SECRET` (opcional, validação HMAC do webhook MP), `ADMIN_NOTIFICATIONS_EMAIL` (email do admin pra receber aviso de **pedido pago** e **cliente novo**; sem ela, o aviso é pulado com log). **IA Radar:** `GEMINI_API_KEY`, `OPENAI_API_KEY`, `PERPLEXITY_API_KEY` (todas opcionais — a feature roda só os motores cuja chave existe; sem nenhuma, `/api/radar` responde 503). **Medição de venda (GA4):** `GA4_API_SECRET` (chave do Measurement Protocol criada no GA4 → Admin → Fluxo de dados → "Chaves secretas da API do Measurement Protocol"; sem ela o `purchase` server-side é pulado com warning), `GA4_MEASUREMENT_ID` (opcional — default `G-HCLV0Z640L`). Stripe dormente: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` (não usadas atualmente, manter setadas só se planejar reativar Stripe).

## Links

- Repo: github.com/ricardofiorini-ship-it/reputazap
- Deploy (produção): www.startouch.com.br
- URL Vercel (projeto): reputazap.vercel.app (obs: `startouch.vercel.app` está inativo)
