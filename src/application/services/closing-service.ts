/**
 * Orquestração do fechamento (UC-08). Nesta fase (04) cobre o CRUD de
 * transições e a geração de pagamentos a partir do motor; a FASE 09
 * acrescenta a resolução de itens sem dono (RN-032) e a UI da máquina
 * de estados. O cálculo é do domínio; o banco re-verifica (ADR-007).
 */
import type {
  AssignmentRepository,
  TableGateway,
} from '@/application/ports/table-gateway'
import type { Logger } from '@/application/ports/logger'
import {
  buildPayments,
  computeClosingShares,
  computeTableTotals,
} from '@/domain/calculator/table-calculator'
import type { TableSnapshot } from '@/domain/entities/types'
import { DomainError } from '@/domain/errors/domain-error'

export interface ClosePayee {
  participantId: string
  pixKey: string
}

export interface ClosingValidation {
  hasUnassigned: boolean
  unassignedValueCents: number
  needsPayeeChoice: boolean
}

export class ClosingService {
  constructor(
    private readonly gateway: TableGateway,
    private readonly logger: Logger,
    private readonly assignments?: AssignmentRepository,
  ) {}

  /** Pré-checagem antes de iniciar o fechamento (RN-030/032). */
  validate(snapshot: TableSnapshot): ClosingValidation {
    const totals = computeTableTotals({
      table: snapshot.table,
      participants: snapshot.participants,
      items: snapshot.items,
      assignments: snapshot.assignments,
    })
    return {
      hasUnassigned: totals.unassignedValueCents > 0,
      unassignedValueCents: totals.unassignedValueCents,
      needsPayeeChoice:
        snapshot.table.settlementMode === 'RECEBEDOR_NO_FECHAMENTO',
    }
  }

  /**
   * RN-032: divide os itens sem dono igualmente entre TODOS os
   * participantes com consumo (ou ativos, se ninguém consumiu ainda),
   * criando uma atribuição "Todos" por item não coberto. Exige o
   * AssignmentRepository injetado.
   */
  async divideUnassignedAmongAll(snapshot: TableSnapshot): Promise<void> {
    if (this.assignments === undefined) {
      throw new DomainError('OPERACAO_INVALIDA', 'sem repositório de distribuição')
    }
    const active = snapshot.participants.filter((p) => p.status === 'ATIVO')
    if (active.length === 0) throw new DomainError('MESA_SEM_PARTICIPANTES')

    for (const item of snapshot.items) {
      const covered = snapshot.assignments
        .filter((a) => a.itemId === item.id)
        .reduce((acc, a) => acc + a.quantityMilli, 0)
      const uncovered = item.quantityMilli - covered
      if (uncovered <= 0) continue
      await this.assignments.upsert({
        itemId: item.id,
        mode: 'TODOS',
        quantityMilli: uncovered as typeof item.quantityMilli,
        members: active.map((p) => ({ participantId: p.id, weight: 1 })),
      })
    }
    this.logger.info('itens sem dono divididos entre todos', {
      tableId: snapshot.table.id,
    })
  }

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
