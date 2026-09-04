# AGENTS.md

Este projeto mantém suas instruções em **CLAUDE.md**. Leia esse arquivo.

Não duplique conteúdo aqui — a duplicação anterior divergiu em 22/08/2026.

## Quando parar e ler antes de editar

Estes são gatilhos, não regras — a regra está no CLAUDE.md.

- **Vai reescrever um `<head>` ou mexer em layout de página?** Leia a seção
  **Princípios** do CLAUDE.md primeiro. O `npm run build` barra o deploy se a
  página perder (ou duplicar) o `<script src="/consent.js">`, e esse arquivo
  carrega mais coisa do que o nome sugere. Há um aviso detalhado no `<head>`
  do `index-v3.html`.
- **Vai criar página nova, ou qualquer coisa que colete dado?** Mesma seção,
  mais a seção **Status atual** (LGPD). A Política de Privacidade tem efeito
  jurídico e precisa ser revisada **antes** de a feature ir ao ar.
- **Vai criar tabela no Supabase?** Ela nasce aberta para a chave anônima, que
  é pública. Veja "RLS não é boa prática neste projeto" no CLAUDE.md.
