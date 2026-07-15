import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  serviceFeeShares,
  serviceFeeTotal,
} from '@/domain/calculator/service-fee'
import { basisPoints, cents } from '@/domain/money/cents'

describe('RN-004/044 — taxa de serviço (contrato com close_table)', () => {
  it('10% de 20.000 = 2.000 (RN-004)', () => {
    expect(serviceFeeTotal(cents(20_000), basisPoints(1000))).toBe(2000)
  })

  it('casos do contrato SQL: 6360→636 e 10000→1000 a 10%', () => {
    // os mesmos valores verificados na suíte do banco (FASE 02)
    expect(serviceFeeTotal(cents(6360), basisPoints(1000))).toBe(636)
    expect(serviceFeeTotal(cents(10_000), basisPoints(1000))).toBe(1000)
  })

  it('half-up: 5 centavos a 10% → 1 centavo (0,5 arredonda para cima)', () => {
    expect(serviceFeeTotal(cents(5), basisPoints(1000))).toBe(1)
  })

  it('taxa 0% → 0', () => {
    expect(serviceFeeTotal(cents(99_999), basisPoints(0))).toBe(0)
  })

  it('CA-044: consumos 6000/3000/1000 a 10% → taxas 600/300/100', () => {
    const fee = serviceFeeTotal(cents(10_000), basisPoints(1000))
    expect(
      serviceFeeShares(fee, [cents(6000), cents(3000), cents(1000)]),
    ).toEqual([600, 300, 100])
  })

  it('propriedade: Σ taxas individuais = taxa total (RN-044)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 500_000 }), {
          minLength: 1,
          maxLength: 10,
        }),
        fc.integer({ min: 0, max: 10_000 }),
        (consumptions, bp) => {
          fc.pre(consumptions.some((c) => c > 0))
          const subtotal = consumptions.reduce((a, b) => a + b, 0)
          const fee = serviceFeeTotal(cents(subtotal), basisPoints(bp))
          const shares = serviceFeeShares(
            fee,
            consumptions.map((c) => cents(c)),
          )
          expect(shares.reduce((a, b) => a + b, 0)).toBe(fee)
        },
      ),
    )
  })

  it('propriedade: fórmula idêntica à SQL (divisão inteira com +5000)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50_000_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (subtotal, bp) => {
          const expected = Number(
            (BigInt(subtotal) * BigInt(bp) + 5000n) / 10000n,
          )
          expect(serviceFeeTotal(cents(subtotal), basisPoints(bp))).toBe(
            expected,
          )
        },
      ),
    )
  })
})
