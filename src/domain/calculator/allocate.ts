/**
 * A primitiva única de divisão monetária do produto (ADR-008):
 * método do maior resto, determinístico, conservador por construção.
 *
 * - Cada peso recebe o piso da sua parte exata.
 * - Os centavos restantes vão, um a um, às maiores partes fracionárias.
 * - Empate: menor índice primeiro — o chamador ordena os pesos por
 *   ordem de entrada na mesa (RN-042).
 */
import { DomainError } from '@/domain/errors/domain-error'
import type { Cents } from '@/domain/money/cents'
import { cents } from '@/domain/money/cents'

export function allocate(total: Cents, weights: readonly number[]): Cents[] {
  if (total < 0) {
    throw new DomainError('VALOR_INVALIDO', `total negativo: ${total}`)
  }
  if (weights.length === 0) {
    if (total > 0) {
      throw new DomainError('PESO_INVALIDO', 'nenhum peso para alocar')
    }
    return []
  }
  let weightSum = 0
  for (const w of weights) {
    if (!Number.isSafeInteger(w) || w < 0) {
      throw new DomainError('PESO_INVALIDO', `peso inválido: ${w}`)
    }
    weightSum += w
  }
  if (weightSum === 0) {
    if (total > 0) {
      throw new DomainError('PESO_INVALIDO', 'soma dos pesos é zero')
    }
    return weights.map(() => cents(0))
  }

  // partes exatas em aritmética racional inteira: total*w = q*W + r
  const shares: number[] = new Array<number>(weights.length)
  const remainders: { index: number; remainder: number }[] = []
  let distributed = 0
  for (let i = 0; i < weights.length; i++) {
    const numerator = total * (weights[i] ?? 0)
    if (!Number.isSafeInteger(numerator)) {
      throw new DomainError('VALOR_INVALIDO', 'estouro de precisão na alocação')
    }
    const q = Math.floor(numerator / weightSum)
    shares[i] = q
    distributed += q
    remainders.push({ index: i, remainder: numerator % weightSum })
  }

  // sobra: maiores restos primeiro; empate pela ordem de entrada (índice)
  let leftover = total - distributed
  remainders.sort((a, b) =>
    b.remainder !== a.remainder ? b.remainder - a.remainder : a.index - b.index,
  )
  for (let k = 0; leftover > 0; k++, leftover--) {
    const target = remainders[k]
    if (target === undefined) {
      throw new DomainError('CONSERVACAO_VIOLADA', 'sobra maior que pesos')
    }
    shares[target.index] = (shares[target.index] ?? 0) + 1
  }

  const result = shares.map((s) => cents(s))
  let check = 0
  for (const s of result) check += s
  if (check !== total) {
    throw new DomainError(
      'CONSERVACAO_VIOLADA',
      `alocado ${check} ≠ total ${total}`,
    )
  }
  return result
}
