# Agente de melhorias — manual de operação

Este arquivo é lido pelo agente no início de **toda** execução. Ele roda sozinho,
em horário agendado, numa máquina limpa, sem memória das execuções anteriores.
O que ele sabe sobre o projeto vem do `CLAUDE.md`; o que ele deve fazer vem daqui
e do `docs/agente/BACKLOG.md`.

**Objetivo:** pegar UM item da fila, implementar bem, provar que funciona e entregar
como pull request para o Ricardo aprovar. O Ricardo decide o que vai ao ar. O agente nunca.

---

## Regra nº 0 — o agente nunca publica

O deploy deste projeto é `git push origin main` → Vercel → produção, com clientes
pagantes, Stripe e dados sob LGPD. Portanto:

- **Nunca** dar push na `main`, nunca fazer merge, nunca `push --force`.
- Todo trabalho vai num branch `agente/<assunto-curto>` e termina num **pull request**.
- O merge é do Ricardo, sempre.

---

## Roteiro de cada execução

### 1. Ler antes de tudo
1. `CLAUDE.md` inteiro — principalmente **Princípios** e **Status atual (LGPD)**.
2. Este arquivo.
3. `docs/agente/BACKLOG.md`.

### 2. Ver o que já está em aberto
Listar PRs abertos do agente (REST; GraphQL não funciona nesta sessão):

```bash
gh api "repos/ricardofiorini-ship-it/reputazap/pulls?state=open&per_page=50" \
  --jq '.[] | select(.head.ref | startswith("agente/")) | "\(.number) \(.head.ref) \(.title)"'
```

- **Algum PR do agente tem comentário do Ricardo ainda não atendido?** Essa é a
  tarefa da vez: fazer checkout do branch, atender o comentário, rodar a validação,
  dar push no mesmo branch e responder no PR o que mudou. Não abrir trabalho novo.
- **Já existem 2 ou mais PRs do agente abertos?** Não começar nada. Encerrar com
  um resumo dizendo que a fila está esperando revisão. PR empilhado sem revisão
  vira conflito e retrabalho.

### 3. Escolher o item
- O **primeiro** item com status `pronto` na seção **Fila**, de cima para baixo.
- Itens `decidir` ou `ricardo` **não são tocados** — dependem de decisão ou de ação
  fora do código (SQL no Supabase, painel do Stripe, env na Vercel).
- **Um item por execução.** Se o item for grande demais para um PR revisável
  (regra prática: mais de ~400 linhas alteradas ou mais de um assunto), fazer só a
  primeira fatia e escrever no PR o que falta.
- **Fila sem nenhum `pronto`?** Fazer uma rodada de revisão (ver seção abaixo).

### 4. Preparar o ambiente
```bash
git fetch origin main && git checkout -B agente/<assunto> origin/main
npm ci
```
`npm ci` é obrigatório: a pasta `node_modules` versionada no git está incompleta e
o build falha sem a instalação limpa.

### 5. Implementar
- Seguir os princípios do `CLAUDE.md` à risca. Em especial:
  - **Falha silenciosa é o bug nº 1** — proteção nova precisa avisar quando está desligada.
  - **Sonda que dispara ação retenta** antes de concluir.
  - **Toda verificação leva controle positivo e negativo.**
  - **Toda tabela nova nasce com RLS ligada e policies explícitas.**
  - **Quem carrega GA4/Pixel é o `/consent.js`, e só ele.**
- Mudou texto em português de página traduzida? Atualizar os dicionários
  (`node scripts/i18n.mjs extract <pagina>`), senão o build barra.
- Mudou um e-mail? Atualizar as fixtures (`scripts/email-fixtures.mjs`).
- Mexeu em coisa que o `CLAUDE.md` documenta? Atualizar o `CLAUDE.md` no mesmo PR,
  no estilo dele (data, motivo, o que não é óbvio).

### 6. Provar que funciona
Obrigatório, nesta ordem:
1. `npm test` (quando existir) — **passa**.
2. `npm run build` — **passa**, inteiro, com todas as guardas.
3. Lógica nova ou alterada → **teste automatizado novo** que falha sem a mudança e
   passa com ela. Dizer no PR que conferiu as duas coisas.
4. Mudança visual → descrever exatamente o que conferir no preview da Vercel
   (página, passo a passo, o que deve aparecer).

**Proibido** desligar, afrouxar ou contornar uma guarda (`scripts/check-*`,
`i18n.mjs check`, testes) para o build passar. Guarda que barra é guarda funcionando:
conserte a causa. Se a guarda estiver errada, isso é um item separado, `decidir`.

### 7. Entregar
- `git add` **só dos arquivos que você alterou, um por um.** Nunca `git add -A`,
  `git add .` ou `git add node_modules` — a pasta está versionada e o `npm ci`
  mexe em milhares de arquivos dela.
- Commit em português, no estilo do histórico (`fix(area): ...`, `feat(area): ...`).
- `git push -u origin agente/<assunto>`
- Abrir o PR pela API REST:
  ```bash
  gh api repos/ricardofiorini-ship-it/reputazap/pulls \
    -f title="..." -f head="agente/<assunto>" -f base="main" -F body=@/caminho/corpo.md
  ```
- Pôr a etiqueta `agente` (e `sensivel` quando couber — ver abaixo):
  ```bash
  gh api repos/ricardofiorini-ship-it/reputazap/issues/<n>/labels -f "labels[]=agente"
  ```
- No mesmo PR, mover o item no `BACKLOG.md` de `pronto` para `em PR #<n>`.

**Corpo do PR — sempre estes blocos:**
```
## O que mudou
## Por quê
## Como testei
(comandos rodados e resultado; testes novos; controle positivo/negativo)
## Risco
(o que pode quebrar em produção e como perceber)
## O que o Ricardo precisa fazer
(SQL para rodar, env na Vercel, painel do Stripe, conferir no preview — ou "nada além de revisar")
```

---

## Etiqueta `sensivel` — exige atenção redobrada do Ricardo
Marcar o PR com `sensivel` e dizer no topo do corpo **por quê**, sempre que tocar em:
- pagamento: `api/billing.js`, `api/_lib/menu-extras.js`, `api/_lib/frenet.js`, checkout, preços, frete;
- autenticação, permissões, admin, RLS, policies;
- qualquer coisa que **colete, guarde ou apague dado pessoal** (LGPD);
- `api/r/[code].js`, `api/t/[code].js` — o redirect das placas que estão na mão dos clientes;
- `vercel.json`, crons, retenção.

## Nunca, em hipótese nenhuma
- Push na `main`, merge, force push, apagar branch que não seja seu.
- Rodar SQL no Supabase ou chamar endpoint de produção que grave, envie e-mail ou cobre.
  SQL novo vai **como arquivo** em `supabase/` e entra em "O que o Ricardo precisa fazer".
- Criar, ler, mudar ou expor variável de ambiente, chave ou segredo.
- Alterar `docs/legal/` (Termos, Política) sem o item pedir explicitamente — e, se
  pedir, o PR leva `sensivel` e destaca a mudança jurídica.
- Acrescentar rastreamento, pixel, cookie ou coleta de dado novo.
- Pôr nome de cliente, e-mail, ID de assinatura ou qualquer dado real em commit,
  PR ou issue. **Este repositório é público.**
- Inventar melhoria fora da fila e implementar. Ideia própria vira **sugestão** (abaixo).

## Dúvida ou bloqueio
Não chutar. Abrir uma issue com a etiqueta `agente-duvida`, título claro, e no corpo:
o item, o que está ambíguo, as opções que você vê e qual recomendaria. Depois marcar
o item como `decidir` no `BACKLOG.md` (num PR pequeno só com essa mudança) e encerrar.

## Rodada de revisão (quando a fila não tem `pronto`)
Escolher **uma** área do código (rotação sugerida: `api/` → `src/` → `public/` →
`scripts/`), procurar problemas reais — falha silenciosa, erro não tratado, código
morto, texto quebrado, risco de LGPD, lentidão — e acrescentar **até 3 sugestões**
na seção **Sugestões do agente** do `BACKLOG.md`, cada uma com: o problema, onde
(`arquivo:linha`), por que importa e o tamanho estimado. PR só com essa mudança,
etiqueta `agente`. **Não implementar** — o Ricardo promove para a fila se quiser.

## Fim da execução
Terminar sempre com um resumo curto: o que foi feito, o número do PR (ou da issue),
e o que espera do Ricardo. Se não fez nada, dizer por quê.
