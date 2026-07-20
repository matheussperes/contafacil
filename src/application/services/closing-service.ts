/**
 * Orquestração do fechamento (UC-08). Nesta fase (04) cobre o CRUD de
 * transições e a geração de pagamentos a partir do motor; a FASE 09
 * acrescenta a resolução de itens sem dono (RN-032) e a UI da máquina
 * de estados. O cálculo é do domínio; o banco re-verifica (ADR-007).
 */
import type { TableGateway } from '@/application/ports/table-gateway'
import type { Logger } from '@/application/ports/logger'
import {
  buildPayments,
  computeClosingShares,
} from '@/domain/calculator/table-calculator'
import type { TableSnapshot } from '@/domain/entities/types'
import { DomainError } from '@/domain/errors/domain-error'

export interface ClosePayee {
  participantId: string
  pixKey: string
}

export class ClosingService {
  constructor(
    private readonly gateway: TableGateway,
    private readonly logger: Logger,
  ) {}

  async start(tableId: string): Promise<void> {
    await this.gateway.startClosing(tableId)
    this.logger.info('fechamento iniciado', { tableId })
  }

  async cancel(tableId: string): Promise<void> {
    await this.gateway.cancelClosing(tableId)
    this.logger.info('fechamento cancelado', { tableId })
  }

  /**
   * Calcula as partes pelo motor e persiste via close_table (atômico).
   * Pré-condição: snapshot sem valor sem dono (RN-032, resolvido na
   * FASE 09). O payee é exigido no modo B.
   */
  async finish(snapshot: TableSnapshot, payee?: ClosePayee): Promise<void> {
    const { table } = snapshot
    const shares = computeClosingShares({
      table,
      participants: snapshot.participants,
      items: snapshot.items,
      assignments: snapshot.assignments,
    })

    let effectivePayee: ClosePayee | undefined
    if (table.settlementMode === 'RECEBEDOR_NO_FECHAMENTO') {
      if (payee === undefined) throw new DomainError('RECEBEDOR_OBRIGATORIO')
      effectivePayee = payee
    } else if (table.settlementMode === 'RECEBEDOR_FIXO') {
      if (table.payeeParticipantId === null || table.payeePixKey === null) {
        throw new DomainError('RECEBEDOR_OBRIGATORIO')
      }
      effectivePayee = {
        participantId: table.payeeParticipantId,
        pixKey: table.payeePixKey,
      }
    }

    // valida a divisão por modo antes de ir ao banco (RN-035)
    buildPayments(
      shares,
      table.settlementMode,
      effectivePayee?.participantId ?? null,
    )

    await this.gateway.closeTable(table.id, shares, effectivePayee)
    this.logger.info('mesa fechada', {
      tableId: table.id,
      payments: shares.length,
    })
  }
}
