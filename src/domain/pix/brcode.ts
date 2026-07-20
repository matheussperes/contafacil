/**
 * Gerador de BR Code PIX estático (EMV-MPM do Banco Central) — RN-050.
 * Puro, sem dependências: monta os campos TLV, sanitiza e fecha com o
 * CRC16 (campo 63). Nada de integração bancária (visão do produto).
 *
 * Formato TLV: cada campo = ID(2) + tamanho(2, zero-padded) + valor.
 */
import { DomainError } from '@/domain/errors/domain-error'
import type { Cents } from '@/domain/money/cents'
import { crc16 } from '@/domain/pix/crc16'

export interface BrCodeInput {
  pixKey: string
  amountCents: Cents
  /** nome do recebedor (máx. 25 no EMV) */
  merchantName: string
  /** cidade do recebedor (máx. 15) */
  merchantCity?: string
  /** identificador da transação (txid); default 3 chars mínimos */
  txid?: string
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0')
  if (value.length > 99) {
    throw new DomainError('VALOR_INVALIDO', `campo ${id} excede 99`)
  }
  return `${id}${len}${value}`
}

/** Remove acentos/símbolos e limita — EMV aceita ASCII básico. */
function sanitize(text: string, max: number): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacríticos combinantes
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, max)
    .toUpperCase()
}

function formatAmount(cents: Cents): string {
  return (cents / 100).toFixed(2)
}

export function buildBrCode(input: BrCodeInput): string {
  if (!input.pixKey || input.pixKey.trim() === '') {
    throw new DomainError('CHAVE_PIX_INVALIDA')
  }
  if (input.amountCents < 1) {
    throw new DomainError('VALOR_INVALIDO', 'valor do PIX < 1 centavo')
  }

  const gui = tlv('00', 'br.gov.bcb.pix')
  const key = tlv('01', input.pixKey.trim())
  const merchantAccount = tlv('26', gui + key)

  const txid = sanitize(input.txid ?? '***', 25) || '***'
  const additionalData = tlv('62', tlv('05', txid))

  const name = sanitize(input.merchantName, 25) || 'RECEBEDOR'
  const city = sanitize(input.merchantCity ?? 'SAO PAULO', 15) || 'SAO PAULO'

  const partial =
    tlv('00', '01') + // payload format indicator
    tlv('01', '11') + // point of initiation: 11 = estático (reutilizável)
    merchantAccount +
    tlv('52', '0000') + // merchant category code
    tlv('53', '986') + // moeda BRL
    tlv('54', formatAmount(input.amountCents)) +
    tlv('58', 'BR') + // país
    tlv('59', name) +
    tlv('60', city) +
    additionalData +
    '6304' // ID+len do CRC, sobre o qual o CRC é calculado

  return partial + crc16(partial)
}
