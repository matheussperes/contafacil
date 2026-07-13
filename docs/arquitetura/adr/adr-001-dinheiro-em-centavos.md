# ADR-001 — Dinheiro em centavos inteiros

**Status:** Aceito · **Data:** 13/07/2026 · **Regras relacionadas:** RN-040, RN-041, RN-043

## Contexto

O ContaFácil divide contas com arredondamento e compensação de centavos (RN-041/042). Ponto flutuante binário (IEEE 754) não representa valores decimais com exatidão (`0.1 + 0.2 !== 0.3`), o que tornaria a invariante central do produto — "a soma das partes é igual ao total" (I-S1) — impossível de garantir.

## Decisão

Todo valor monetário é um **inteiro em centavos**, de ponta a ponta:

- **Banco:** colunas `bigint` (nunca `numeric` com casas, nunca `real/double`).
- **Domínio/aplicação:** tipo `Cents` (alias nominal de `number` inteiro, validado; `Number.isSafeInteger` obrigatório) — as magnitudes do produto (contas de bar) ficam ordens de grandeza abaixo de `MAX_SAFE_INTEGER`.
- **Percentuais** (taxa de serviço): inteiros em **pontos-base** (basis points): 10% = `1000`. Multiplicação inteira, divisão só no motor com maior resto.
- **Formatação** para exibição (R$) acontece exclusivamente na borda da UI (`Intl.NumberFormat`), nunca em cálculo.

## Alternativas consideradas

1. **`number` com 2 casas decimais** — rejeitada: erro de representação binária quebra I-S1.
2. **Bibliotecas decimais (decimal.js, big.js)** — rejeitada: dependência e custo cognitivo desnecessários; centavos inteiros resolvem com aritmética nativa exata.
3. **`bigint` do JavaScript** — rejeitada: os valores nunca se aproximam do limite de `number`; `bigint` não serializa em JSON nativamente e contaminaria todas as bordas.

## Consequências

- O motor matemático (FASE 03) opera apenas com aritmética inteira — determinístico por construção.
- Testes podem verificar igualdade exata (`===`), sem tolerâncias.
- Conversão explícita nas bordas: input do usuário ("15,90") → `1590` no parser da UI; NFC-e → centavos no parser da nota.
- Lint proibirá literais de ponto flutuante em módulos financeiros (convenções, `convencoes.md`).
