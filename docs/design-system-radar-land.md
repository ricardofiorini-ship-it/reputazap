# Design System — IA Radar Land (StarTouch)

> Para o ChatGPT: **refine a landing DENTRO deste design system.** Não invente
> paleta, fontes ou componentes novos — use os tokens abaixo. Estilo-alvo:
> institucional, limpo, premium, inspirado em Google / Linear. Mobile-first.

## Princípios
- Mobile-first. Cada bloco precisa funcionar e ser claro no celular primeiro.
- Visual limpo, muito respiro (espaço em branco), sem poluição.
- Azul Google como cor de marca. Fundo branco. Tipografia preta/cinza.
- Hero = foco em UMA ação (iniciar diagnóstico). Sem mockups/cards no hero.
- Emoji é aceitável como ícone rápido; ícones em SVG simples também.

## Cores (HEX)
**Marca**
- Azul principal: `#1A73E8`
- Azul hover: `#4285F4`
- Azul claro (fundos de badge/destaque): `#E8F0FE`
- Azul claro (sobre fundo escuro): `#8AB4F8`

**Texto**
- Principal: `#111827`
- Secundário: `#4B5563`
- Apagado / placeholder: `#9AA0A6` e `#80868B`

**Superfícies**
- Fundo: `#FFFFFF`
- Borda: `#E5E7EB`
- Cinza claro (cards alt): `#F8F9FA`, `#EDEFF2`, `#F1F3F4`

**Semânticas**
- Sucesso (verde): texto/ícone `#1E8E3E` · fundo `#E6F4EA` · borda `#A8DAB5`
- Alerta (âmbar): texto `#7A5900` · fundo `#FEF7E0` · borda `#FDE68A` · ícone `#F9AB00`
- Erro (vermelho): texto `#A50E0E` · fundo `#FCE8E6` · borda `#F5C6C0`

**Faixa escura (bandas de impacto/rodapé)**
- Fundo: `#0B1A33` · texto: `#FFFFFF` · destaque: `#8AB4F8` · subtexto: `#A9B6CC`

**Ícones coloridos (cards "o que as IAs analisam")**
- Âmbar `#F9AB00` · Azul `#1A73E8` · Verde `#1E8E3E` · Roxo `#9334E6` · Teal `#00897B` · Laranja `#E8710A` (cada um com fundo suave da mesma cor)

**Cores da marca Google (apenas no mock "ANTES")**
- `#4285F4` `#EA4335` `#FBBC05` `#34A853`

## Tipografia
- Fonte: **Inter** (pesos 400, 500, 600, 700, 800)
- H1 (hero): 32px mobile / 38px ≥600px · peso 800 · line-height 1.15 · letter-spacing -0.025em
- H2 (seção): 26–28px mobile / 32–36px desktop · peso 800 · letter-spacing -0.02em
- Eyebrow (etiqueta acima do título): 11.5–12px · peso 800 · MAIÚSCULAS · letter-spacing 0.06–0.1em
- Lead / subtítulo: 15–16px · line-height 1.6
- Texto de card: 13.5–14px · line-height 1.5
- Labels / small: 11.5–13px
- `text-wrap: balance` nos títulos.

## Espaçamento e layout
- Padding lateral (mobile): **24px**
- Largura máxima do HERO: **520px** (estreito, sensação de "ferramenta")
- Largura máxima das SEÇÕES de conteúdo: **1000–1040px**
- Padding vertical de seção: **48px**
- Gaps: cards 12–14px · grids 14–20px
- Ritmo do hero (distâncias): badge→título 16 · título→sub 16 · sub→busca 24 · busca→CTA 12 · CTA→trust 20

## Raio de borda
- Inputs e botão primário: **14px**
- Cards: **16–18px**
- Pills / badges: **999px**
- Chips pequenos: 8–12px

## Tamanhos de componente
- Altura do input e do botão primário: **60px**
- Quadrado de ícone (cards): 44×44px, raio 12px
- Barra de progresso ("exame"): altura 6px, raio 999px

## Componentes
- **Botão primário:** fundo `#1A73E8`, hover `#4285F4`, texto branco, 60px, raio 14, peso 600, com seta "→". Largura total no mobile.
- **Input:** borda `#E5E7EB`; foco = borda azul + anel `box-shadow:0 0 0 3px rgba(26,115,232,0.12)`. Ícone de lupa à esquerda.
- **Badge/pill:** fundo `#E8F0FE`, texto `#1A73E8`, MAIÚSCULAS, pill (999px).
- **Card:** fundo branco, borda 1px `#E5E7EB`, raio 16, padding 18–22px.
- **Banda escura:** fundo `#0B1A33`, texto branco, raio 18, centralizada.

## Breakpoints
- Mobile-first. Desktop a partir de **760px** (grids 2 colunas) e **820px** (comparações lado a lado / tamanhos maiores de fonte).
- Importante: desktop e mobile podem ser **experiências diferentes** (recriar, não só "espremer" o desktop).

## O que evitar
- Jargão técnico na superfície (Schema, SEO, JSON-LD, GEO, AEO). Falar a língua do empresário: Avaliações, Site, Presença, Autoridade.
- Sombras pesadas, gradientes berrantes, neon, dark mode no corpo.
- Excesso de texto/cards no hero.
