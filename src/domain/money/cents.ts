/**
 * Dinheiro em centavos inteiros (ADR-001). `Cents` e `BasisPoints` são
 * brands nominais: impedem passar um number cru onde se espera dinheiro.
 * Formatação em R$ acontece exclusivamente na UI — nunca aqui.
 */
import { DomainError } from '@/domain/errors/domain-error'

declare const centsBrand: unique symbol
declare const bpBrand: unique symbol
declare const milliBrand: unique symbol

/** Valor monetário em centavos inteiros (R$ 15,90 = 1590). */
export type Cents = number & { readonly [centsBrand]: true }

/** Percentual em pontos-base inteiros (10% = 1000). */
export type BasisPoints = number & { readonly [bpBrand]: true }

/**
 * Quantidade em mili-unidades inteiras (numeric(12,3) do banco × 1000):
 * 4 unidades = 4000; 0,5 porção = 500. Mantém o domínio 100% inteiro.
 */
export type QuantityMilli = number & { readonly [milliBrand]: true }

const MAX_BP = 10_000

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new DomainError('VALOR_INVALIDO', `centavos não inteiros: ${value}`)
  }
  return value as Cents
}

export function addCents(a: Cents, b: Cents): Cents {
  return cents(a + b)
}

export function basisPoints(value: number): BasisPoints {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_BP) {
    throw new DomainError('TAXA_FORA_DO_INTERVALO', `basis points: ${value}`)
  }
  return value as BasisPoints
}

export function quantityMilli(value: number): QuantityMilli {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError('VALOR_INVALIDO', `mili-quantidade inválida: ${value}`)
  }
  return value as QuantityMilli
}

export const ZERO_CENTS = 0 as Cents
