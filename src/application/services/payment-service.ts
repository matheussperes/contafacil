/**
 * Atualização de status de pagamento (UC-09/10, RN-051/052).
 * A transição válida é decidida pelo DOMÍNIO (availablePaymentActions);
 * o banco re-valida papel e máquina no trigger — defesa em profundidade.
 */
import type { PaymentRepository } from '@/application/ports/table-gateway'
import type { Logger } from '@/application/ports/logger'
import {
  availablePaymentActions,
  type PaymentTransition,
} from '@/domain/entities/payment-state'
import type { Participant, Payment, Table } from '@/domain/entities/types'
import { DomainError } from '@/domain/errors/domain-error'

export class PaymentService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly logger: Logger,
  ) {}

  actionsFor(
    table: Pick<Table, 'status' | 'settlementMode' | 'payeeParticipantId'>,
    payment: Pick<Payment, 'status' | 'participantId'>,
    me: Pick<Participant, 'id'> | undefined,
  ): PaymentTransition[] {
    return availablePaymentActions(table, payment, me)
  }

  async act(
    table: Pick<Table, 'id' | 'status' | 'settlementMode' | 'payeeParticipantId'>,
    payment: Pick<Payment, 'id' | 'status' | 'participantId'>,
    me: Pick<Participant, 'id'>,
    intent: PaymentTransition['intent'],
  ): Promise<void> {
    const action = this.actionsFor(table, payment, me).find(
      (t) => t.intent === intent,
    )
    if (action === undefined) {
      throw new DomainError('NAO_AUTORIZADO', `intent ${intent}`)
    }
    await this.payments.updateStatus(payment.id, action.to)
    this.logger.info('pagamento atualizado', {
      tableId: table.id,
      paymentId: payment.id,
      to: action.to,
    })
  }
}
