# Laudo do IA Radar — contrato de dados e narrativa

> **Para quem for redesenhar esta tela (humano ou ChatGPT):** leia isto antes de
> desenhar qualquer coisa. A landing (`/radar`) é texto e layout — uma maquete
> visual funciona. **Esta tela não.** Cada elemento aqui está amarrado a um campo
> que o backend devolve. Uma maquete feita sem este contrato vai colidir: a
> maquete da landing chegou com 12 dos 32 identificadores que o script usa e, se
> aplicada ao pé da letra, teria apagado o formulário de lead e o botão de
> pagamento.
>
> **Regra de ouro:** o dado é o argumento. Decida o que a tela vai *dizer* antes
> de decidir como ela vai *parecer*.

---

## 0. CORREÇÃO IMPORTANTE (descoberta em 09/07, depois da 1ª versão deste doc)

**O `#reportMode` de `radar.html` NÃO é a tela de resultado que o cliente vê.**
Ao terminar o diagnóstico, `run()` faz:

```js
if (data.code) {                       // caso normal: o banco respondeu
  window.location.href = "/radar/plano?code=" + data.code + "&origem=" + origem;
  return;                              // ← nunca chega no relatório embutido
}
renderReport(data, selectedBiz.name);  // fallback: só quando NÃO há code
```

Ou seja: o laudo de 9 passos só aparecia quando o banco estava fora do ar. **A
tela de resultado real é o `/radar/plano`** (Bloco A = impacto, Bloco B =
auditoria, Bloco C = oferta). E a venda que vivia no passo 9 já era inalcançável
no caminho normal.

Consequências, já aplicadas:
- O cartão de prova (a resposta literal da IA) foi para o **Bloco A do
  `/radar/plano`**, não para o `radar.html`.
- O checkout do pacote **mudou-se do laudo para o `/radar/plano`** — antes era o
  único caminho de pagamento do produto e estava numa tela morta.
- O `#reportMode` foi encolhido para 3 passos e continua existindo **como
  fallback resiliente**: mesmo caminho narrativo (fato → medida →
  encaminhamento), sem venda.

O resto deste documento vale como escrito, com essa substituição de endereço.

---

## 1. Onde estamos e o que está errado

O resultado do diagnóstico *era* apresentado em `public/radar.html`, no bloco
`#reportMode`, como um percurso de **9 passos** (ver §0: ele só rodava como
fallback):

| Passo | Conteúdo |
|---|---|
| 1 | Nome do negócio + cidade/bairro |
| 2 | Score 0–100, o que significa, concorrentes, motores de IA (acordeão) |
| 3 | O método dos 6 meses |
| 4 | Kit NFC de brinde |
| 5 | Quanto vale |
| 6 | Oferta de lançamento |
| 7 | Parcelamento |
| 8 | Formulário de lead + botão de pagamento |
| 9 | "Testar outro negócio" |

Três problemas, em ordem de gravidade.

### 1.1 A prova está escondida

O backend já devolve, **para cada pergunta feita a cada IA**: a pergunta exata, a
resposta literal, se o negócio foi citado, e quais concorrentes foram citados no
lugar dele. O front até destaca os concorrentes em negrito e o negócio em azul.

Isso está atrás de um acordeão fechado, sob a legenda *"Por motor de IA · toque
pra ver perguntas e respostas"*, renderizado em cinza itálico de 12,5px.

É o ativo mais valioso do produto tratado como nota de rodapé. **Um score é uma
opinião nossa. A resposta da IA é um fato.** O fato deve liderar.

### 1.2 A cura é genérica

Os passos 3 a 7 são idênticos para a padaria e para a clínica veterinária. Não
citam um único ajuste específico daquele negócio. É um folheto, não um plano de
tratamento — e contradiz a tese da StarTouch, que é *"conhecemos os ajustes que
a SUA empresa precisa"*.

### 1.3 O remédio é vendido em dois lugares

Os passos 3–7 vendem o pacote. O `/radar/plano` **também** vende o pacote, com
auditoria de verdade (site + perfil do Google) e a mesma oferta. São dois
discursos concorrentes, escritos em momentos diferentes, que podem divergir sem
ninguém notar.

---

## 2. A narrativa proposta

Cada momento da metáfora tem um dono natural:

| Momento | Página | Trabalho |
|---|---|---|
| **Exame** | `/radar` (landing) | Convencer a fazer o diagnóstico. *Pronto e aprovado.* |
| **Laudo** | `#reportMode` | **Doer.** Mostrar o fato, quantificar, encaminhar. |
| **Tratamento** | `/radar/plano` | Auditoria personalizada + oferta. **Vender aqui, e só aqui.** |

Isso encolhe o laudo de 9 passos para ~3 e resolve a duplicação de discurso de
graça.

### O laudo, passo a passo

**Passo 1 — O fato.** Abre com **uma resposta real de IA**, escolhida por ser a
mais dolorosa: aquela em que o negócio *não* foi citado e concorrentes foram.
Mostra a pergunta ("Qual a melhor clínica veterinária na Lapa, São Paulo?"), o
nome do motor ("ChatGPT respondeu hoje"), e o texto da resposta com os
concorrentes destacados. O silêncio sobre o negócio do dono é o argumento.

Se o negócio *foi* citado em tudo, a tela vira outra: "você já aparece —
mantenha a posição". Ver §4 (estados).

**Passo 2 — A medida.** Só agora o número. "Citado em 2 de 18 buscas." Quem
apareceu no seu lugar, com quantas vezes cada um. Quais motores rodaram (só os
que rodaram — regra de negócio existente).

**Passo 3 — O encaminhamento.** Um único convite: *ver o que dá pra fazer* →
`/radar/plano?code=…`. Sem preço, sem oferta, sem brinde. O tratamento se explica
na página do tratamento.

---

## 3. Contrato de dados (o que EXISTE hoje)

`POST /api/radar` responde exatamente isto:

```jsonc
{
  "code": "abc123",          // pode ser null (banco off) → sem link do plano
  "score": 11,               // 0–100, taxa de menção. NÃO é ranking.
  "mencoes": 2,              // em quantas respostas o negócio foi citado
  "total": 18,               // quantas perguntas foram feitas no total
  "concorrentes": [          // consolidado, ordenado por frequência, MÁX 5
    { "name": "Clínica X", "n": 7 }
  ],
  "diagnostico": "texto…",   // parágrafo gerado; hoje é o "o que isso significa"
  "porMotor": {
    "openai": {
      "mencoes": 1,
      "total": 6,
      "concorrentes": ["Clínica X", "Vet Y"],
      "itens": [
        {
          "pergunta": "Qual a melhor clínica veterinária na Lapa, São Paulo?",
          "resposta": "texto da IA, truncado em 800 caracteres com reticências",
          "mencionado": false,
          "concorrentes": ["Clínica X", "Vet Y"]
        }
      ]
    }
    // "gemini", "perplexity" — SÓ os motores que de fato rodaram
  },
  "local": { "cidade": "São Paulo", "bairro": "Lapa" },
  "place_id": "ChIJ…",       // pode ser null
  "site": "https://…"        // pode ser null
}
```

**Limites reais, não negociáveis pelo design:**

- `resposta` vem **truncada em 800 caracteres** (`excerpt()` em
  `api/_lib/radar/score.js`; era 480 até 09/07). Um layout que precise da
  resposta inteira exige mudar o backend — decisão consciente, não acidente de CSS.
- `concorrentes` (topo) traz **no máximo 5**, já ordenados por frequência.
- `porMotor` só contém motores que responderam. **Regra de transparência: nunca
  exibir um motor que não rodou.** Falha de um motor não derruba o diagnóstico.
- `code` pode ser `null`. Sem ele **não há link pro `/radar/plano`** — o laudo
  precisa de um estado de fallback que não prometa o que não pode entregar.
- `score` é **taxa de menção**, não posição em ranking. Nunca rotular como
  "sua posição" ou "seu lugar".

### O que o `/radar/plano` já tem (e o laudo não deve duplicar)

`GET /api/audit?place_id=…` devolve `{ business, site:{detected,url}, groups,
summary, pendencias }` — a auditoria real do site e do perfil do Google. É a
matéria-prima do tratamento personalizado. O laudo **não** deve chamar isso: é
lento e é o argumento da página seguinte.

---

## 4. Estados que a tela precisa cobrir

Um design que só desenha o caso "não apareceu" quebra nos outros três.

| Estado | Quando | O que a tela diz |
|---|---|---|
| **Ausente** | `mencoes === 0` | O caso mais forte. Lidera com a resposta que ignora o negócio. |
| **Parcial** | `0 < mencoes < total` | "Aparece em algumas buscas, não em outras." Mostra uma resposta que cita e uma que não. |
| **Presente** | `mencoes === total` | Não fingir problema. "Você aparece hoje — o trabalho é manter." Honestidade é regra de negócio. |
| **Sem link** | `code === null` | Laudo completo, mas o CTA pro plano some (ou vira contato). Não prometer link quebrado. |

Também: `bairro` pode ser vazio (as perguntas mudam de forma), `site` pode ser
`null`, e um motor pode ter `itens: []`.

---

## 5. Identificadores INTOCÁVEIS

O script de `public/radar.html` (bloco `<script>` no fim do arquivo) exige **34
IDs**. Remover qualquer um faz o script morrer na inicialização e a página
inteira fica inerte — sem autocomplete, sem botão.

⚠️ **Atenção ao buscar:** 32 aparecem como `$("nomeDoId")` e são fáceis de achar
com busca de texto. Os outros dois — `loadingMode` e `reportMode` — só aparecem
dentro de `show()`, referenciados por variável. Um levantamento por busca simples
não os encontra, e apagá-los quebra a troca de telas.

Da busca (não mexer, a landing já está aprovada):
`searchMode`, `cep`, `nome`, `bizResults`, `bizConfirm`, `bizConfirmName`,
`bizConfirmAddr`, `bizReset`, `produtos`, `goBtn`, `searchErr`, `headerCta`

Do carregamento: `loadingMode`

Do laudo (os que o redesenho vai tocar):
`reportMode`, `repName`, `repLocal`, `repScore`, `repScoreBar`, `repDiag`,
`repComp`, `repCompWrap`, `repEngines`, `repTransparency`,
`stepNow`, `stepTotal`, `stepBack`, `stepNext`, `stepBarFill`, `againBtn`

Da venda (candidatos a **sair** do laudo e viver só no `/radar/plano`):
`leadNome`, `leadWhats`, `leadEmail`, `leadErr`, `contratarBtn`

**Se um ID for removido, o `addEventListener` correspondente no script tem que
sair junto.** Não existe "só apagar do HTML".

Outras dependências invisíveis:
- `#bizResults` e `#bizConfirm` são mostrados/escondidos pela classe `on`.
  Não são caixas de texto estáticas.
- As três seções (`searchMode`/`loadingMode`/`reportMode`) trocam pela classe
  `hidden`. **Todo conteúdo novo tem que ficar dentro da seção certa**, senão
  aparece por cima das outras.
- `#goBtn` nasce `disabled` e só é liberado quando o dono escolhe o negócio.
- `#headerCta` é `<button>`, não link: o script escuta o clique pra voltar ao
  formulário. Virar âncora quebra o retorno.

---

## 6. Regras de copy (valem em toda a página)

- **Nunca** escrever "SEO", "Schema", "GEO", "JSON-LD" ou nome de tecnologia.
  Use *ajustes técnicos*, *estrutura do site*, *presença digital*, *sinais de
  confiança*. O usuário compra resultado, não tecnologia.
- **Nunca** prometer que a empresa será indicada pela IA. Ninguém controla a
  resposta de uma IA. Prometemos *fortalecer sinais* e *aumentar chances*.
- Não transmitir "faça um teste". Transmitir: *"vamos descobrir o que está
  impedindo sua empresa de ser mais recomendada e mostrar como isso pode ser
  melhorado."*
- O `score` é **taxa de menção**. Nunca chamar de posição, nota ou ranking.

---

## 7. Ordem de trabalho sugerida

1. Aprovar esta narrativa (§2) e os estados (§4). *Decisão do Ricardo.*
2. Decidir se a resposta da IA continua truncada em 480 caracteres ou se o
   backend passa a guardar o texto inteiro. *Afeta o impacto do passo 1.*
3. Decidir se a venda sai do laudo e vai toda pro `/radar/plano`. *Se sim, os 5
   IDs de venda saem do HTML **e** do script.*
4. Só então desenhar. Maquete visual pode vir do ChatGPT, desde que respeite §3,
   §4, §5 e §6.

---

*Escrito em 2026-07-09. Fonte: leitura de `public/radar.html`, `api/radar.js`,
`api/_lib/radar/score.js`, `api/audit.js` e `public/radar-plano.html`.*
