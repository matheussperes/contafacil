import { describe, expect, it } from 'vitest'
import { itemCoverage } from '@/domain/calculator/coverage'
import { quantityMilli } from '@/domain/money/cents'
import type { Assignment } from '@/domain/entities/types'

function assignment(itemId: string, q: number): Assignment {
  return {
    id: `a-${itemId}-${q}`,
    tableId: 't1',
    itemId,
    mode: 'TODOS',
    quantityMilli: quantityMilli(q),
    members: [{ participantId: 'p1', quantityMilli: null, weight: 1 }],
    version: 1,
  }
}

describe('itemCoverage (RN-025)', () => {
  const item = { id: 'i1', quantityMilli: quantityMilli(4000) }

  it('sem atribuições → VAZIO', () => {
    expect(itemCoverage(item, []).status).toBe('VAZIO')
  })

  it('cobertura parcial → PARCIAL com sobra', () => {
    const c = itemCoverage(item, [assignment('i1', 2000)])
    expect(c.status).toBe('PARCIAL')
    expect(c.uncoveredMilli).toBe(2000)
  })

  it('cobertura total → COMPLETO', () => {
    const c = itemCoverage(item, [assignment('i1', 4000)])
    expect(c.status).toBe('COMPLETO')
    expect(c.uncoveredMilli).toBe(0)
  })
})
