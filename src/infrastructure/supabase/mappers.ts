/**
 * Linha do banco ↔ entidade do domínio. Toda conversão numérica da
 * borda acontece AQUI: numeric(12,3) (string) → mili-unidades inteiras;
 * bigint → Cents. Nenhum payload cru sobe além desta camada.
 */
import type {
  Assignment,
  AssignmentMember,
  Item,
  Participant,
  Payment,
  Table,
} from '@/domain/entities/types'
import { basisPoints, cents, quantityMilli } from '@/domain/money/cents'
import type { QuantityMilli } from '@/domain/money/cents'
import type {
  AssignmentMemberRow,
  AssignmentRow,
  ItemRow,
  ParticipantRow,
  PaymentRow,
  TableRow,
} from '@/infrastructure/supabase/database-types'

/** "4.000" | 4 → 4000 mili-unidades, sem passar por float impreciso. */
export function numericToMilli(value: string | number): QuantityMilli {
  const s = typeof value === 'number' ? value.toFixed(3) : value
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(s.trim())
  if (!match) {
    return quantityMilli(Number.NaN) // lança VALOR_INVALIDO
  }
  const whole = Number(match[1])
  const frac = Number(((match[2] ?? '') + '000').slice(0, 3))
  return quantityMilli(whole * 1000 + frac)
}

/** 4000 mili → "4.000" (string exata para numeric do banco). */
export function milliToNumeric(milli: QuantityMilli): string {
  const whole = Math.floor(milli / 1000)
  const frac = String(milli % 1000).padStart(3, '0')
  return `${whole}.${frac}`
}

export function mapTable(row: TableRow): Table {
  return {
    id: row.id,
    joinCode: row.join_code,
    name: row.name,
    status: row.status,
    settlementMode: row.settlement_mode,
    serviceFeeBp: basisPoints(row.service_fee_bp),
    payeeParticipantId: row.payee_participant_id,
    payeePixKey: row.payee_pix_key,
    establishmentPixKey: row.establishment_pix_key,
    closedAt: row.closed_at,
    version: row.version,
  }
}

export function mapParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    tableId: row.table_id,
    name: row.name,
    status: row.status,
    role: row.role,
    joinOrder: row.join_order,
    version: row.version,
  }
}

export function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    tableId: row.table_id,
    description: row.description,
    quantityMilli: numericToMilli(row.quantity),
    unitPriceCents: cents(row.unit_price_cents),
    totalCents: cents(row.total_cents),
    source: row.source,
    createdBy: row.created_by,
    version: row.version,
  }
}

export function mapAssignment(
  row: AssignmentRow,
  memberRows: readonly AssignmentMemberRow[],
): Assignment {
  const members: AssignmentMember[] = memberRows
    .filter((m) => m.assignment_id === row.id)
    .map((m) => ({
      participantId: m.participant_id,
      quantityMilli: m.quantity === null ? null : numericToMilli(m.quantity),
      weight: m.weight,
    }))
  return {
    id: row.id,
    tableId: row.table_id,
    itemId: row.item_id,
    mode: row.mode,
    quantityMilli: numericToMilli(row.quantity),
    members,
    version: row.version,
  }
}

export function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    tableId: row.table_id,
    participantId: row.participant_id,
    amountCents: cents(row.amount_cents),
    status: row.status,
    paidDeclaredAt: row.paid_declared_at,
    confirmedAt: row.confirmed_at,
    version: row.version,
  }
}
