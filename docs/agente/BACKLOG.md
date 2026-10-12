# Backlog do agente

Fila de trabalho do agente de melhorias (manual: `docs/agente/AGENTE.md`).
**O Ricardo controla a ordem.** O agente pega o primeiro `pronto` de cima para baixo.

Status:
- `pronto` — o agente pode pegar.
- `decidir` — falta uma decisão do Ricardo. O agente não toca.
- `ricardo` — depende de ação fora do código (SQL, painel, env). O agente não toca.
- `em PR #n` — já entregue, esperando revisão.

Para pedir algo novo: acrescente um item na Fila com status `pronto` e uma frase
dizendo **o que** e **por quê**. Quanto mais claro o "pronto quando…", melhor o resultado.

---

## Fila

### 1. Criar a base de testes automatizados — `pronto`
**O quê:** criar `npm test` usando o test runner nativo do Node (`node --test`, sem
dependência nova) e escrever os primeiros testes das regras puras mais críticas:
- `api/_lib/plates.js` — formato do código (`STAR-` + letra do produto + 5), letra certa por tipo, tipo sem letra dá erro alto;
- `api/_lib/menu-extras.js` — limite de 5 dispositivos, cobrança do extra, assinaturas fundadoras sem limite;
- `api/_lib/toque-repetido.js` — mesmo aparelho/código/dia gera a mesma chave; dia diferente gera outra;
- regra do frete grátis a partir de R$ 149 em produtos, sem contar o frete (`FRETE_GRATIS_ACIMA_CENTAVOS` em `api/billing.js`).

Encaixar o `npm test` no começo do `npm run build`, para barrar deploy com teste quebrado.
Se alguma função não puder ser testada sem banco/rede, extrair a parte pura — sem mudar comportamento.
**Por quê:** hoje "testado" significa só "o build passou". Sem testes, o agente não consegue provar que não quebrou nada.
**Pronto quando:** `npm test` roda, todos passam, e cada teste foi visto falhando ao quebrar a regra de propósito.

### 2. `email_log`: parar de engolir erro de gravação — `pronto`
**O quê:** em `api/_lib/email-sender.js`, conferir o `{ error }` devolvido pelo insert no `email_log` e logar com `console.error` quando falhar (hoje a falha é muda — nem o `catch` dispara). Só a parte (a) da pendência 3 do `CLAUDE.md`.
**Por quê:** princípio nº 1 do projeto — falha silenciosa.
**Pronto quando:** teste prova que um `{ error }` vira log; envio do e-mail continua igual.

### 3. Atualizar o `CLAUDE.md` sobre as contas Google Ads canceladas — `pronto`
**O quê:** o `CLAUDE.md` ainda lista como pendente "remover os disparos diretos pras contas Ads canceladas", mas os IDs já não aparecem em nenhum código do site (só no `CLAUDE.md` e em `docs/diagnostico-tracking-2026-07-05.md`). Confirmar com busca (controle positivo: o próprio `CLAUDE.md` contém os IDs), achar no `git log` o commit que removeu, e marcar o item como feito com a data.
**Por quê:** documentação que diz "pendente" para coisa feita faz o próximo trabalho começar errado.
**Pronto quando:** `CLAUDE.md` reflete o estado real, com a referência do commit.

### 4. Tirar `node_modules` do git — `pronto`
**O quê:** `git rm -r --cached node_modules` (a pasta já está no `.gitignore`, mas continua versionada — ~6.400 arquivos, incompleta: o build falha sem `npm ci`). A Vercel instala as dependências sozinha pelo `package-lock.json`.
**Por quê:** clone pesado, diffs poluídos e risco de commitar lixo por engano.
**Pronto quando:** `git ls-files node_modules` volta vazio, `npm ci && npm run build` passa num clone limpo. PR com etiqueta `sensivel` (mexe no deploy) e instrução para o Ricardo conferir o preview da Vercel antes do merge.

### 5. Fusão do painel: trazer "Resultados" do V3 para o `/app` — `pronto`
**O quê:** próximo passo da fusão descrita na pendência 1 do `CLAUDE.md`: a tela de desempenho por dispositivo vira aba do `/app`, **importada do V3, nunca copiada**, conferindo CSS global antes de importar.
**Por quê:** é o par natural do Menu Inteligente, que já foi.
**Pronto quando:** aba funcionando no `/app`, V3 continua igual, i18n do painel atualizado, PR com roteiro de conferência no preview.

### 6. `email_log`: e-mails de admin nunca são logados — `decidir`
`billing.js` manda `"admin"` para a coluna `user_id UUID NOT NULL`. Precisa decidir: permitir `user_id` nulo para e-mails administrativos (SQL) ou logar admin em outro lugar.

### 7. Alinhar nomes dos eventos de lead no GA4 — `decidir`
`generate_lead`/`diag_report` vs `radar_lead`/`plano_view` (item 2 da faxina de analytics). Mexe em conversão do Google Ads — decidir quais nomes ficam antes.

### 8. Mapear policies RLS abertas para `anon`/`public` — `ricardo`
Exige rodar consulta no Supabase. Ver `docs/PENDENCIAS.md`.

---

## Sugestões do agente
_(O agente acrescenta aqui o que encontrar nas rodadas de revisão. O Ricardo promove para a Fila o que quiser.)_

---

## Feito
_(Itens com PR aprovado e publicado.)_
