# Pendências

Achados fora do escopo do trabalho em curso. Uma linha cada, sem investigação.
Registrados para não se perderem — não são tarefas ativas.

- Mapear todas as policies do schema `public` com `roles` contendo `public` ou `anon` — a de `feedbacks` pode ter irmãs (22/08/2026).
- ~~Painel legado `/app-legacy`~~ **MORTO em 21/09/2026** — arquivos apagados, rota virou redirect pro `/app`, e os links pro SKU placeholder do Mercado Livre foram junto.
- `email_log` não registra envios administrativos — detalhe na seção Pendências do `CLAUDE.md` (22/08/2026).
- Tabela `feedbacks` não tem policy de SELECT: escreve-se e não se lê pela chave anônima (22/08/2026).
- Script SQL multi-bloco pode aplicar parcialmente no SQL Editor; conferir cada bloco depois de rodar (22/08/2026).
