# ADR-003 — Supabase como backend (sem servidor próprio)

**Status:** Aceito · **Data:** 13/07/2026

## Contexto

O pipeline fixa Supabase (FASE 02/13). A questão arquitetural é **como** usá-lo: com uma API própria na frente (rotas Next.js/Edge Functions) ou com o cliente falando diretamente com o Supabase sob RLS.

## Decisão

**Cliente → Supabase direto, protegido por RLS**, sem camada de API própria para CRUD:

- **Postgres** é a fonte de verdade; invariantes críticas ficam em constraints/triggers (FASE 02).
- **RLS** implementa autorização por mesa/participante (com identidade anônima, ADR-006).
- **Supabase Realtime** propaga os eventos (estratégia própria, `estrategia-realtime.md`).
- Operações que exigem transação multi-tabela — **fechamento da mesa** — viram **funções SQL chamadas por RPC** (ADR-007). Somente essas.
- O acesso no código é isolado em `repositories` (FASE 04): nenhum componente ou service importa o client do Supabase diretamente.

## Alternativas consideradas

1. **API própria (rotas Next.js) na frente de tudo** — rejeitada para CRUD: duplica autorização já expressa no RLS, adiciona latência e um backend inteiro para manter; o realtime continuaria vindo do Supabase de qualquer forma.
2. **Edge Functions do Supabase para toda escrita** — rejeitada pelo mesmo motivo; reservadas como opção futura para o parser NFC-e se o CORS da SEFAZ exigir proxy (decisão adiada para a FASE 11, registrada aqui).
3. **Backend próprio (Node/Fastify) + Postgres puro** — rejeitada: custo operacional sem ganho para o escopo do MVP.

## Consequências

- Segurança **depende inteiramente do RLS** — a FASE 02 trata policies como código crítico, com testes.
- Regras de negócio permanecem no domínio TS (regra 4 do projeto); o banco garante invariantes estruturais, não decide fluxo.
- A troca de provedor exigiria reescrever repositories e adapter realtime — aceitável e contido pela camada de ports (ADR-004).
