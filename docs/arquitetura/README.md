# Arquitetura — ContaFácil (FASE 01)

Fonte de verdade arquitetural do projeto. Nenhuma implementação existe ainda — estes documentos governam as fases 02+.

## ADRs (decisões)

| ADR | Decisão |
|-----|---------|
| [001](adr/adr-001-dinheiro-em-centavos.md) | Dinheiro em centavos inteiros; percentuais em basis points |
| [002](adr/adr-002-nextjs-typescript.md) | Next.js (App Router) + TypeScript estrito |
| [003](adr/adr-003-supabase-backend.md) | Supabase direto sob RLS, sem API própria |
| [004](adr/adr-004-clean-architecture.md) | Clean Architecture em 4 camadas, imposta por lint |
| [005](adr/adr-005-gerenciamento-de-estado.md) | TanStack Query + Zustand; realtime escreve no cache |
| [006](adr/adr-006-identidade-anonima.md) | Identidade anônima por dispositivo (Anonymous Auth) |
| [007](adr/adr-007-fechamento-atomico-rpc.md) | Fechamento atômico via função SQL; cálculo no domínio |
| [008](adr/adr-008-metodo-maior-resto.md) | Método do maior resto para divisão e compensação |
| [009](adr/adr-009-tailwind-design-tokens.md) | Tailwind CSS 4 + tokens como fonte única do visual |
| [010](adr/adr-010-estrategia-de-testes.md) | Vitest + fast-check + Playwright (pirâmide de 4 degraus) |

## Referências

- [Stack](stack.md) — sumário das escolhas com versões e ambientes
- [Estrutura de pastas](estrutura-de-pastas.md) — árvore-alvo, fase a fase
- [Convenções](convencoes.md) — nomes, commits, imports, portão de qualidade
- [Dependências](dependencias.md) — bibliotecas permitidas + critério de inclusão

## Estratégias transversais

- [Estados](estrategia-estados.md) — quatro origens de estado, política de optimistic update
- [Realtime](estrategia-realtime.md) — canal por mesa, catálogo dos 8 eventos, reconexão
- [Offline](estrategia-offline.md) — leitura honesta, escrita bloqueada, fila só de pagamentos
- [Erros](estrategia-erros.md) — taxonomia, propagação, apresentação
- [Logs](estrategia-logs.md) — estrutura, pontos obrigatórios, redação de dados sensíveis
