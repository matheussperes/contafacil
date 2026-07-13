# Dependências — ContaFácil

Lista de bibliotecas **permitidas** por camada e o critério para adicionar novas. Versões exatas são congeladas no lockfile a partir da FASE 03.

## Runtime

| Biblioteca | Uso | Camada permitida | Fase |
|-----------|-----|------------------|------|
| `next`, `react`, `react-dom` | framework | `ui`, `app` | 03 (setup) |
| `@supabase/supabase-js` | client Postgres/Auth/Realtime | `infrastructure` **apenas** | 04 |
| `@tanstack/react-query` | estado do servidor | `ui` (hooks) | 07 |
| `zustand` | estado de UI | `ui` | 07 |
| `radix-ui` (primitivas) | a11y headless (dialog, sheet, toast…) | `ui/design-system` | 06 |
| `tailwindcss` | estilo (build-time) | `ui`, `app` | 06 |
| `qrcode` | render de QR (PIX) | `ui` | 10 |
| `zod` | validação de bordas (forms, parser NFC-e, payloads realtime) | `application/validators`, `infrastructure` | 04 |
| `@zxing/browser` | leitura de QR pela câmera (fallback do `BarcodeDetector` nativo) | `ui/features/scanner` | 11 |
| `@sentry/nextjs` | observabilidade | `infrastructure/logging`, `app` | 13 |

**`src/domain` não tem dependência de runtime alguma.** O payload PIX (EMV + CRC16) é implementado no projeto — é pequeno, crítico e testável (RN-050); biblioteca de terceiros ali só esconderia o que precisamos provar.

## Desenvolvimento

| Ferramenta | Uso | Fase |
|-----------|-----|------|
| `typescript` | linguagem | 03 |
| `vitest`, `@testing-library/react` | testes unitários/componente | 03/06 |
| `fast-check` | testes de propriedade | 03 |
| `@playwright/test` | E2E | 07 |
| `eslint` + `eslint-plugin-boundaries` + `prettier` | qualidade e fronteiras (ADR-004) | 03 |
| `supabase` (CLI) | banco local, migrations, tipos gerados | 02 |

## Critério para nova dependência

Uma biblioteca só entra se **todas** as respostas forem sim:

1. Resolve problema real da fase atual (não "vai que precisa")?
2. Implementar no projeto custaria mais do que auditar e manter a dependência?
3. Mantida ativamente e amplamente usada (sem abandonware)?
4. Licença permissiva (MIT/Apache-2.0/BSD)?
5. Não duplica capacidade de dependência já aprovada?

Dependência estrutural (muda arquitetura, entra no domínio, toca dinheiro) exige **ADR**; utilitária, basta registrar nesta tabela no PR que a adiciona.

## Proibições explícitas

- Bibliotecas de datas pesadas (`moment`) — usar `Date`/`Intl`/`Temporal` quando estável.
- Bibliotecas decimais para dinheiro (ADR-001 usa centavos inteiros).
- `lodash` completo — utilitários pontuais escrevem-se em 5 linhas tipadas.
- Qualquer SDK de pagamento/PSP — fora do escopo do produto (visão: "não é meio de pagamento").
