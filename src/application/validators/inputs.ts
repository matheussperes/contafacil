/**
 * Validação de entrada (RN-004/007/020) — a borda entre o que o usuário
 * digita e o domínio. Erros aqui são ValidationError com campo; regras
 * de negócio profundas continuam no domínio/banco.
 */
import { z } from 'zod'
import { ValidationError } from '@/application/errors'
import { basisPoints, cents, quantityMilli } from '@/domain/money/cents'
import type { BasisPoints, Cents, QuantityMilli } from '@/domain/money/cents'

const trimmed = (min: number, max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length >= min && s.length <= max)

export const participantNameSchema = trimmed(1, 30)
export const tableNameSchema = trimmed(1, 60)
export const itemDescriptionSchema = trimmed(1, 100)
export const pixKeySchema = trimmed(1, 140)
export const joinCodeSchema = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .refine((s) => /^[2-9A-HJ-NP-Z]{6}$/.test(s))

export function parseParticipantName(raw: string): string {
  const r = participantNameSchema.safeParse(raw)
  if (!r.success) throw new ValidationError('NOME_INVALIDO', 'name')
  return r.data
}

export function parseTableName(raw: string | undefined): string | undefined {
  if (raw === undefined || raw.trim() === '') return undefined
  const r = tableNameSchema.safeParse(raw)
  if (!r.success) throw new ValidationError('NOME_INVALIDO', 'tableName')
  return r.data
}

export function parseItemDescription(raw: string): string {
  const r = itemDescriptionSchema.safeParse(raw)
  if (!r.success) throw new ValidationError('DESCRICAO_INVALIDA', 'description')
  return r.data
}

export function parseJoinCode(raw: string): string {
  const r = joinCodeSchema.safeParse(raw)
  if (!r.success) throw new ValidationError('CODIGO_INVALIDO', 'joinCode')
  return r.data
}

export function parsePixKey(raw: string): string {
  const r = pixKeySchema.safeParse(raw)
  if (!r.success) throw new ValidationError('CHAVE_PIX_INVALIDA', 'pixKey')
  return r.data
}

/** "12,5" | "12.5" | 12.5 (%) → basis points inteiros (RN-004). */
export function parseServiceFeePercent(raw: string | number): BasisPoints {
  const num =
    typeof raw === 'number' ? raw : Number(raw.replace(',', '.').trim())
  if (!Number.isFinite(num)) {
    throw new ValidationError('TAXA_FORA_DO_INTERVALO', 'serviceFee')
  }
  const bp = Math.round(num * 100)
  try {
    return basisPoints(bp)
  } catch {
    throw new ValidationError('TAXA_FORA_DO_INTERVALO', 'serviceFee')
  }
}

/** "15,90" | "15.90" (R$) → centavos inteiros (ADR-001). */
export function parseMoneyToCents(raw: string | number): Cents {
  const num =
    typeof raw === 'number' ? raw : Number(raw.replace(/\./g, '').replace(',', '.').trim())
  if (!Number.isFinite(num) || num < 0) {
    throw new ValidationError('VALOR_INVALIDO', 'unitPrice')
  }
  const value = Math.round(num * 100)
  if (value < 1) throw new ValidationError('VALOR_INVALIDO', 'unitPrice')
  try {
    return cents(value)
  } catch {
    throw new ValidationError('VALOR_INVALIDO', 'unitPrice')
  }
}

/** "4" | "0,5" (unidades) → mili-unidades inteiras (RN-020, 3 casas). */
export function parseQuantity(raw: string | number): QuantityMilli {
  const num =
    typeof raw === 'number' ? raw : Number(raw.replace(',', '.').trim())
  if (!Number.isFinite(num) || num <= 0) {
    throw new ValidationError('VALOR_INVALIDO', 'quantity')
  }
  const milli = Math.round(num * 1000)
  if (milli < 1 || milli > 999_999_999) {
    throw new ValidationError('VALOR_INVALIDO', 'quantity')
  }
  try {
    return quantityMilli(milli)
  } catch {
    throw new ValidationError('VALOR_INVALIDO', 'quantity')
  }
}
