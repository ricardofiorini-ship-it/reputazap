# StarTouch — Resumo Executivo

> Documento pra alinhar marketing + produto sobre o estado atual do sistema.
> Atualizado em: 2026-05-13

---

## EM UMA LINHA

Plataforma SaaS multi-funcional pra negócios locais brasileiros gerenciarem reputação no Google, **100% dentro das regras do Google Business Profile**, com hardware (placas/cartões NFC) como canal de aquisição e software (mensalidade) como motor de receita.

---

## QUEM É O CLIENTE

**Donos de comércio local:**
- Restaurantes, cafés, salões, clínicas, oficinas, lojas
- SMB pequeno e médio
- Já tem (ou quer ter) Google Meu Negócio
- Dor: reclamação chega pública no Google sem aviso prévio; difícil descobrir o que cliente realmente pensa antes de ir pro 1★

**Mercado de futuro (P2+):**
- Redes regionais (franquias)
- Negócios com hardware de concorrentes (entrada via BYOC)

---

## POSICIONAMENTO ESTRATÉGICO

| Concorrente | O que vendem | Modelo |
|---|---|---|
| **AvaliaCard** (principal) | Cartão NFC físico (R$99/un) | One-shot, sem mensalidade, sem painel |
| **StarTouch** | Sistema/plataforma | Hardware barato (canal) + mensalidade (motor) |

**Frase-âncora:** "AvaliaCard vende cartão. Nós vendemos sistema."

**Diferencial-chave:** "100% dentro das regras do Google" — vira selo de confiança e barreira pra concorrente que faz review gating.

---

## O QUE O SISTEMA FAZ HOJE

### 1. Fluxo público (cliente final)
URL única por negócio: `startouch.com/avaliar?place_id=XXX`

Cliente acessa (via NFC, QR ou link) e vê **2 botões simétricos**:

- **Avaliar no Google** → abre página oficial do Google pra deixar review pública
- **Falar direto com a equipe** → formulário privado de 4 categorias:
  - 😊 Elogio
  - 💡 Sugestão de melhoria
  - ⚠️ Reclamação
  - ❓ Dúvida
  + textarea opcional + nome opcional + contato opcional

**Sem favoritismo** entre os 2 botões (compliance Google). Mensagem privada é enviada por email pro dono e fica salva no painel.

### 2. Onboarding (dono cadastrando)
URL: `startouch.com/ativar?from=web`

Fluxo invertido (estilo Google Meu Negócio):
1. Busca empresa no Google Maps (Places API)
2. Seleciona resultado
3. Card com biz selecionado + form de cadastro (nome, email, WhatsApp, senha)
4. Sucesso → redirect pra `/comece` (tela "seu link está pronto")
5. Cliente já pode copiar link, baixar QR ou gravar NFC

### 3. Painel do dono (`startouch.com/app`)
**Sidebar (3 itens fixos):**
- Painel (visão geral)
- Mensagens (caixa de mensagens privadas dos clientes)
- Configurações

**Painel principal mostra:**
- Card de status do plano (Free / Pro)
- Banner de alerta (se há mensagens pendentes)
- Central de ativação: 3 cards (Link / QR Code / NFC) com botões diretos
- Lista resumo de mensagens pendentes (estilo conversa, não tabela)
- Atividade recente (timeline de eventos)
- Vitrine de hardware (Placa balcão + Cartão NFC com botão "Comprar")
- Comparação Free × Pro (no rodapé, sem dominar topo)
- CTA upgrade pra plano pago

**Tab Mensagens** — lista completa de mensagens privadas com:
- Avatar + categoria + tempo
- Quote da mensagem (estilo chat)
- Botão "Responder cliente" → form in-app que envia email via Resend
- Botão "Falar no WhatsApp" → abre wa.me direto (se cliente deixou WhatsApp)
- Botão "Já resolvi" → marca como resolvido

**Tab Configurações:**
- Dados da conta
- Plano atual + data de renovação ou trial
- Bloco Notificações: campo email pra escolher onde receber alertas
- Negócio cadastrado (trocar se quiser)
- Botão Sair

### 4. Billing (Stripe)
- Trial 14 dias grátis no plano Pro
- Checkout Stripe hospedado em pt-BR
- Webhook que ativa/desativa Pro automaticamente
- Customer Portal pra cliente cancelar/atualizar cartão
- Preço atual: R$49/mês (configurável via env `STRIPE_PRICE_ID`)
- Em **test mode** (sem cobrar ainda)

### 5. Hardware (vitrine)
2 produtos ativos:
- **Placa para balcão** (acrílico + NFC + QR)
- **Cartão NFC** (PVC fosco com cordão)

Compra pelo Mercado Livre (link externo). Margem mínima — é canal de aquisição.

---

## STACK TÉCNICO

| Camada | Tecnologia |
|---|---|
| Frontend (app) | React + Vite |
| Frontend (público) | HTML estático em `public/` (`avaliar.html`, `ativar.html`, `comece.html`, `landing.html`) |
| Backend | Vercel Serverless Functions (Node.js) — 12 endpoints |
| Banco | Supabase (Postgres) — tabelas: `profiles`, `businesses`, `feedbacks` |
| Auth | Supabase Auth (email + senha) |
| Pagamento | Stripe Checkout + Portal + Webhooks |
| Email transacional | Resend (domínio startouch.com em verificação) |
| APIs externas | Google Places API |
| Deploy | Vercel (auto-deploy via `git push origin main`) |
| Domínio | `startouch.com` (apontado), `startouch.com.br` (redirect comprado) |

---

## FEATURES ATIVAS

### Compliance e segurança
- ✅ Fluxo público 100% Google-compliant (sem review gating)
- ✅ 2 botões simétricos (mesmo peso visual e textual)
- ✅ Anti-dupla avaliação por device (localStorage 30 dias)
- ✅ HTTPS automático via Vercel
- ✅ Tags "LGPD · SSL · Integra com Google" no footer

### Captura de feedback
- ✅ 4 categorias de mensagem (Elogio/Sugestão/Reclamação/Dúvida)
- ✅ Email automático pro dono quando chega mensagem (via Resend)
- ✅ Dono pode escolher email de notificação custom (Settings → Notificações)
- ✅ Inbox híbrido no painel: responde por email (in-app) ou WhatsApp (deeplink) conforme contato deixado
- ✅ "Marcar como resolvido" sincronizado com banco

### Ativação e divulgação
- ✅ Link único por negócio
- ✅ QR Code gerado on-demand (api.qrserver.com)
- ✅ Gravação NFC via Web NFC (Android Chrome) ou NFC Tools (iPhone)
- ✅ "Testar experiência" (modo simulação `?preview=1`)

### Painel
- ✅ Status emocional de proteção (Free/Pro)
- ✅ Activity feed (eventos recentes)
- ✅ Mini dashboard com métricas (avaliações Google, mensagens privadas, pendentes)
- ✅ Tab Settings com gestão de plano + email + biz
- ✅ Visual padronizado Google-style (paleta #1A73E8, sombras Material, radius 12)

### Billing
- ✅ Stripe Checkout integrado
- ✅ Trial 14 dias automático
- ✅ Webhook sincroniza plano (active/trialing/canceled)
- ✅ Card "Renova em DD/MM/YYYY" ou "Trial grátis · primeira cobrança em..."
- ✅ Customer Portal pra cancelar/atualizar cartão self-service

### Landing
- ✅ Versão dark roxa (descartada, usuário pediu reversão)
- ✅ Versão atual: paleta off-white + azul Google, hero centralizado com mockup NFC
- ✅ Seções: Hero · Como funciona · Painel · Benefícios · Stats · Hardware · CTA · Footer
- ⚠️ Copy precisa atualização pro novo posicionamento "plataforma multi-funcional" (Bloco 2 pendente)

---

## ROADMAP

### Bloco 1 ✅ CONCLUÍDO
Refator do fluxo público pra compliance Google (remoção do review gating, 2 botões simétricos, form segmentado).

### Bloco 2 — Landing nova (em pausa, aguardando direção do time)
- Reescrever copy pro posicionamento "plataforma multi-funcional"
- Tirar foco de "evite avaliação negativa"
- Adicionar selo "100% dentro das regras do Google"
- Mostrar arquitetura preparada pra módulos futuros
- Wireframe primeiro, código depois

### Bloco 3 — Refator painel (pendente)
- Remover Z3 (comparação Free × Pro que descreve gating)
- Renomear "Modo Protegido" pra "Plano Pro" com features reais
- Atualizar copy "Reclamações chegam no seu email antes de virar pública" (era gating)

### Bloco 4 — Plano Free vs Pago (decisão estratégica pendente)
- Definir o que entra no Free (precisa cobrir caso de uso AvaliaCard)
- Definir features de cada tier (Pro R$49, Premium R$99, Rede R$297)

### P1 (4-8 semanas) — Primeiros módulos pagos
- Alerta WhatsApp tempo real (polling Places API)
- Resposta com IA (modo sugestão copy-paste)
- Recuperador de reviews negativas (versão simplificada)
- Relatórios mensais PDF
- Multi-QR por canal

### P2 (8-16 semanas)
- Monitor de concorrentes
- Análise de sentimento (IA)
- **BYOC** (Bring Your Own Card — cliente plug URL de hardware terceiros tipo AvaliaCard)
- Ranking por atendente (URL única por cordão NFC)

### P3 (16-24 semanas)
- Clube de Fidelidade (cadastro + cupom WhatsApp + gatilhos)
- Bonificação automática equipe
- Retargeting WhatsApp pós-NFC

### P4 (24+ semanas)
- Multi-unidade (rede de franquias)
- Integração Google Business Profile API completa

---

## ESTADO DE PRODUÇÃO

| Item | Status |
|---|---|
| Domínio `startouch.com` | ✅ Ativo |
| Domínio `startouch.com.br` | ✅ Redirect pra .com (via Hostinger) |
| HTTPS automático | ✅ Vercel |
| Auth Supabase | ✅ Funcionando |
| Stripe Checkout | ✅ Test mode (`sk_test_`) |
| Stripe Live mode | ⏳ Aguardando aprovação Stripe + decisão do usuário |
| Resend domínio | ⏳ DNS adicionado, aguardando verificação |
| Email transacional ativo | ⚠️ Funciona mas envia de `onboarding@resend.dev` (genérico) |
| ImprovMX (receber contato@startouch.com) | ⏳ Não configurado |
| Gmail "Send As" | ⏳ Não configurado |
| Webhook Stripe configurado | ✅ Test mode |

---

## MÉTRICAS / KPIs (sugestão pra acompanhar)

Já temos infra pra rastrear:
- Total de feedbacks por categoria (elogio/sugestão/reclamação/dúvida)
- Tempo médio de resposta do dono
- Taxa de resolução (resolved_at vs total)
- Plano ativo por business (free / trialing / active / canceled)
- Receita recorrente (via Stripe Dashboard)

Falta implementar (Bloco 1.1):
- Clique em "Avaliar no Google" vs "Falar com equipe" (taxa de conversão)
- Origem da visita (placa NFC / QR / link direto)
- Funil de cadastro (visita landing → cadastro → ativa NFC)

---

## DECISÕES PENDENTES

1. **Nome da marca final** (StarTouch mantido provisoriamente)
2. **Estrutura de planos** (o que cobre o Free vs cada tier pago)
3. **Ordem de implementação dos módulos P1**
4. **Estratégia de social proof** (conseguir 3-5 logos premium)
5. **BYOC**: avançar antecipado (P1) ou esperar P2?
6. **Pricing do hardware**: cobrir custo zero ou margem mínima? Frete grátis BR?
7. **Migração pra Stripe Live mode** (aguardando ativação completa da conta + aprovação KYC)
8. **Atualização da copy da landing** pro novo posicionamento (Bloco 2)

---

## REPOSITÓRIO E DOCS

- **GitHub:** github.com/ricardofiorini-ship-it/startouch
- **Deploy:** startouch.com (Vercel auto-deploy via main branch)
- **Documentação técnica:** `CLAUDE.md` no root
- **Briefing estratégico:** `docs/strategy/01_contexto_estrategico.md`
- **Este documento:** `docs/strategy/02_resumo_executivo.md`

---

## CONTATO

Founder: Ricardo Fiorini (ricardo.fiorini@gmail.com)
