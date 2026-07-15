/**
 * Máquina de estados do pagamento por modo de acerto (RN-051).
 * Espelha o trigger payments_guard da FASE 02 — mesma tabela de verdade.
 */
import type {
  Participant,
  Payment,
  PaymentStatus,
  SettlementMode,
  Table,
} from '@/domain/entities/types'

export interface PaymentTransition {
  to: PaymentStatus
  /** quem pode executar: devedor ou recebedor */
  actor: 'DEVEDOR' | 'RECEBEDOR'
  /** rótulo de intenção para a UI */
  intent: 'INFORMAR' | 'CONFIRMAR' | 'REJEITAR' | 'PAGAR'
}

export function paymentTransitions(
  mode: SettlementMode,
  status: PaymentStatus,
): PaymentTransition[] {
  if (mode === 'PAGAMENTO_DIRETO') {
    return status === 'PENDENTE'
      ? [{ to: 'PAGO', actor: 'DEVEDOR', intent: 'PAGAR' }]
      : []
  }
  switch (status) {
    case 'PENDENTE':
      return [{ to: 'INFORMADO', actor: 'DEVEDOR', intent: 'INFORMAR' }]
    case 'INFORMADO':
      return [
        { to: 'PAGO', actor: 'RECEBEDOR', intent: 'CONFIRMAR' },
        { to: 'PENDENTE', actor: 'RECEBEDOR', intent: 'REJEITAR' },
      ]
    case 'PAGO':
      return []
  }
}

/** Transições que ESTE participante pode executar neste pagamento. */
export function availablePaymentActions(
  table: Pick<Table, 'status' | 'settlementMode' | 'payeeParticipantId'>,
  payment: Pick<Payment, 'status' | 'participantId'>,
  me: Pick<Participant, 'id'> | undefined,
): PaymentTransition[] {
  if (table.status !== 'FECHADA' || me === undefined) return [] // RN-052
  return paymentTransitions(table.settlementMode, payment.status).filter(
    (t) =>
      t.actor === 'DEVEDOR'
        ? payment.participantId === me.id
        : table.payeeParticipantId === me.id,
  )
}

/** Mesa quitada = todos os pagamentos PAGO (F8). */
export function isSettled(payments: readonly Pick<Payment, 'status'>[]): boolean {
  return payments.length > 0 && payments.every((p) => p.status === 'PAGO')
}
