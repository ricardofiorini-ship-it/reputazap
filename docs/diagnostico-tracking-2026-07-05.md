# Diagnóstico de Tracking — StarTouch (2026-07-05)

Hand-off pro Code. Análise feita com dados reais de **Google Analytics 4** (propriedade `541425467`) e **Google Ads** (conta `Star Touch`, `3984304796`), puxados via Supermetrics.

**Janela analisada:** GA4 sex–dom **3–5/jul/2026** (252 sessões, ~239 usuários). Google Ads **2–4/jul** vs **29/jun–1/jul**.

Foram encontrados **2 problemas estruturais** de medição. Nenhum é "site quebrado" — são lacunas de rastreamento/atribuição. Um deles já recebeu uma correção de código (detalhada abaixo); o resto depende de configuração no painel Google (Ads/GA4).

---

## Problema 1 — Conversões não chegam ao Google Ads

### Sintoma
GA4 registrou **11 conversões** na janela (8 de Paid Search, 3 de Direto), mas o **Google Ads reportou 0** conversões nas duas campanhas ativas (`CAMPANHA STARTOUCH` e `pesquisa StarTouch`), apesar de 148 cliques / R$141 de gasto em 3 dias.

### Causa raiz
O site só dispara conversão de Google Ads em **dois pontos**, ambos de fundo de funil:

- `public/radar.html:467` — lead do Radar → `AW-18239737019/CY03CJqo8b4cELuZsflD`
- `public/kit.html:748` — compra do kit → `AW-18229338581/Lb1YCP7xqcMcENXDtvRD`

Ambos estão bem implementados (com `event_callback` + timeout no radar; `transaction_id` pra dedup no kit).

O que **não** dispara conversão de Ads é a ação principal e de maior volume: **o cadastro / "ver presença grátis"** (`/ativar` → `/app?login=1`). Esse fluxo só emite o evento GA4 `dashboard_view` (`src/App.jsx:317`), sem contrapartida no Google Ads. A `public/landing.html` (página que o tráfego pago recebe) carrega os tags gtag (`AW-18239737019`, `AW-18229338581`, `G-HCLV0Z640L`) mas **não dispara nenhuma conversão** — é só passagem com CTAs pra `/app` e `/kit`.

Conclusão: **não é tag quebrada.** O GA4 mede 11 conversões porque tem eventos-chave marcados (cadastro/diagnóstico); o Ads mostra 0 porque as duas únicas conversões que ele rastreia (lead do Radar + compra) não aconteceram via anúncio nessa janela. Falta rastrear no Ads a conversão de topo (cadastro).

### Correção já aplicada (por mim, no código)
Arquivo: **`public/ativar.html`**. Adicionei um helper e o disparo nos **dois** fluxos de cadastro (senha e Google):

- Novo helper `fireSignupConversion(cb)` + constante `const ADS_SIGNUP_CONVERSION = ""` (linhas ~577–589). Segue o padrão do radar (`event_callback` + timeout de 1200ms) pra o redirect não cancelar o beacon.
- Disparo no ramo web (redirect via callback) e no ramo NFC, nos dois handlers de sucesso do `/api/register` (fluxo senha ~linha 642 e fluxo Google ~linha 441).
- **Blindado:** enquanto `ADS_SIGNUP_CONVERSION` estiver `""`, o helper vira no-op — **nada dispara**. Seguro pra fazer deploy sem o label. Sintaxe do bloco `<script>` validada com `node --check`.

### O que falta (não-código, depende do painel Google)
1. **Criar a ação de conversão "Cadastro"** no Google Ads (Metas → Conversões → Nova ação → site) e colar o rótulo gerado (`AW-XXXXXXXXX/xxxx`) na constante `ADS_SIGNUP_CONVERSION` em `public/ativar.html`. Depois `git push`.
2. **Alternativa/complemento recomendado (mais rápido, sem código):** vincular GA4 ↔ Google Ads e **importar os eventos-chave do GA4 como conversão** no Ads. Como o GA4 já mede, isso acende as conversões no Ads imediatamente.
   - Vínculo (interface nova): Google Ads → **Ferramentas → Gerenciador de dados → + Conectar produto → Google Analytics 4**; ou pelo GA4 → **Admin → Vínculos de produtos → Vínculos do Google Ads → Vincular** (deixar **auto-tagging** ligado).
   - GA4: marcar o evento de cadastro como **evento-chave**.
   - Google Ads: **Metas → Conversões → Nova ação → Importar → GA4 → Web** → selecionar o evento → definir como **principal**.

> Observação: idealmente o disparo de cadastro deve contar **1x por conta nova**, não a cada login. O helper hoje dispara no sucesso do `/api/register` (criação de conta), que é o ponto certo. Não colocar no `dashboard_view` (que roda a cada abertura do painel e superestimaria).

---

## Problema 2 — 46% do tráfego cai em "Unassigned" no GA4

### Sintoma
Distribuição de canais (3–5/jul): **Unassigned 117 sessões (46%)** com engajamento de 18%, Paid Search 97, Cross-network 18, Direct 10, Organic 6, Referral 4. Quase metade do tráfego sem canal atribuído.

### Causa raiz
As placas geram UTMs com **`utm_medium=nfc`** (ou `qr`), que **não são mediums reconhecidos** por nenhuma regra do agrupamento de canais padrão do GA4 → tudo cai em "Unassigned".

Origem no código (a atribuição em si está **correta**; o GA4 é que não sabe nomear o canal):
- `api/r/[code].js:26–35` — `buildPlateUtm()` monta `utm_source=placa&utm_medium=nfc|qr`; placa antiga sem parâmetro recebe o padrão `utm_source=placa&utm_medium=nfc` (linha 33).
- `public/admin-producao.html:228–229` — o CSV da gráfica grava `nfc_url` com `?utm_source=placa&utm_medium=nfc` e `qr_url` com `?utm_source=placa&utm_medium=qr`.
- `public/avaliar.html` — carrega o GA4 (`G-HCLV0Z640L`, ~linha 13–20) e **depois** redireciona pro Google (`window.location.href = googleUrl`, ~linha 227). Ou seja, o GA4 registra a sessão com `source=placa / medium=nfc` (→ Unassigned) e o usuário sai. Isso também explica o bounce de 87% e engajamento ~0 da `/avaliar` (é página de passagem, comportamento esperado).

### Correção recomendada (sem mexer no chip)
1. **Grupo de canais personalizado no GA4** (GA4 → Admin → Configurações de canais / Channel groups → criar grupo) com a regra: **`Origem` (source) = `placa` → canal "Placa (NFC/QR)"**. É **retroativo** nos relatórios e não exige regravar chip nem alterar código. (Opcional: refinar por `medium` pra separar `nfc` de `qr`.)
2. **(Opcional) Marcar `/avaliar` como redirecionamento** pra não sujar as métricas de engajamento do site (hoje ela derruba a média por ser só passagem pro Google). Pode ser via configuração de "eventos/ páginas" no GA4 ou excluindo `/avaliar` dos relatórios de conteúdo.

> **Não recomendado:** trocar `utm_medium` pra um valor "reconhecido" (ex.: `referral`) só pra sair do Unassigned — isso classificaria errado o tráfego e perderia a distinção física nfc/qr. O caminho certo é o grupo de canais personalizado.

---

## Observações de bônus (não são bugs, são oportunidades)

- **`/kit` (página comercial) fraca:** 14 usuários, ~9s cada, 0 conversões na janela; como landing teve 1 sessão e 100% bounce. Recebe tráfego e não engaja. Vale revisar clareza de preço/valor/CTA e reforçar links de `/landing` e `/app` pra ela. (Amostra pequena — direcional.)
- **94% de usuários novos, quase nenhum retorno.** Esperado nesta fase, mas o painel `/app` deveria puxar recorrência dos donos.
- **Paid Search é o canal que converte** (34% de engajamento, path `/landing`). Escalar **só depois** de consertar a medição de conversão, pra escalar em CPA real.

---

## Resumo de ações pro Code

| # | Ação | Onde | Tipo | Status |
|---|------|------|------|--------|
| 1 | Conversão de cadastro no `ativar.html` (helper + disparo nos 2 fluxos) | `public/ativar.html` | Código | ✅ Feito (aguarda label) |
| 2 | Criar ação de conversão "Cadastro" no Ads e colar `AW-…/…` na constante `ADS_SIGNUP_CONVERSION` | Google Ads + `public/ativar.html` | Painel + 1 linha | ⬜ Pendente |
| 3 | Vincular GA4 ↔ Ads + importar eventos-chave como conversão | Google Ads / GA4 | Painel | ⬜ Pendente |
| 4 | Grupo de canais personalizado "Placa (NFC/QR)" (source = placa) | GA4 | Painel | ⬜ Pendente |
| 5 | Marcar `/avaliar` como redirecionamento (opcional) | GA4 | Painel | ⬜ Pendente |
| 6 | Revisar conversão da `/kit` (opcional) | `public/kit.html` / `landing.html` | Código/UX | ⬜ Backlog |

**Dados de referência (janela 3–5/jul):** 252 sessões / ~239 usuários. Canais: Unassigned 117, Paid Search 97 (8 conv), Cross-network 18, Direct 10 (3 conv), Organic 6, Referral 4. Landing pages: `/landing` 127 sess / 61% bounce / 8 conv; `/avaliar` 109 sess / 87% bounce / 0 conv; `/app` 7 sess / 3 conv; `/kit` 1 sess / 100% bounce. Google Ads (2–4/jul vs período anterior): cliques 148 vs 86, custo R$141 vs R$90, CTR 5,4% vs 3,0%, CPC R$0,96 vs R$1,05, **0 conversões nos dois períodos**.
