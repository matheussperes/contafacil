# Stack — ContaFácil

Decisões estruturais justificadas nos ADRs (`adr/`). Esta página é o sumário de referência.

| Camada | Escolha | Justificativa | ADR |
|--------|---------|---------------|-----|
| Linguagem | **TypeScript 5+ (strict)** | tipagem de ponta a ponta; uniões discriminadas para máquinas de estados | ADR-002 |
| Framework | **Next.js 15+ (App Router) + React 19** | OG do link de convite exige SSR; integração nativa com Vercel | ADR-002 |
| Backend | **Supabase** (Postgres + RLS + Realtime + Anonymous Auth) | fixado no pipeline; cliente direto sob RLS, sem API própria | ADR-003, ADR-006 |
| Transação crítica | **Função SQL via RPC** (`close_table`) | atomicidade do fechamento com verificação de invariantes | ADR-007 |
| Estado servidor | **TanStack Query v5** | cache + invalidação + ressincronização; realtime escreve no cache | ADR-005 |
| Estado UI | **Zustand v5** | stores efêmeros por feature, fora do caminho dos dados | ADR-005 |
| Estilo | **Tailwind CSS 4** + tokens CSS vars | design system com fonte única de verdade visual | ADR-009 |
| Primitivas a11y | **Radix UI** (headless) | dialogs/sheets/menus acessíveis sem estilo imposto | ADR-009 |
| Testes | **Vitest + fast-check + Testing Library + Playwright** | pirâmide completa; propriedade para o motor | ADR-010 |
| Lint/format | **ESLint 9 (flat) + Prettier** | inclui lint de fronteiras entre camadas | ADR-004 |
| Gerenciador | **pnpm** | instalação rápida e lockfile estrito |  |
| Dinheiro | **centavos inteiros / basis points** | conservação exata; sem floats | ADR-001 |
| Hospedagem | **Vercel** | fixado no pipeline (FASE 13) | ADR-002 |
| Observabilidade | **Sentry + logs estruturados** | FASE 13; estratégia em `estrategia-logs.md` |  |

## Versões e política de atualização

- Versões **mínimas** acima; a FASE 03 (primeiro código) congela as exatas no `package.json` e lockfile.
- Upgrades de major só entre fases, nunca durante uma fase.
- Node.js LTS vigente (>= 22).

## Ambientes

| Ambiente | Banco | Deploy |
|----------|-------|--------|
| Desenvolvimento | Supabase CLI local (Docker) | `next dev` |
| Preview | projeto Supabase de dev | Vercel preview por branch |
| Produção | projeto Supabase de produção | Vercel produção (FASE 13) |
