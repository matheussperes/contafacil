# ADR-010 — Estratégia de testes: Vitest + fast-check + Playwright

**Status:** Aceito · **Data:** 13/07/2026 · **Regras do projeto:** 5 e 7 (CLAUDE.md)

## Contexto

Toda regra financeira exige teste automatizado (regra 5) e cada fase só é entregue com testes verdes (regra 7). Os critérios de aceite da FASE 00 (CA-001..CA-061) precisam de trilha clara até os testes.

## Decisão

Pirâmide com quatro degraus, cada um com dono e fase:

| Degrau | Ferramenta | Alvo | Fase que introduz |
|--------|-----------|------|-------------------|
| Unitário de domínio | **Vitest** | `domain/` — motor, entidades, máquinas de estados, payload PIX | FASE 03 |
| Propriedade | **fast-check** | invariantes do motor: conservação, determinismo, justiça (ADR-008) | FASE 03 |
| Integração | **Vitest** + Supabase local | repositories contra banco real (migrations + seed + RLS), função `close_table`, realtime com 2 clientes | FASES 02/04/05 |
| E2E | **Playwright** | jornadas F1..F8 no navegador, incluindo 2 contextos simultâneos (realtime) | FASE 07+ |

Convenções:
- Testes unitários co-locados (`*.test.ts` ao lado do código); integração em `tests/integration`; E2E em `tests/e2e`.
- Todo teste de regra financeira **nomeia a RN/CA que cobre** (`describe('RN-041 …')`) — rastreabilidade automática dos critérios de aceite.
- Testes de RLS fazem parte da FASE 02: cada policy tem caso "permite" e "nega".
- React Testing Library para componentes do design system (FASE 06).

## Alternativas consideradas

1. **Jest** — Vitest tem a mesma API com integração nativa a Vite/TS e velocidade superior; sem motivo para Jest em projeto novo.
2. **Cypress** — Playwright cobre múltiplos contexts/abas no mesmo teste (essencial para testar realtime entre 2 "pessoas") com melhor paralelismo.
3. **Sem testes de propriedade** — rejeitada: exemplos pontuais não provam conservação; fast-check explora o espaço de inputs que ninguém enumeraria à mão.

## Consequências

- CI (FASE 13) roda os quatro degraus; lint + typecheck completam o portão de fase.
- O Supabase local (CLI) é dependência de desenvolvimento desde a FASE 02.
- Rastreabilidade RN → CA → teste vira critério de revisão de toda fase com regra financeira.
