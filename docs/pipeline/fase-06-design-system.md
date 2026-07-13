# FASE 06 — Design System

## Contexto

FASES 00–05 aprovadas. Todo o backend e a sincronização funcionam. É hora de preparar a base visual — **antes** de qualquer tela.

## Objetivo

Criar o design system: tokens (cores, tipografia, espaçamento, raios, sombras) e a biblioteca de componentes base que todas as telas usarão.

**Nada de telas ainda.**

## Entregáveis

Criar somente os componentes base:

```
Botões
Inputs
Cards
Dialogs
Bottom Sheets
Avatares
Badges
Tags
Toasts
Skeletons
Loading
Empty States
Error States
```

Além dos componentes:

1. **Tokens de design** — definidos uma única vez e consumidos por todos os componentes (nenhuma cor/espaçamento hardcoded em componente).
2. **Variantes e estados** — cada componente com suas variantes (primário/secundário, tamanhos) e estados (hover, focus, disabled, loading, erro).
3. **Acessibilidade de base** — foco visível, navegação por teclado, roles/aria corretos, contraste adequado.
4. **Catálogo navegável** — página ou Storybook exibindo todos os componentes, variantes e estados, para validação visual isolada.

## Fora do escopo

- Telas e fluxos do produto (FASE 07+).
- Lógica de negócio em componentes — componentes são puramente apresentacionais.
- Animações elaboradas e microinterações (FASE 12) — apenas transições básicas.

## Critérios de aceite

- [ ] Todos os 13 tipos de componentes listados existem, com variantes e estados.
- [ ] Nenhum valor visual hardcoded fora dos tokens.
- [ ] Catálogo exibe todos os componentes e serve de critério de revisão visual.
- [ ] Componentes acessíveis via teclado e com marcação semântica correta.
- [ ] Build, testes e lint verdes.

## Dependências

- FASE 01 aprovada (stack e convenções de front-end).
