# ADR-008 — Método do maior resto para divisão e compensação

**Status:** Aceito · **Data:** 13/07/2026 · **Regras relacionadas:** RN-041, RN-042, RN-043, RN-044

## Contexto

Dividir centavos inteiros produz sobras (100 ÷ 3). O produto exige conservação exata (I-S1) e determinismo absoluto — mesmo input, mesmo output, em qualquer dispositivo (RN-042), porque o fechamento pode ser recalculado e conferido pelo banco (ADR-007).

## Decisão

Toda divisão monetária usa o **método do maior resto** (largest remainder), como fixado na FASE 00:

1. Calcular a parte exata de cada participante em aritmética racional inteira (numerador/denominador — sem floats, ADR-001).
2. Atribuir a cada um o **piso** da sua parte.
3. Distribuir os centavos restantes, um a um, em ordem decrescente de parte fracionária.
4. Empate na fração → **ordem de entrada na mesa** (participante mais antigo primeiro).

O mesmo algoritmo se aplica a: divisão de item (igual ou ponderada), taxa de serviço proporcional (RN-044) e rateio de itens sem dono no fechamento (RN-032/FA-19).

## Alternativas consideradas

1. **Arredondamento half-up por parte + ajuste no último** — o "último da lista" absorve erro acumulado (pode pagar vários centavos a mais); injusto e sensível à ordem; rejeitada.
2. **Banker's rounding** — resolve viés estatístico, não resolve conservação (a soma ainda diverge); rejeitada.
3. **Sortear quem paga a sobra** — não determinístico, quebra RN-042; rejeitada.

## Consequências

- Fórmula fechada, sem estado: implementável como função pura `allocate(total, weights, tiebreakOrder)` no `domain/calculator` — a primitiva única sobre a qual todos os cálculos do produto se apoiam.
- Propriedades testáveis: conservação (Σ = total), determinismo, justiça (diferença máxima de 1 centavo entre pesos iguais) — base dos testes de propriedade da FASE 03.
- A ordem de entrada na mesa precisa ser um dado estável do participante (a FASE 02 modela `joined_at`/sequência).
