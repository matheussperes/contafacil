/**
 * Deriva o BR Code de um pagamento conforme o modo de acerto (RN-050/053):
 * - A/B: paga-se ao recebedor (chave do payee da mesa);
 * - C: paga-se ao estabelecimento (chave do estabelecimento, se houver).
 * Sem chave aplicável → null (modo C por cartão/outro meio, RN-053).
 */
import { buildBrCode } from '@/domain/pix/brcode'
import type { Participant, Payment, Table } from '@/domain/entities/types'

export interface PaymentPixResult {
  brCode: string | null
  /** motivo de não haver PIX, para a UI orientar (modo C sem chave) */
  reason: 'SEM_CHAVE' | null
}

export function paymentBrCode(
  table: Pick<
    Table,
    'settlementMode' | 'payeePixKey' | 'establishmentPixKey' | 'name' | 'joinCode'
  >,
  payment: Pick<Payment, 'amountCents'>,
  payee: Pick<Participant, 'name'> | undefined,
): PaymentPixResult {
  const isDirect = table.settlementMode === 'PAGAMENTO_DIRETO'
  const key = isDirect ? table.establishmentPixKey : table.payeePixKey
  if (!key) {
    return { brCode: null, reason: 'SEM_CHAVE' }
  }
  const merchantName = isDirect
    ? (table.name ?? 'ESTABELECIMENTO')
    : (payee?.name ?? 'RECEBEDOR')
  return {
    brCode: buildBrCode({
      pixKey: key,
      amountCents: payment.amountCents,
      merchantName,
      txid: table.joinCode,
    }),
    reason: null,
  }
}
