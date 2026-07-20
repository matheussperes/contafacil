import { describe, expect, it } from 'vitest'
import { paymentBrCode } from '@/domain/pix/payment-brcode'
import { basisPoints, cents } from '@/domain/money/cents'
import type { Payment, Table } from '@/domain/entities/types'

const payment = { amountCents: cents(4738) } as Pick<Payment, 'amountCents'>

function table(over: Partial<Table>): Table {
  return {
    id: 't1',
    joinCode: 'ABC234',
    name: 'Bar do Zé',
    status: 'FECHADA',
    settlementMode: 'RECEBEDOR_FIXO',
    serviceFeeBp: basisPoints(1000),
    payeeParticipantId: 'p1',
    payeePixKey: 'ana@pix.com',
    establishmentPixKey: null,
    closedAt: null,
    version: 1,
    ...over,
  }
}

describe('paymentBrCode — chave por modo (RN-050/053)', () => {
  it('modo A/B usa a chave do recebedor', () => {
    const r = paymentBrCode(table({}), payment, { name: 'Ana' })
    expect(r.brCode).not.toBeNull()
    expect(r.brCode).toContain('ana@pix.com')
  })

  it('modo C usa a chave do estabelecimento quando existe', () => {
    const r = paymentBrCode(
      table({
        settlementMode: 'PAGAMENTO_DIRETO',
        payeePixKey: null,
        establishmentPixKey: 'bar@pix.com',
      }),
      payment,
      undefined,
    )
    expect(r.brCode).toContain('bar@pix.com')
  })

  it('CA-053: modo C sem chave → sem BR Code (cartão/outro meio)', () => {
    const r = paymentBrCode(
      table({
        settlementMode: 'PAGAMENTO_DIRETO',
        payeePixKey: null,
        establishmentPixKey: null,
      }),
      payment,
      undefined,
    )
    expect(r.brCode).toBeNull()
    expect(r.reason).toBe('SEM_CHAVE')
  })
})
