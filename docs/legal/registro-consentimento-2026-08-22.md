# Registro — desde quando o consentimento de cookies está ativo

**Data do registro:** 22/08/2026
**Responsável:** Ricardo Fiorini (Encarregado pelo Tratamento de Dados Pessoais)

Este documento existe para responder com honestidade a uma pergunta específica:
*desde quando o site pede consentimento antes de ativar cookies de análise e
publicidade?* A resposta não é uma data só.

## Antes de 22/08/2026

Não havia mecanismo de consentimento. Google Analytics 4 e Meta Pixel eram
carregados diretamente no `<head>` de todas as páginas do site e disparavam no
primeiro acesso, sem aviso e sem opção de recusa. Não existia banner, não
existia Consent Mode e não existia página de política publicada.

## As duas datas

| escopo | consentimento ativo desde | commit |
|---|---|---|
| Site em geral — landing, kit, radar, artigos, ativar, radar/plano, demais páginas em `public/` | **22/08/2026, ~17h11** | `bd84725` |
| Painel do cliente — `/app` e `/app-legacy` | **22/08/2026, ~17h18** | `de1acf5` |
| Página de avaliação — `/avaliar` | rastreamento **removido** em 22/08/2026, sem substituto | `8554559` |

## Por que duas datas

O trabalho que instalou o banner (`bd84725`) cobriu as páginas em `public/`, mas
os dois shells do React — `index.html` e `index-v2.html`, que servem `/app` e
`/app-legacy` — ficam na **raiz** do repositório e ficaram de fora do commit por
um erro de escopo do `git add`. Durante cerca de **sete minutos** entre um deploy
e outro, o painel do cliente continuou carregando GA4 e Meta Pixel sem
consentimento, exatamente como antes.

Registrado por precisão, não porque o intervalo seja significativo: o painel já
estava nesse estado desde sempre, e `de1acf5` foi o momento em que **parou**, não
o momento em que começou. Se alguém perguntar desde quando o consentimento está
ativo no painel, a resposta honesta é **22/08/2026, ~17h18** — não a primeira
data.

## O que passou a valer

- GA4 e Meta Pixel só disparam com aceite explícito. Sem decisão: negado, com
  Consent Mode v2 mandando ping sem cookie e sem identificador.
- Recusar tem o mesmo peso e a mesma distância que aceitar (um clique cada).
- Não há aceite por rolagem nem por navegação continuada.
- `/avaliar`, as páginas legais e `/privacidade/solicitacao` não carregam tag
  nenhuma, com ou sem aceite.
