# Documentos legais — fonte única

Os `.md` desta pasta são a **fonte**. As páginas `/privacidade` e `/termos` são
**geradas a partir daqui** — não editar o HTML direto, senão o documento e a
página divergem (foi o que aconteceu com `AGENTS.md` e `CLAUDE.md`).

| arquivo | vira |
|---|---|
| `politica-de-privacidade.md` | `startouch.com.br/privacidade` |
| `termos-de-uso.md` | `startouch.com.br/termos` |

## Estado atual

**PUBLICADOS E VIGENTES desde 22 de agosto de 2026.** O bloco de rascunho saiu,
a data de vigência foi gravada e as páginas passaram a sair com `index,follow`.

As três travas caíram antes da publicação, e cada uma tem prova própria:

| trava | o que comprova |
|---|---|
| **1** — rastreamento fora da `/avaliar` | Verificado no HTML servido em produção: 0 ocorrências de `fbq`, `gtag`, `googletagmanager` e `facebook`. Controle positivo na `/landing` no mesmo formato (`fbq: 6`, `gtag: 5`), provando que a sonda enxergava. Commit `8554559`. |
| **2** — expurgo rodando de verdade | Execução **real** (não ensaio) gravou 5 linhas em `retention_runs` — uma por tabela, `erro` nulo em todas, timestamps sequenciais em 22/08/2026 21:14. O ensaio `?dry=1` foi recusado como prova porque não exercita o caminho de escrita; a decisão achou um defeito real na contagem, corrigido em `d28f2be`. Commits `17e9e22` e `d28f2be`. |
| **3** — `privacidade@` recebendo | Testado ponta a ponta com mensagem externa. Resend envia (`send.`), ImprovMX recebe (`@`). `DPO_EMAIL` configurada na Vercel. |

O canal do titular (`/privacidade/solicitacao`) está operante: `titular_requests`
criada com RLS ligada e 0 policies, conferida no banco.

## Checklist de publicação

Na ordem. Os itens 1 e 2 são pré-requisitos do texto: publicar antes deles
transforma os documentos em declaração falsa, que é pior do que não ter
documento nenhum.

- [x] **1. Rastreamento fora da `/avaliar`** — Política §4.2 e Termos cl. 9
      afirmam que a página intermediária não carrega cookie de análise ou
      publicidade. Feito no commit `8554559` (LGPD rodada 1).
- [x] **2. Rotina de expurgo no ar** — a tabela de retenção da Política §9
      promete prazos (cache 30 dias, IP 30 dias, funil 12 meses, log de e-mail
      12 meses, leads 24 meses). Sem cron rodando, são prazos que nenhum log
      comprova. O log de execução é a prova de cumprimento.
- [x] **3. `privacidade@startouch.com.br` recebendo de verdade** — ✅ **concluída
      em 22/08/2026.** Arquitetura de e-mail do domínio: **Resend envia** (pelo
      subdomínio `send.`, com SPF e DKIM próprios), **ImprovMX recebe** (dois MX
      + SPF no `@`). Testado ponta a ponta: mensagem externa chega em
      `privacidade@`. O "Enable Receiving" do Resend segue **desligado** — ligá-lo
      pediria um MX no `@` que sequestraria a recepção do domínio.
      *Contexto:* antes disso o domínio raiz não tinha MX nenhum, e o prazo de 15
      dias do Art. 18 correria contra um endereço que dava bounce.
- [x] **4. Cabeçalho de rascunho trocado pela data real** — feito em 22/08/2026,
      depois das travas 2 e 3, como previsto. Data de vigência é declaração
      jurídica, não carimbo de deploy: publicar antes das travas criaria o
      problema que o documento resolve.
- [x] **5. Religar os 3 links que apontavam para `#`** — rodapé da landing (2) e
      o aceite de cadastro em `ativar.html`. Um "você concorda com os Termos"
      apontando para `#` é aceite de documento inexistente. Commit `bd470ab`.
- [x] **6. Rewrites no `vercel.json`** — `/privacidade`, `/termos` e
      `/privacidade/solicitacao`. Commits `bd470ab` e `f3d3cf6`.

## Ao alterar um documento depois de publicado

Subir a versão no topo, registrar a data e manter o histórico — a própria
Política (§12) promete que alterações são registradas. O histórico é o `git log`
desta pasta; é por isso que estes arquivos vivem no repositório e não em
`~/Downloads`.
