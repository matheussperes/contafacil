/**
 * Formatação monetária para exibição (ADR-001): a ÚNICA conversão de
 * centavos → texto R$ do app, na borda da UI. Cálculo nunca passa aqui.
 */
import type { Cents } from '@/domain/money/cents'

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCents(value: Cents): string {
  return BRL.format(value / 100)
}

/** "4.000" mili → "4" | "0,5" para exibição de quantidade. */
export function formatQuantityMilli(milli: number): string {
  const value = milli / 1000
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}
