/**
 * Cobertura de distribuição por item (RN-025) — puro, para a UI mostrar
 * o que já tem dono sem recalcular dinheiro à mão.
 */
import type { Assignment, Item } from '@/domain/entities/types'

export type CoverageStatus = 'VAZIO' | 'PARCIAL' | 'COMPLETO'

export interface ItemCoverage {
  itemId: string
  coveredMilli: number
  uncoveredMilli: number
  status: CoverageStatus
  assignment: Assignment | undefined
}

export function itemCoverage(
  item: Pick<Item, 'id' | 'quantityMilli'>,
  assignments: readonly Assignment[],
): ItemCoverage {
  const forItem = assignments.filter((a) => a.itemId === item.id)
  const coveredMilli = forItem.reduce((acc, a) => acc + a.quantityMilli, 0)
  const uncoveredMilli = Math.max(0, item.quantityMilli - coveredMilli)
  const status: CoverageStatus =
    coveredMilli === 0
      ? 'VAZIO'
      : uncoveredMilli === 0
        ? 'COMPLETO'
        : 'PARCIAL'
  // a tela atual usa uma atribuição por item (a primeira); múltiplas
  // atribuições por item somam na cobertura, a edição abre a primeira
  return { itemId: item.id, coveredMilli, uncoveredMilli, status, assignment: forItem[0] }
}
