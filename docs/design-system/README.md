# Design System — ContaFácil (FASE 06)

Base visual e biblioteca de componentes que todas as telas (FASE 07+)
consomem. **Sem telas de produto ainda** — apenas os componentes e o
catálogo de revisão.

## Tokens (fonte única — ADR-009)

`src/ui/design-system/tokens.css` define, como CSS custom properties, todas
as cores (marca, superfícies, semânticas), tipografia, raios, sombras e
durações. Tema claro/escuro por troca de valores (`prefers-color-scheme`
+ `data-theme`), nunca por troca de componente. **Nenhum valor visual
hardcoded fora deste arquivo** — componentes só referenciam `var(--…)`,
e o lint do domínio impede floats no core (ADR-001).

## Componentes (13 tipos)

| Componente | Arquivo | Variantes / estados |
|-----------|---------|---------------------|
| Button | `Button.tsx` | primary/secondary/ghost/danger · sm/md/lg · loading · disabled · fullWidth |
| Input | `Input.tsx` | label, hint, error (aria-invalid + role=alert), prefix |
| Card | `Card.tsx` | estático / interativo |
| Dialog | `Dialog.tsx` | modal, Escape, backdrop, foco gerenciado |
| BottomSheet | `BottomSheet.tsx` | mobile-first, scroll interno, Escape |
| Avatar | `Avatar.tsx` | iniciais determinísticas, matiz por nome, muted (quem saiu) |
| Badge | `Badge.tsx` | neutral/positive/warning/danger/info |
| Tag | `Tag.tsx` | removível |
| Toast | `Toast.tsx` | provider + `useToast`, aria-live |
| Skeleton | `feedback.tsx` | placeholder pulsante |
| Loading (Spinner) | `feedback.tsx` | role=status com rótulo |
| EmptyState | `feedback.tsx` | título, descrição, ícone, CTA |
| ErrorState | `feedback.tsx` | role=alert + retry (estrategia-erros.md) |

Utilitário de borda: `money.ts` (`formatCents`, `formatQuantityMilli`) — a
**única** conversão centavos→R$ do app, isolada na UI (ADR-001).

## Acessibilidade de base

- Foco visível global (`:focus-visible`) via token de marca.
- Dialog/BottomSheet: `role="dialog"`, `aria-modal`, Escape, foco no
  conteúdo ao abrir e devolução ao fechar.
- Input: label associada, `aria-invalid` e `aria-describedby` no erro.
- Toast: região `aria-live="polite"`; Spinner/ErrorState com `role`
  semântico.

## Catálogo

`/design` (`src/app/design/page.tsx`) renderiza todos os componentes,
variantes e estados — é o critério de revisão visual da fase. Rode
`pnpm dev` e abra `/design`.

## Verificação

- `pnpm build` (agora `next build`) verde: 3 rotas estáticas.
- `pnpm test`: 89 testes (7 de componente — Button, Input, Avatar, Dialog,
  EmptyState — cobrindo estados e acessibilidade), via Testing Library +
  jsdom.
- `pnpm typecheck` e `pnpm lint` limpos.
