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
- [ ] **3. `privacidade@startouch.com.br` recebendo de verdade** — o domínio
      raiz não tinha MX (só `send.` para envio via Resend). Sem caixa que
      recebe, o prazo de 15 dias do Art. 18 corre contra um endereço que dá
      bounce. Manter "Enable Receiving" **desligado** no Resend: a recepção vem
      do provedor no MX do domínio raiz.
- [ ] **4. Trocar o cabeçalho de rascunho pela data real — ÚLTIMO PASSO, depois
      das travas 2 e 3.** Data de vigência é declaração jurídica, não carimbo de
      deploy: política vigente com canal de titular que dá bounce cria o
      problema que o documento resolve. Enquanto o bloco de rascunho estiver
      nos `.md`, as páginas saem com `noindex` e o aviso visível. Remover o bloco
      `⚠️ RASCUNHO` dos dois arquivos e preencher `[DATA DE PUBLICAÇÃO]` com a
      **data do deploy**, não a data em que o texto foi escrito. Uma política
      que entra em vigor antes de existir na web não se sustenta.
- [ ] **5. Religar os 3 links hoje apontando para `#`** — rodapé da landing
      (2 links) e o aceite de cadastro em `ativar.html`. Um "você concorda com
      os Termos" apontando para `#` é aceite de documento inexistente.
- [ ] **6. Rewrites no `vercel.json`** — `/privacidade` e `/termos`.

## Ao alterar um documento depois de publicado

Subir a versão no topo, registrar a data e manter o histórico — a própria
Política (§12) promete que alterações são registradas. O histórico é o `git log`
desta pasta; é por isso que estes arquivos vivem no repositório e não em
`~/Downloads`.
