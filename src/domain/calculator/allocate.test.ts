import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { allocate } from '@/domain/calculator/allocate'
import { cents } from '@/domain/money/cents'
import { DomainError } from '@/domain/errors/domain-error'

describe('RN-041 — método do maior resto', () => {
  it('CA-041: 100 centavos ÷ 3 → {34, 33, 33}', () => {
    expect(allocate(cents(100), [1, 1, 1])).toEqual([34, 33, 33])
  })

  it('RN-043: 1000 centavos ÷ 3 → 334+333+333 = 1000', () => {
    expect(allocate(cents(1000), [1, 1, 1])).toEqual([334, 333, 333])
  })

  it('proporção 2:1 sobre 1000 → {667, 333}', () => {
    expect(allocate(cents(1000), [2, 1])).toEqual([667, 333])
  })

  it('peso zero nunca recebe centavo', () => {
    expect(allocate(cents(101), [0, 1, 1])).toEqual([0, 51, 50])
  })

  it('total zero → tudo zero', () => {
    expect(allocate(cents(0), [3, 5])).toEqual([0, 0])
  })
})

describe('RN-042 — desempate determinístico pela ordem', () => {
  it('CA-042: frações iguais → quem entrou antes absorve o centavo', () => {
    // 100/3: todas as frações iguais (1/3) — índice 0 (Ana) leva o extra
    const result = allocate(cents(100), [1, 1, 1])
    expect(result[0]).toBe(34)
  })

  it('mesmo input → mesmo output, sempre', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.array(fc.integer({ min: 0, max: 10_000 }), {
          minLength: 1,
          maxLength: 12,
        }),
        (total, weights) => {
          fc.pre(weights.some((w) => w > 0))
          const a = allocate(cents(total), weights)
          const b = allocate(cents(total), weights)
          expect(a).toEqual(b)
        },
      ),
    )
  })
})

describe('propriedades de conservação e justiça', () => {
  it('Σ partes = total, para qualquer input válido', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.array(fc.integer({ min: 0, max: 100_000 }), {
          minLength: 1,
          maxLength: 20,
        }),
        (total, weights) => {
          fc.pre(weights.some((w) => w > 0))
          const parts = allocate(cents(total), weights)
          expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
        },
      ),
    )
  })

  it('cada parte fica a menos de 1 centavo da parte exata', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.array(fc.integer({ min: 0, max: 10_000 }), {
          minLength: 1,
          maxLength: 12,
        }),
        (total, weights) => {
          fc.pre(weights.some((w) => w > 0))
          const sum = weights.reduce((a, b) => a + b, 0)
          const parts = allocate(cents(total), weights)
          parts.forEach((part, i) => {
            const exact = (total * (weights[i] ?? 0)) / sum
            expect(Math.abs(part - exact)).toBeLessThan(1)
          })
        },
      ),
    )
  })

  it('pesos iguais → diferença máxima de 1 centavo entre partes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 15 }),
        (total, n) => {
          const parts = allocate(cents(total), Array<number>(n).fill(1))
          const max = Math.max(...parts)
          const min = Math.min(...parts)
          expect(max - min).toBeLessThanOrEqual(1)
        },
      ),
    )
  })
})

describe('entradas inválidas', () => {
  it('total negativo → VALOR_INVALIDO', () => {
    expect(() => allocate(cents(-1), [1])).toThrowError(DomainError)
  })

  it('pesos todos zero com total > 0 → PESO_INVALIDO', () => {
    try {
      allocate(cents(10), [0, 0])
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError)
      expect((e as DomainError).code).toBe('PESO_INVALIDO')
    }
  })

  it('peso negativo → PESO_INVALIDO', () => {
    expect(() => allocate(cents(10), [1, -1])).toThrowError(DomainError)
  })
})
