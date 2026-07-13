# Convenções — ContaFácil

## Idiomas

| Contexto | Idioma |
|----------|--------|
| Código (identificadores, arquivos de código) | **inglês**, usando os termos do glossário (`docs/produto/regras-de-dominio.md`): `Table`, `Participant`, `Assignment`, `joinCode`, `settlementMode`… |
| Documentação, commits, mensagens ao usuário | **português (pt-BR)** |
| Códigos de erro de domínio | **português SCREAMING_SNAKE** (`MESA_CONGELADA`, `NOME_DUPLICADO`) — são vocabulário de domínio consolidado na FASE 00 e aparecem em logs/suporte |

## Nomenclatura

- Arquivos de código: `kebab-case.ts` (`table-service.ts`); componentes React: `PascalCase.tsx` (`BottomSheet.tsx`).
- Funções/variáveis: `camelCase`; tipos/interfaces/enums: `PascalCase`; constantes de módulo: `SCREAMING_SNAKE`.
- Interfaces de port **sem** prefixo `I`: `TableRepository` (implementação: `SupabaseTableRepository`).
- Enums de estado espelham a FASE 00 em inglês no código e português no banco? **Não** — estados são vocabulário de domínio consolidado: `ABERTA`, `FECHANDO`, `FECHADA`, `PENDENTE`, `INFORMADO`, `PAGO`, `ATIVO`, `SAIU`, `TODOS`, `PESSOA`, `GRUPO` valem idênticos em código e banco (evita mapeamento com risco de erro na regra mais crítica).
- Booleans com prefixo `is/has/can` (`canEdit`, `isSettled`).

## Dinheiro (ADR-001)

- Tipos `Cents` e `BasisPoints` obrigatórios em qualquer assinatura monetária — nunca `number` cru.
- Literais de ponto flutuante proibidos em `src/domain` e `src/application` (lint).
- Formatação R$ apenas em `src/ui` via utilitário único do design system.

## Imports e fronteiras

- Absolutos via `@/` entre módulos; relativos apenas intra-módulo.
- Fronteiras de camada (ADR-004) impostas por lint — violação quebra o build.
- Sem barrels (`index.ts` reexportador) em `domain` e `application` — imports explícitos deixam dependências visíveis.

## Commits

- Português, pequenos, um assunto por commit: `tipo: descrição no imperativo`.
- Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `db` (migrations).
- Exemplos: `feat: motor de alocação por maior resto`, `db: policies de RLS para participantes`, `test: propriedade de conservação do allocate`.
- Referenciar RN/CA quando implementar regra: `feat: taxa proporcional ao consumo (RN-044)`.

## Testes (ADR-010)

- `describe` de regra financeira nomeia a RN/CA: `describe('RN-041 — maior resto', …)`.
- Unitários co-locados `*.test.ts`; integração `tests/integration`; E2E `tests/e2e`.
- Fábricas de teste em `tests/factories` — nunca duplicar setup de entidade à mão.

## Qualidade por fase (regra 7 do projeto)

Portão de saída de toda fase com código:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Os quatro verdes, sem warnings novos. Fase documental: revisão dos critérios de aceite da fase.
