# ADR-009 — Tailwind CSS 4 + tokens como fonte única do visual

**Status:** Aceito · **Data:** 13/07/2026 · **Fase relacionada:** FASE 06

## Contexto

A FASE 06 exige um design system com tokens centralizados (nenhum valor visual hardcoded) e componentes acessíveis, num app mobile-first com bottom sheets, drag & drop e estados ricos.

## Decisão

- **Tailwind CSS 4** para estilização, com **todos os tokens definidos como CSS custom properties** no tema (`@theme`): cores semânticas (`--color-surface`, `--color-positive`…), espaçamento, raios, tipografia, sombras, durações de animação.
- Componentes do design system usam apenas classes derivadas de tokens; cores literais (`#hex`, `rgb()`) fora do arquivo de tema são proibidas por lint.
- **Primitivas de acessibilidade headless** (Radix UI / Base UI) para dialogs, sheets e menus — comportamento e foco corretos sem estilo imposto.
- Suporte a tema claro/escuro desde o início via tokens (troca de valores, não de componentes).

## Alternativas consideradas

1. **CSS Modules puros** — controle total, mas sem a velocidade de composição e a consistência de constraints que utility-first dá a um design system pequeno; rejeitada.
2. **Biblioteca pronta (MUI, Mantine, shadcn/ui)** — MUI/Mantine impõem identidade visual e peso; shadcn/ui foi considerada como *ponto de partida* de padrões (é Radix+Tailwind), mas os componentes da FASE 06 serão do projeto, sem dependência da coleção.
3. **CSS-in-JS (styled-components/emotion)** — custo de runtime e atrito com Server Components; rejeitada.

## Consequências

- FASE 06 entrega `src/ui/design-system` com catálogo navegável; revisão visual = revisão do catálogo.
- Tokens em CSS vars permitem o polimento da FASE 12 (dark mode, `prefers-reduced-motion`) sem refactor.
- O time de UI nunca decide cor/espaçamento em componente — decide no tema, uma vez.
