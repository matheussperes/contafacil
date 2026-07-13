# FASE 12 — Polimento

## Contexto

FASES 00–11 aprovadas. O produto está completo em funcionalidade. Esta fase eleva a qualidade percebida e técnica — sem adicionar nenhuma funcionalidade nova.

## Objetivo

Refinar experiência, performance e robustez, e completar os requisitos de PWA.

## Entregáveis

1. **Animações** — transições de tela e de estado coerentes com o design system.
2. **Microinterações** — feedback tátil/visual em ações-chave (copiar PIX, distribuir item, entrar na mesa).
3. **Loading** — estratégia consistente: skeletons nas listas, indicadores em ações, optimistic UI onde a FASE 01 permitir.
4. **Otimizações** — code splitting, lazy loading de rotas pesadas (scanner), redução de re-renders.
5. **Acessibilidade** — auditoria completa: navegação por teclado, leitores de tela, contraste, `prefers-reduced-motion`.
6. **Performance** — orçamento definido e medido (Lighthouse ≥ 90 em Performance e Acessibilidade nas telas principais).
7. **PWA** — instalável, com service worker.
8. **Cache** — estratégia de cache de assets e dados conforme FASE 01.
9. **Offline** — comportamento offline definido na estratégia da FASE 01 implementado; ações em fila sincronizam ao reconectar.
10. **SEO** — metadados, Open Graph (link de convite da mesa com preview), páginas públicas indexáveis.
11. **Ícones** — conjunto completo de ícones de app (favicon, maskable, splash).
12. **Manifest** — `manifest.json` completo e válido.

## Fora do escopo

- Qualquer funcionalidade nova.
- Mudanças de regra de negócio ou de schema.
- Deploy e monitoramento (FASE 13).

## Critérios de aceite

- [ ] Lighthouse ≥ 90 em Performance, Acessibilidade, Best Practices e SEO nas telas principais.
- [ ] App instalável como PWA e funcional segundo a estratégia offline.
- [ ] Auditoria de acessibilidade sem bloqueadores.
- [ ] Nenhuma regressão funcional: toda a suíte de testes das fases anteriores continua verde.
- [ ] Build, testes e lint verdes.

## Dependências

- FASES 00–11 aprovadas.
