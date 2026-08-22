# Documentos legais — fonte única

Os `.md` desta pasta são a **fonte**. As páginas `/privacidade` e `/termos` são
**geradas a partir daqui** — não editar o HTML direto, senão o documento e a
página divergem (foi o que aconteceu com `AGENTS.md` e `CLAUDE.md`).

| arquivo | vira |
|---|---|
| `politica-de-privacidade.md` | `startouch.com.br/privacidade` |
| `termos-de-uso.md` | `startouch.com.br/termos` |

## Estado atual

**RASCUNHO, não publicado.** Os dois arquivos abrem com um bloco de aviso que
diz isso. Enquanto o bloco estiver lá, o documento não vale.

## Checklist de publicação

Na ordem. Os itens 1 e 2 são pré-requisitos do texto: publicar antes deles
transforma os documentos em declaração falsa, que é pior do que não ter
documento nenhum.

- [x] **1. Rastreamento fora da `/avaliar`** — Política §4.2 e Termos cl. 9
      afirmam que a página intermediária não carrega cookie de análise ou
      publicidade. Feito no commit `8554559` (LGPD rodada 1).
- [ ] **2. Rotina de expurgo no ar** — a tabela de retenção da Política §9
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
- [ ] **4. Trocar o cabeçalho de rascunho pela data real — ÚLTIMO PASSO, depois
      das travas 2 e 3.** Data de vigência é declaração jurídica, não carimbo de
      deploy: política vigente com canal de titular que dá bounce cria o
      problema que o documento resolve. Enquanto o bloco de rascunho estiver
      nos `.md`, as páginas saem com `noindex` e o aviso visível. Remover o bloco
      `⚠️ RASCUNHO` dos dois arquivos e preencher `[DATA DE PUBLICAÇÃO]` com a
      **data do deploy**, não a data em que o texto foi escrito. Uma política
      que entra em vigor antes de existir na web não se sustenta.
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
