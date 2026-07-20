import { describe, expect, it } from 'vitest'
import { redact } from '@/infrastructure/logging/redaction'
import { ConsoleLogger } from '@/infrastructure/logging/console-logger'
import { LocalDeviceStorage } from '@/infrastructure/storage/local-device-storage'
import { translateSupabaseError } from '@/infrastructure/supabase/errors'
import {
  milliToNumeric,
  numericToMilli,
} from '@/infrastructure/supabase/mappers'
import { DomainError } from '@/domain/errors/domain-error'
import { InfrastructureError } from '@/application/errors'
import { quantityMilli } from '@/domain/money/cents'

describe('redação de dados sensíveis (estrategia-logs.md)', () => {
  it('mascara chave PIX e BR Code em qualquer profundidade', () => {
    const out = redact({
      tableId: 't1',
      payeePixKey: 'ana@pix.com',
      nested: { brCode: '000201...', ok: 1 },
    })
    expect(out).toEqual({
      tableId: 't1',
      payeePixKey: '«redacted»',
      nested: { brCode: '«redacted»', ok: 1 },
    })
  })

  it('logger nunca emite a chave PIX', () => {
    const lines: string[] = []
    const logger = new ConsoleLogger({
      minLevel: 'debug',
      sink: (_l, line) => lines.push(line),
    })
    logger.info('pix gerado', { payeePixKey: 'segredo@pix.com' })
    expect(lines.join('\n')).not.toContain('segredo@pix.com')
    expect(lines.join('\n')).toContain('«redacted»')
  })

  it('respeita o nível mínimo', () => {
    const lines: string[] = []
    const logger = new ConsoleLogger({
      minLevel: 'warn',
      sink: (_l, line) => lines.push(line),
    })
    logger.info('silêncio')
    logger.error('barulho')
    expect(lines).toHaveLength(1)
  })
})

describe('conversão numeric ↔ mili (sem floats)', () => {
  it('ida e volta preserva o valor exato', () => {
    expect(numericToMilli('4.000')).toBe(4000)
    expect(numericToMilli('0.500')).toBe(500)
    expect(numericToMilli(4)).toBe(4000)
    expect(milliToNumeric(quantityMilli(4000))).toBe('4.000')
    expect(milliToNumeric(quantityMilli(500))).toBe('0.500')
  })

  it('numeric malformado → VALOR_INVALIDO', () => {
    expect(() => numericToMilli('abc')).toThrowError(DomainError)
  })
})

describe('tradução de erros do Supabase', () => {
  it('código de domínio na message → DomainError', () => {
    const e = translateSupabaseError({ message: 'MESA_CONGELADA' })
    expect(e).toBeInstanceOf(DomainError)
    expect((e as DomainError).code).toBe('MESA_CONGELADA')
  })

  it('unique de nome → NOME_DUPLICADO', () => {
    const e = translateSupabaseError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "participants_nome_unico"',
    })
    expect((e as DomainError).code).toBe('NOME_DUPLICADO')
  })

  it('RLS → InfrastructureError não-retryável', () => {
    const e = translateSupabaseError({ code: '42501', message: 'row-level security' })
    expect(e).toBeInstanceOf(InfrastructureError)
    expect((e as InfrastructureError).retryable).toBe(false)
  })

  it('rede → InfrastructureError retryável', () => {
    const e = translateSupabaseError({ message: 'Failed to fetch' })
    expect((e as InfrastructureError).retryable).toBe(true)
  })
})

describe('LocalDeviceStorage', () => {
  it('salva, lê e remove sessões (fallback em memória)', () => {
    const storage = new LocalDeviceStorage()
    storage.saveSession({
      tableId: 't1',
      joinCode: 'ABC234',
      participantId: 'p1',
      tableName: 'Bar',
      joinedAt: '2026-07-15T20:00:00Z',
    })
    expect(storage.getSession('t1')?.participantId).toBe('p1')
    expect(storage.listRecentSessions()).toHaveLength(1)
    storage.removeSession('t1')
    expect(storage.getSession('t1')).toBeNull()
  })
})
