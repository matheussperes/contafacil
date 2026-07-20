# Distribuição — FASE 08

Interface para dizer **quem consumiu o quê** (F4), nos três modos da
FASE 00, com resumo sempre consistente com o motor.

## Peças

- `useDistribution` — ações (todos/pessoa/grupo, limpar) via
  `AssignmentService`; cada uma invalida o snapshot (o realtime também
  propaga). A UI monta a intenção; nunca calcula partes.
- `DistributionSheet` — bottom sheet com seletor de modo, seleção de
  membros e, no Grupo, opção de **proporção** (pesos). A prévia de quanto
  cada um paga usa `allocate` do motor (FASE 03) — mesma matemática do
  fechamento.
- `ParticipantSummary` — total por participante e a linha "sem dono",
  direto de `useTableView.totals` (motor). Soma sempre = total da mesa.
- `domain/calculator/coverage.ts` — `itemCoverage` (VAZIO/PARCIAL/
  COMPLETO) para os badges de cobertura por item (RN-025).

## Modos e refinamento

| Modo | Como | Refinamento |
|------|------|-------------|
| Todos | um toque; snapshot dos ativos (RN-023) | igual |
| Pessoa | escolhe 1 | 100% |
| Grupo | escolhe N | igual **ou** proporção (pesos inteiros) |

Como a atribuição cobre todo o item e `allocate` divide o total pelos
pesos, pesos iguais dão divisão igual e pesos `3:3:2` reproduzem a divisão
por quantidade (ex.: fatias) — cobrindo quantidade e proporção da RN-024
com um mecanismo único e determinístico.

## Consistência (verificada)

O resumo por participante e a prévia usam exclusivamente o motor da FASE
03, cujas propriedades de conservação já são provadas por `fast-check`
(Σ partes = total). Novo teste: `coverage.test.ts` (VAZIO/PARCIAL/COMPLETO).

## Fora do escopo (próximas fases)

Fechamento (FASE 09), PIX (FASE 10). O resumo aqui é informativo — não
gera pagamentos.

## Pendência de ambiente

Drag & drop foi implementado como **clique/seleção** (mobile-first) com
prévia ao vivo; o arraste com ponteiro e o E2E multi-dispositivo dependem
de Supabase + browser (Docker), fora deste ambiente. A lógica de divisão
(a parte com risco) está no motor, coberta por testes.
