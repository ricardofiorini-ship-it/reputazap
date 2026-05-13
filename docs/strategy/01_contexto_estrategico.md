# MUDANÇA DE DIREÇÃO ESTRATÉGICA — STARTOUCH

## POR QUE ESTAMOS MUDANDO

Descobri 3 problemas críticos no produto atual que justificam
essa virada:

### 1. O produto atual viola a política do Google
O fluxo "Como foi sua experiência? Boa/Média/Ruim" que filtra
clientes baseado em sentimento ANTES de oferecer o link do
Google é classificado como REVIEW GATING pela política oficial
do Google Business Profile.

Política do Google (textual):
"Don't discourage or prohibit negative reviews or selectively
solicit positive reviews from customers."

Consequências reais (não hipotéticas) se mantivermos:
- Google pode REMOVER em massa as reviews dos nossos clientes
- Pode SUSPENDER o Google Business Profile dos clientes
- Cliente lesado pode nos processar
- Em abril/2026 o Google reforçou enforcement com Gemini-powered
  detection — risco aumentou

### 2. O gating é justamente o produto pago — situação indefensável
Hoje, a versão grátis vai direto pro Google (compliant), mas a
versão paga aplica o pré-filtro. Isso significa que cobramos
mensalidade JUSTAMENTE PELO recurso que viola a regra. Do ponto
de vista jurídico e do Google, é o pior cenário: estamos lucrando
com a violação.

### 3. O produto trava nosso crescimento
Cliente premium (Outback, Honda, redes regionais, franquias) tem
departamento jurídico que faz due diligence antes de fechar.
Eles detectam o gating em 5 minutos e abandonam negociação.
Ficamos presos no SMB pequeno pra sempre.

## A NOVA DIREÇÃO

Saímos do produto antigo (proteção contra avaliações negativas
via gating) e vamos pra:

**PLATAFORMA MULTI-FUNCIONAL DE GESTÃO LOCAL**

Vendida pra donos de comércio que compram nossos hardwares OU
que já têm hardware de concorrentes (como AvaliaCard — vamos
suportar isso via "BYOC" no futuro).

### Posicionamento
- AvaliaCard vende CARTÃO (objeto).
- Nós vendemos SISTEMA (plataforma).
- Hardware vira canal de aquisição (margem mínima ou zero).
- Software (mensalidade) vira o negócio de verdade.

### Como diferenciamos os planos
A diferenciação dos planos NÃO acontece mais no fluxo público
(página que o cliente final vê). Acontece no BACKOFFICE (painel
do dono):
- Free: painel básico
- Pro (R$ 49): alerta WhatsApp, IA, recuperador
- Premium (R$ 99): monitor de concorrentes, ranking equipe, clube
- Rede (R$ 297): multi-unidade

**O FLUXO PÚBLICO É IGUAL PRA TODOS OS PLANOS. Sempre.**

## O QUE MUDA NA PRÁTICA (TÉCNICO)

1. REMOVER completamente o pré-filtro de sentimento
   (Boa/Média/Ruim) da CustomerPage.

2. UNIFICAR o fluxo público em 2 botões simétricos pra TODOS
   os planos:
   - ⭐ Avaliar no Google (link direto pro GBP do negócio)
   - 💬 Falar direto com [nome do negócio] (formulário interno
     segmentado: elogio/sugestão/reclamação/dúvida)

3. ELIMINAR qualquer lógica condicional baseada em plano que
   afete o fluxo público.

4. CONSTRUIR módulos pagos novos um por um, sem afobação.
   Cada módulo justifica mensalidade SEM tocar no fluxo público.

5. Features que dependem da Google Business Profile API completa
   ficam pra fase posterior — MVP usa Places API + polling
   (suficiente pra 80% do valor).

## SOBRE O FLUXO DE 2 BOTÕES — CRÍTICO

Cogitei usar apenas 1 botão direto pro Google (zero fricção,
compliance blindado), mas decidi por 2 botões simétricos porque
o canal de feedback privado é o que justifica metade dos módulos
pagos futuros (painel de insights, recuperador de negativas,
análise de sentimento, base pro Clube). Sem ele, viramos
commodity igual ao AvaliaCard.

MAS a SIMETRIA ENTRE OS 2 BOTÕES É CRÍTICA. Eles devem ter:
- Mesmo tamanho
- Mesma proeminência visual
- Microcopy neutra (sem favoritismo)
- Mesma ordem em todas as renderizações
- Sem priorização lógica baseada em plano, status, ou qualquer
  outro critério

Se houver qualquer chance de implementação assimétrica
(favoritismo visual ou textual pro privado), volto pra 1 botão
direto pro Google até garantirmos a simetria.

A escolha de 2 botões vs 1 botão é decisão final do fundador (eu) —
você implementa o que eu confirmar. Não invente meio termo sem
confirmar.

### Estrutura sugerida da tela pública

Headline: "Sua opinião importa pra gente"
[ ⭐ Avaliar no Google                    ]
Compartilhe sua experiência publicamente
[ 💬 Falar direto com [nome do negócio]  ]
Sua mensagem chega direto na nossa equipe


### Formulário do botão privado

Quando cliente clica no botão B, abre formulário:

"Como podemos te ajudar?"
○ 😊 Elogio
○ 💡 Sugestão de melhoria
○ ⚠️ Reclamação
○ ❓ Dúvida

Campo texto: "Conta o que aconteceu..." (opcional)
Campo nome: "Seu nome" (opcional)
Campo contato: "WhatsApp ou e-mail" (opcional)

[ Enviar mensagem ]

IMPORTANTE: depois de enviar, NÃO redirecionar pro Google.
Mostrar mensagem de agradecimento. Compliance prefere que a
escolha seja totalmente do cliente, sem nudge final.

## COMO VAMOS TRABALHAR

DESENVOLVIMENTO MODULAR INCREMENTAL: um módulo de cada vez,
validado, antes de partir pro próximo. Nada de tentar construir
tudo junto.

Ordem inicial proposta:
1. Compliance Google (refatorar fluxo público) ← URGENTE
2. Landing nova com novo posicionamento (em paralelo)
3. Painel básico melhorado
4. Módulos pagos um a um (alerta WhatsApp, IA sugestão, monitor
   de concorrentes, ranking de atendente, clube de fidelidade, etc)

## LANDING

Já pode COMEÇAR A REMODELAR A LANDING refletindo a nova posição:

- Tirar foco de "proteção contra avaliação negativa"
- Trazer foco pra "plataforma multi-funcional pra negócios locais"
- Linguagem: SISTEMA / PLATAFORMA, não CARTÃO / PLACA
- Diferencial central: "100% dentro das regras do Google" —
  vira selo de confiança
- Hardware como entrada (com margem mínima), software como motor
- Arquitetura visual preparada pra suportar múltiplos módulos
  no futuro (Avalia, Clube, Equipe, IA, Monitor, etc)

Pode trabalhar em paralelo:
- Front da landing (você adianta)
- Refatoração do app (em sequência modular)

NÃO espere todos os módulos prontos pra atualizar landing.

Antes de começar a codar a landing nova, ME MOSTRA WIREFRAME OU
MOCKUP pra eu validar a estrutura antes de virar código.

## REGRAS DE OURO

1. Antes de qualquer mudança grande, me mostra o PLANO em quais
   arquivos vão mudar.
2. Espera minha confirmação antes de aplicar.
3. Trabalha por blocos pequenos, fáceis de revisar.
4. Backup git antes de cada bloco grande.
5. Se algo for ambíguo, me pergunta — não assume.
6. Não toca em features ou arquivos que não foram pedidos.
7. Mostra diff antes de aplicar mudança em arquivo existente.

## SOBRE O NOME DA MARCA

Ainda estou decidindo nome final. Por enquanto:
- MANTÉM "StarTouch" no código existente (não troca ainda).
- USA "[Nome da Plataforma]" como placeholder na nova landing.
- Quando decidir o nome novo, fazemos refactor coordenado de
  uma vez (todos os arquivos no mesmo PR).

## SOBRE OS PLANOS PAGOS — FUTURO

Pra você ter contexto (não precisa implementar agora, só pra
desenhar arquitetura preparada):

PRIORIDADE 1 (próximas 4-8 semanas):
- Alerta WhatsApp tempo real (polling Places API)
- Resposta com IA — modo "sugestão" (cliente copia-cola)
- Recuperador de reviews negativas (versão simplificada)
- Relatórios mensais PDF
- Multi-QR por canal

PRIORIDADE 2 (semanas 8-16):
- Monitor de concorrentes (via Places API)
- Análise de sentimento (IA)
- BYOC (cliente cola URL de hardware terceiros)
- Ranking por atendente (URL única por cordão NFC)

PRIORIDADE 3 (semanas 16-24):
- Módulo Clube de Fidelidade (cadastro + cupom WhatsApp +
  gatilhos automáticos)
- Bonificação automática equipe
- Retargeting WhatsApp pós-NFC

PRIORIDADE 4 (semana 24+):
- Multi-unidade (rede)
- Integração Google Business Profile API completa (quando
  aprovada — em paralelo)

## PRIMEIRA TAREFA (URGENTE)

Começa pelo BLOCO 1: refatorar fluxo público pra ficar compliant
com Google.

Tarefas:
- Remover tela "Como foi sua experiência? Boa/Média/Ruim"
- Implementar tela única com 2 botões simétricos (Google +
  Privado)
- Implementar formulário privado segmentado (elogio/sugestão/
  reclamação/dúvida)
- Eliminar qualquer lógica condicional baseada em plano que
  afete o fluxo público
- Garantir simetria visual e textual entre os 2 botões
- Manter dados existentes preservados
- Adicionar/atualizar analytics (clique em cada botão, envio
  de formulário, tipo de mensagem)

ANTES DE TOCAR EM QUALQUER ARQUIVO:
1. Me mostra a estrutura de pastas atual do projeto
2. Me lista os arquivos que vão precisar ser modificados
3. Me mostra o PLANO de mudança em cada arquivo
4. Espera minha confirmação antes de aplicar

Em paralelo (BLOCO 2), pode ir já fazendo wireframe/mockup
da nova landing pra eu validar antes de codar.

Vamos lá. Me mostra primeiro a estrutura do projeto e o plano
de arquivos pro Bloco 1.
