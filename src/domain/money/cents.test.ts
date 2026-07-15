import { describe, expect, it } from 'vitest'
import { basisPoints, cents, quantityMilli } from '@/domain/money/cents'
import { DomainError } from '@/domain/errors/domain-error'

describe('RN-040/ADR-001 — dinheiro em centavos inteiros', () => {
  it('aceita inteiros seguros', () => {
    expect(cents(6360)).toBe(6360)
    expect(cents(0)).toBe(0)
  })

  it('rejeita não-inteiros (CA-040)', () => {
    expect(() => cents(63.6)).toThrowError(DomainError)
    expect(() => cents(Number.NaN)).toThrowError(DomainError)
    expect(() => cents(Number.MAX_SAFE_INTEGER + 2)).toThrowError(DomainError)
  })

  it('basis points: 0..10000, inteiro (RN-004)', () => {
    expect(basisPoints(1000)).toBe(1000)
    expect(() => basisPoints(10_001)).toThrowError(/TAXA_FORA_DO_INTERVALO/)
    expect(() => basisPoints(-1)).toThrowError(DomainError)
    expect(() => basisPoints(10.5)).toThrowError(DomainError)
  })

  it('quantidade em mili-unidades: inteiro ≥ 0', () => {
    expect(quantityMilli(4000)).toBe(4000)
    expect(() => quantityMilli(0.5)).toThrowError(DomainError)
    expect(() => quantityMilli(-1)).toThrowError(DomainError)
  })
})
