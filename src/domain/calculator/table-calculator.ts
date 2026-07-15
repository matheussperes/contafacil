/**
 * O motor financeiro do ContaFácil (FASE 03).
 *
 * Calcula, a partir do snapshot da mesa, o valor exato de cada
 * participante — consumo + taxa proporcional — e os pagamentos a gerar
 * no fechamento, com conservação garantida em TODOS os níveis:
 *
 *   nível item:  Σ valores das atribuições + valor sem dono = total do item (RN-043)
 *   nível mesa:  Σ consumos + sem dono = subtotal (I-S1)
 *   nível final: Σ partes = subtotal + taxa = total da mesa (RN-036)
 *
 * Tudo em aritmética inteira (centavos / mili-unidades / basis points).
 * Desempate de qualquer alocação: ordem de entrada na mesa (RN-042).
 */
import { DomainError } from '@/domain/errors/domain-error'
import type { Cents } from '@/domain/money/cents'
import { cents } from '@/domain/money/cents'
import { allocate } from '@/domain/calculator/allocate'
import {
  serviceFeeShares,
  serviceFeeTotal,
} from '@/domain/calculator/service-fee'
import type {
  Assignment,
  Item,
  Participant,
  SettlementMode,
  Table,
} from '@/domain/entities/types'

export interface ParticipantShare {
  participantId: string
  consumptionCents: Cents
  feeCents: Cents
  totalCents: Cents
}

export interface UnassignedItem {
  itemId: string
  quantityMilli: number
  valueCents: Cents
}

export interface TableTotals {
  subtotalCents: Cents
  serviceFeeCents: Cents
  totalCents: Cents
  shares: ParticipantShare[]
  unassigned: UnassignedItem[]
  unassignedValueCents: Cents
}

export interface PaymentDraft {
  participantId: string
  amountCents: Cents
}

type CalcInput = {
  table: Pick<Table, 'serviceFeeBp'>
  participants: readonly Pick<Participant, 'id' | 'joinOrder'>[]
  items: readonly Pick<Item, 'id' | 'quantityMilli' | 'totalCents'>[]
  assignments: readonly Pick<
    Assignment,
    'id' | 'itemId' | 'quantityMilli' | 'members'
  >[]
}

/** Ordena por entrada na mesa — a ordem canônica de desempate (RN-042). */
function byJoinOrder(
  participants: readonly Pick<Participant, 'id' | 'joinOrder'>[],
): Pick<Participant, 'id' | 'joinOrder'>[] {
  return [...participants].sort((a, b) => a.joinOrder - b.joinOrder)
}

export function computeTableTotals(input: CalcInput): TableTotals {
  const ordered = byJoinOrder(input.participants)
  const orderIndex = new Map(ordered.map((p, i) => [p.id, i]))
  const consumption = new Map<string, number>(ordered.map((p) => [p.id, 0]))

  let subtotal = 0
  const unassigned: UnassignedItem[] = []
  let unassignedValue = 0

  for (const item of input.items) {
    subtotal += item.totalCents
    const itemAssignments = input.assignments.filter(
      (a) => a.itemId === item.id,
    )
    const coveredMilli = itemAssignments.reduce(
      (acc, a) => acc + a.quantityMilli,
      0,
    )
    if (coveredMilli > item.quantityMilli) {
      throw new DomainError('QUANTIDADE_EXCEDIDA', `item ${item.id}`)
    }
    const uncoveredMilli = item.quantityMilli - coveredMilli

    // nível item: divide o total entre as atribuições + parcela sem dono,
    // proporcional às unidades cobertas (conservação por item, RN-043)
    const weights = [...itemAssignments.map((a) => a.quantityMilli), uncoveredMilli]
    const values = allocate(item.totalCents, weights)
    const uncoveredValue = values[values.length - 1] ?? cents(0)
    if (uncoveredMilli > 0) {
      unassigned.push({
        itemId: item.id,
        quantityMilli: uncoveredMilli,
        valueCents: uncoveredValue,
      })
      unassignedValue += uncoveredValue
    }

    // nível atribuição: divide o valor coberto entre os membros
    for (let i = 0; i < itemAssignments.length; i++) {
      const assignment = itemAssignments[i]
      const value = values[i]
      if (assignment === undefined || value === undefined) continue
      if (assignment.members.length === 0) {
        throw new DomainError('DISTRIBUICAO_SEM_MEMBROS', assignment.id)
      }
      const hasQty = assignment.members.some((m) => m.quantityMilli !== null)
      const hasWeight = assignment.members.some((m) => m.weight !== null)
      if (hasQty && hasWeight) {
        throw new DomainError('REFINAMENTO_MISTO', assignment.id)
      }
      const members = [...assignment.members].sort((a, b) => {
        const ia = orderIndex.get(a.participantId)
        const ib = orderIndex.get(b.participantId)
        if (ia === undefined || ib === undefined) {
          throw new DomainError('PARTICIPANTE_INVALIDO', assignment.id)
        }
        return ia - ib
      })
      if (hasQty) {
        const sumQty = members.reduce(
          (acc, m) => acc + (m.quantityMilli ?? 0),
          0,
        )
        if (sumQty !== assignment.quantityMilli) {
          throw new DomainError('QUANTIDADE_INCONSISTENTE', assignment.id)
        }
      }
      const memberWeights = members.map((m) =>
        hasQty ? (m.quantityMilli ?? 0) : (m.weight ?? 0),
      )
      const memberValues = allocate(value, memberWeights)
      members.forEach((m, k) => {
        const current = consumption.get(m.participantId) ?? 0
        consumption.set(m.participantId, current + (memberValues[k] ?? 0))
      })
    }
  }

  const subtotalCents = cents(subtotal)
  const feeTotal = serviceFeeTotal(subtotalCents, input.table.serviceFeeBp)

  // taxa proporcional ao consumo, mesma ordem de desempate (RN-044)
  const consumptions = ordered.map((p) => cents(consumption.get(p.id) ?? 0))
  // a parcela de taxa do valor sem dono só existe no fechamento, quando
  // tudo tem dono (RN-032); antes disso a taxa é rateada sobre o consumido
  const consumedTotal = cents(subtotal - unassignedValue)
  const feeOnConsumed = serviceFeeTotal(consumedTotal, input.table.serviceFeeBp)
  const feeShares = serviceFeeShares(feeOnConsumed, consumptions)

  const shares: ParticipantShare[] = ordered.map((p, i) => {
    const c = consumptions[i] ?? cents(0)
    const f = feeShares[i] ?? cents(0)
    return {
      participantId: p.id,
      consumptionCents: c,
      feeCents: f,
      totalCents: cents(c + f),
    }
  })

  // asserções de conservação — violação aqui é bug, não fluxo
  const consumedSum = shares.reduce((acc, s) => acc + s.consumptionCents, 0)
  if (consumedSum + unassignedValue !== subtotal) {
    throw new DomainError(
      'CONSERVACAO_VIOLADA',
      `consumo ${consumedSum} + sem dono ${unassignedValue} ≠ subtotal ${subtotal}`,
    )
  }

  return {
    subtotalCents,
    serviceFeeCents: feeTotal,
    totalCents: cents(subtotal + feeTotal),
    shares,
    unassigned,
    unassignedValueCents: cents(unassignedValue),
  }
}

/**
 * Partes finais para o fechamento (RN-035/036). Pré-condição: nenhum
 * valor sem dono (RN-032 resolvida antes). A soma das partes é
 * exatamente o total da mesa — é o contrato que close_table re-verifica.
 */
export function computeClosingShares(input: CalcInput): PaymentDraft[] {
  const totals = computeTableTotals(input)
  if (totals.unassignedValueCents !== 0) {
    throw new DomainError(
      'DISTRIBUICAO_INVALIDA',
      'fechamento com valor sem dono (RN-032)',
    )
  }
  const drafts = totals.shares
    .filter((s) => s.totalCents > 0)
    .map((s) => ({ participantId: s.participantId, amountCents: s.totalCents }))

  const sum = drafts.reduce((acc, d) => acc + d.amountCents, 0)
  if (sum !== totals.totalCents) {
    throw new DomainError(
      'CONSERVACAO_VIOLADA',
      `Σ partes ${sum} ≠ total ${totals.totalCents}`,
    )
  }
  return drafts
}

/**
 * Pagamentos a persistir, por modo (RN-035):
 * A/B — todos menos o recebedor; C — todos.
 */
export function buildPayments(
  shares: readonly PaymentDraft[],
  mode: SettlementMode,
  payeeParticipantId: string | null,
): PaymentDraft[] {
  if (mode === 'PAGAMENTO_DIRETO') {
    return [...shares]
  }
  if (payeeParticipantId === null) {
    throw new DomainError('RECEBEDOR_OBRIGATORIO')
  }
  return shares.filter((s) => s.participantId !== payeeParticipantId)
}
