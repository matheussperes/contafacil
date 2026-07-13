# ADR-004 — Clean Architecture em 4 camadas

**Status:** Aceito · **Data:** 13/07/2026 · **Regras do projeto:** 3 e 4 (CLAUDE.md)

## Contexto

As regras permanentes exigem separação domínio/aplicação/infraestrutura e lógica de negócio centralizada no domínio. É preciso fixar as camadas, a regra de dependência e como ela será **imposta** (não apenas combinada).

## Decisão

Quatro camadas em `src/`, com dependências apontando sempre para dentro:

```text
ui / app  →  application  →  domain
                  ↑
          infrastructure  (implementa os ports da application)
```

| Camada | Pasta | Pode importar | Conteúdo |
|--------|-------|---------------|----------|
| **Domínio** | `src/domain` | nada externo (nem React, nem Supabase, nem Next) | entidades, máquinas de estados, motor matemático (`calculator/`), payload PIX, erros de domínio |
| **Aplicação** | `src/application` | `domain` | services (casos de uso), validators, **ports** (interfaces de repositories/eventos), tipos de eventos |
| **Infraestrutura** | `src/infrastructure` | `application`, `domain` | repositories Supabase, adapter realtime, parser NFC-e, logging |
| **UI** | `src/ui`, `src/app` | `application`, `domain` (leitura de tipos) | design system, telas, hooks; **zero regra de negócio** |

A regra é imposta por **lint de fronteiras** (`eslint-plugin-boundaries` ou `import/no-restricted-paths`): import na direção errada = build vermelho (regra 7 do projeto).

A composição (injetar repositories concretos nos services) acontece num único ponto por contexto (`src/app`/providers), mantendo services testáveis com dublês.

## Alternativas consideradas

1. **Feature folders sem camadas** — rejeitada: convida regra de negócio na UI, exatamente o que as regras do projeto proíbem.
2. **Monorepo com packages por camada** — isolamento máximo, mas overhead de tooling desproporcional a um app único; a fronteira via lint dá a mesma garantia prática.
3. **Hexagonal estrita com casos de uso 1-arquivo-por-ação** — adotada em espírito (ports/adapters), sem o cerimonial de classes; services agrupam ações por agregado (mesa, itens, pagamentos), como a FASE 04 lista.

## Consequências

- FASE 03 entrega `domain/calculator` puro e portátil — testável sem mock algum.
- Trocar Supabase, Next ou React não toca o domínio.
- Custo assumido: alguma duplicação de tipos entre borda do banco e domínio, resolvida por mapeadores nos repositories.
