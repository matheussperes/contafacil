import { describe, expect, it } from 'vitest'
import { crc16 } from '@/domain/pix/crc16'
import { buildBrCode } from '@/domain/pix/brcode'
import { cents } from '@/domain/money/cents'
import { DomainError } from '@/domain/errors/domain-error'

// Extrai o valor de um campo TLV no nível superior do payload.
function readField(payload: string, id: string): string | null {
  let i = 0
  while (i < payload.length - 4) {
    const fid = payload.slice(i, i + 2)
    const len = Number(payload.slice(i + 2, i + 4))
    const value = payload.slice(i + 4, i + 4 + len)
    if (fid === id) return value
    i += 4 + len
  }
  return null
}

describe('CRC16/CCITT-FALSE (campo 63 do BR Code)', () => {
  it('vetor conhecido: "123456789" → 0x29B1', () => {
    expect(crc16('123456789')).toBe('29B1')
  })

  it('sempre 4 dígitos hex maiúsculos', () => {
    expect(crc16('a')).toMatch(/^[0-9A-F]{4}$/)
  })
})

describe('RN-050 — BR Code estático', () => {
  const base = {
    pixKey: 'ana@pix.com',
    amountCents: cents(3850),
    merchantName: 'Ana Silva',
    merchantCity: 'Sao Paulo',
    txid: 'MESA7GXK2M',
  }

  it('começa com payload format 000201 e é estático (010211)', () => {
    const code = buildBrCode(base)
    expect(code.startsWith('000201')).toBe(true)
    expect(readField(code, '01')).toBe('11')
  })

  it('CA-050: valor formatado com 2 casas e moeda 986 (BRL)', () => {
    const code = buildBrCode(base)
    expect(readField(code, '54')).toBe('38.50')
    expect(readField(code, '53')).toBe('986')
    expect(readField(code, '58')).toBe('BR')
  })

  it('contém a chave PIX dentro do merchant account (26)', () => {
    const code = buildBrCode(base)
    const account = readField(code, '26')
    expect(account).toContain('br.gov.bcb.pix')
    expect(account).toContain('ana@pix.com')
  })

  it('CRC final confere com o CRC recalculado sobre o payload', () => {
    const code = buildBrCode(base)
    const withoutCrc = code.slice(0, -4)
    const declared = code.slice(-4)
    expect(crc16(withoutCrc)).toBe(declared)
  })

  it('nome e cidade sanitizados (sem acento, maiúsculas, limitados)', () => {
    const code = buildBrCode({
      ...base,
      merchantName: 'José da Conceição Sobrinho de Albuquerque',
      merchantCity: 'São José dos Campos!!',
    })
    const name = readField(code, '59')
    const city = readField(code, '60')
    expect(name).toBe('JOSE DA CONCEICAO SOBRINH') // 25 chars, sem acento
    expect((name ?? '').length).toBeLessThanOrEqual(25)
    expect(city).not.toMatch(/[^A-Z0-9 ]/)
    expect((city ?? '').length).toBeLessThanOrEqual(15)
  })

  it('rejeita chave vazia e valor < 1 centavo', () => {
    expect(() => buildBrCode({ ...base, pixKey: '  ' })).toThrowError(DomainError)
    expect(() => buildBrCode({ ...base, amountCents: cents(0) })).toThrowError(
      DomainError,
    )
  })

  it('caracteres especiais no txid não quebram o formato', () => {
    const code = buildBrCode({ ...base, txid: 'mesa#7@2!' })
    const withoutCrc = code.slice(0, -4)
    expect(crc16(withoutCrc)).toBe(code.slice(-4))
  })
})
