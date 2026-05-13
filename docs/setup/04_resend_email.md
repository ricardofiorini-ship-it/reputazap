# Resend — Email transacional com domínio próprio

> Passos pra ativar emails saindo de `feedback@startouch.com.br` ao invés do compartilhado `onboarding@resend.dev`.

---

## CONTEXTO

O código (`api/feedback.js`) já está pronto. A constante `EMAIL_FROM` lê de `process.env.RESEND_FROM` com fallback pro endereço compartilhado:

```js
const EMAIL_FROM = process.env.RESEND_FROM || "StarTouch <onboarding@resend.dev>";
```

Sem fazer nada, os emails continuam funcionando saindo de `onboarding@resend.dev` (compartilhado do Resend — funciona, mas não tem domínio próprio).

Pra ativar `feedback@startouch.com.br`, seguir os passos abaixo.

**Pré-requisito:** domínio `startouch.com.br` registrado e com DNS gerenciável (Registro.br ou DNS do Vercel).

---

## CHECKLIST DE EXECUÇÃO

### 1. Adicionar domínio no Resend

- Acessar https://resend.com/domains
- Click "Add Domain"
- Digitar `startouch.com.br`
- Região: `sa-east-1` (São Paulo) — menor latência pro BR

### 2. Adicionar records DNS

O Resend vai mostrar 3 records pra copiar:

| Tipo | Nome | Valor |
|---|---|---|
| MX | `send` | `feedback-smtp.sa-east-1.amazonses.com` (prioridade 10) |
| TXT (SPF) | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT (DKIM) | `resend._domainkey` | `p=MIIBIjANBgkqhkiG9w0...` (chave longa) |

(Os valores exatos aparecem no painel do Resend — copiar de lá.)

Adicionar esses records no painel DNS do registrador (Registro.br ou Vercel DNS).

### 3. Aguardar propagação + verificação

- Pode levar até 24h (geralmente 5-30 min)
- Resend mostra status "Verified" quando ok
- Pode forçar verificação clicando "Verify DNS records" no painel

### 4. Setar env var no Vercel

No painel Vercel do projeto:

**Settings → Environment Variables → Add:**

- Nome: `RESEND_FROM`
- Valor: `StarTouch <feedback@startouch.com.br>`
- Environments: Production, Preview, Development

**Trigger redeploy** depois de salvar (Settings → Deployments → último → Redeploy).

### 5. Testar

Enviar uma mensagem teste pelo fluxo público:

1. Abrir `https://startouch.com.br/avaliar?place_id=<seu_place_id>&preview=1`
2. Clicar "Falar direto com a equipe"
3. Selecionar categoria, preencher, enviar
4. Verificar inbox do dono — email deve vir de `feedback@startouch.com.br`
5. Headers do email: campo `From` deve mostrar o domínio próprio

### 6. (Opcional) Configurar DMARC

Pra aumentar deliverability e proteger contra spoofing:

| Tipo | Nome | Valor |
|---|---|---|
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:contato@startouch.com.br` |

Começar com `p=none` (só monitora). Depois de 2-4 semanas sem problemas, escalar pra `p=quarantine` e depois `p=reject`.

### 7. (Opcional) Configurar ImprovMX pra receber

O domínio do Resend é **só envio**. Pra receber emails em `contato@startouch.com.br`, configurar ImprovMX (free):

- https://improvmx.com
- Add domain: `startouch.com.br`
- Forward `contato@startouch.com.br` → seu Gmail pessoal
- Adicionar 2 MX records no DNS (ImprovMX mostra)

⚠️ **Cuidado:** se já tem MX records do Resend pra `send.startouch.com.br`, não conflita — Resend usa subdomínio `send.`, ImprovMX usa raiz `@`.

### 8. (Opcional) Gmail "Send As" — responder do startouch.com.br pelo Gmail

Depois que ImprovMX estiver recebendo:

- Gmail → Settings → Accounts → "Send mail as" → "Add another email"
- Email: `contato@startouch.com.br`
- SMTP: `smtp.resend.com:587` (com app password do Resend)
- Verifica via email enviado pelo Gmail

---

## ROLLBACK

Se algo der errado:
1. No Vercel, remover `RESEND_FROM` da lista de env vars
2. Redeploy
3. Sistema volta a usar `onboarding@resend.dev` (fallback)

Sem perda de funcionalidade.
