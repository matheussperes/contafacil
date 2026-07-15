/**
 * Taxa de serviço (RN-004/044).
 *
 * Taxa TOTAL da mesa: contrato numérico com o banco (close_table e
 * v_table_summary usam a mesma fórmula em SQL):
 *   fee = (subtotal × bp + 5000) div 10000   — half-up em divisão inteira
 *
 * Taxa POR PARTICIPANTE: proporcional ao consumo, alocada pelo maior
 * resto (RN-044) — a soma das taxas individuais é exatamente a taxa total.
 */
import type { BasisPoints, Cents } from '@/domain/money/cents'
import { cents } from '@/domain/money/cents'
import { allocate } from '@/domain/calculator/allocate'
import { DomainError } from '@/domain/errors/domain-error'

export function serviceFeeTotal(subtotal: Cents, bp: BasisPoints): Cents {
  const numerator = subtotal * bp + 5000
  if (!Number.isSafeInteger(numerator)) {
    throw new DomainError('VALOR_INVALIDO', 'estouro de precisão na taxa')
  }
  return cents(Math.floor(numerator / 10000))
}

/**
 * Rateia a taxa total proporcionalmente aos consumos (já ordenados por
 * ordem de entrada na mesa — o desempate do maior resto usa essa ordem).
 */
export function serviceFeeShares(
  feeTotal: Cents,
  consumptions: readonly Cents[],
): Cents[] {
  if (feeTotal === 0) {
    return consumptions.map(() => cents(0))
  }
  return allocate(feeTotal, consumptions)
}
