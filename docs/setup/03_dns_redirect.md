# DNS + Redirect 301 — Configuração Manual

> Passos que precisam ser feitos **fora do código** pro Bloco 1.3 ativar 100%.

---

## CONTEXTO

Após o rebrand StarTouch (Bloco 1.1 + 1.2), o domínio definitivo é **`startouch.com.br`**.
Os domínios antigos (`reputazap.com` e `reputazap.com.br`) precisam continuar funcionando como redirect 301 pra preservar:

- SEO (links externos antigos não quebram)
- Cartões NFC já distribuídos (apontam pra `reputazap.com/avaliar`)
- Bookmarks de clientes

O `vercel.json` no repo já tem a regra de redirect configurada. Só precisa ativar os domínios no Vercel.

---

## CHECKLIST DE EXECUÇÃO

### 1. Registrar `startouch.com.br` no Registro.br

- Acessar https://registro.br
- Verificar disponibilidade de `startouch.com.br`
- Comprar (R$40/ano)
- Documentar CPF/email usado pra futura renovação

### 2. Adicionar domínios no Vercel

No painel Vercel do projeto:

**Settings → Domains → Add:**
- `startouch.com.br` (principal)
- `www.startouch.com.br` (Vercel redireciona automaticamente pro principal)
- `reputazap.com` (já existe — manter)
- `www.reputazap.com` (manter)
- `reputazap.com.br` (já existe — manter)
- `www.reputazap.com.br` (manter)

Marcar `startouch.com.br` como **Production** (radio button).

### 3. Configurar DNS

#### Registrar `startouch.com.br` (Registro.br):
Apontar nameservers pra Vercel ou usar A/CNAME records:
- A record `@` → `76.76.21.21`
- CNAME `www` → `cname.vercel-dns.com`

#### Domínio `reputazap.com` (já no Vercel):
Não precisa mexer — o `vercel.json` cuida do redirect 301.

#### Domínio `reputazap.com.br` (Hostinger):
Já está apontado pro Vercel. O `vercel.json` agora redireciona pro `startouch.com.br`.

### 4. Verificar redirect funcionando

Após DNS propagar (até 48h):

```bash
curl -I https://reputazap.com
# esperar: HTTP/2 301
# location: https://startouch.com.br/

curl -I https://reputazap.com/ativar
# esperar: HTTP/2 301
# location: https://startouch.com.br/ativar
```

### 5. Atualizar Resend

Domínio antigo (`reputazap.com`) já foi verificado no Resend. Adicionar `startouch.com.br`:

- Resend Dashboard → Domains → Add Domain
- Inserir `startouch.com.br`
- Copiar records TXT/MX/DKIM
- Adicionar no DNS do Registro.br

Após verificação, setar env var `RESEND_FROM` no Vercel (ver `docs/setup/04_resend_email.md` pra checklist completo).

### 6. Atualizar Google Search Console

- Adicionar `startouch.com.br` como propriedade
- Submeter `https://startouch.com.br/sitemap.xml`
- Configurar redirect no GSC do `reputazap.com` antigo pro novo

### 7. Atualizar Google Analytics / GTM (se houver)

Apontar pra `startouch.com.br`.

---

## ROLLBACK

Se algo der errado, basta:
1. No Vercel, remover `startouch.com.br` da lista de domínios
2. Comentar as 5 primeiras regras de redirect no `vercel.json`
3. Re-deploy

O Vercel volta a servir `reputazap.com` normalmente.
