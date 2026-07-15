/**
 * Entidades do domínio — espelham o vocabulário da FASE 00
 * (regras-de-dominio.md) e o schema da FASE 02. Estados idênticos em
 * código e banco (convenção da FASE 01).
 */
import type { BasisPoints, Cents, QuantityMilli } from '@/domain/money/cents'

export type TableStatus = 'ABERTA' | 'FECHANDO' | 'FECHADA'
export type SettlementMode =
  | 'RECEBEDOR_FIXO'
  | 'RECEBEDOR_NO_FECHAMENTO'
  | 'PAGAMENTO_DIRETO'
export type ParticipantStatus = 'ATIVO' | 'SAIU'
export type ParticipantRole = 'CRIADOR' | 'MEMBRO'
export type ItemSource = 'MANUAL' | 'NFCE'
export type AssignmentMode = 'TODOS' | 'PESSOA' | 'GRUPO'
export type PaymentStatus = 'PENDENTE' | 'INFORMADO' | 'PAGO'

export interface Table {
  id: string
  joinCode: string
  name: string | null
  status: TableStatus
  settlementMode: SettlementMode
  serviceFeeBp: BasisPoints
  payeeParticipantId: string | null
  payeePixKey: string | null
  establishmentPixKey: string | null
  closedAt: string | null
  version: number
}

export interface Participant {
  id: string
  tableId: string
  name: string
  status: ParticipantStatus
  role: ParticipantRole
  joinOrder: number
  version: number
}

export interface Item {
  id: string
  tableId: string
  description: string
  quantityMilli: QuantityMilli
  unitPriceCents: Cents
  totalCents: Cents
  source: ItemSource
  createdBy: string | null
  version: number
}

export interface AssignmentMember {
  participantId: string
  /** refinamento por unidades — exclusivo com weight (RN-024) */
  quantityMilli: QuantityMilli | null
  /** refinamento por peso (proporção) — exclusivo com quantity */
  weight: number | null
}

export interface Assignment {
  id: string
  tableId: string
  itemId: string
  mode: AssignmentMode
  /** unidades do item cobertas por esta atribuição (I-I2) */
  quantityMilli: QuantityMilli
  members: AssignmentMember[]
  version: number
}

export interface Payment {
  id: string
  tableId: string
  participantId: string
  amountCents: Cents
  status: PaymentStatus
  paidDeclaredAt: string | null
  confirmedAt: string | null
  version: number
}

/** Snapshot completo da mesa — a unidade de estado do cliente (ADR-005). */
export interface TableSnapshot {
  table: Table
  participants: Participant[]
  items: Item[]
  assignments: Assignment[]
  payments: Payment[]
}
