/**
 * Ports de acesso a dados (ADR-003/004). A infraestrutura implementa;
 * services só conhecem estas interfaces. Operações que exigem atomicidade
 * ou contexto de autorização são as funções RPC da FASE 02.
 */
import type {
  Assignment,
  AssignmentMode,
  Item,
  PaymentStatus,
  SettlementMode,
  TableSnapshot,
} from '@/domain/entities/types'
import type { BasisPoints, Cents, QuantityMilli } from '@/domain/money/cents'
import type { PaymentDraft } from '@/domain/calculator/table-calculator'

export interface CreateTableInput {
  creatorName: string
  settlementMode: SettlementMode
  name?: string
  serviceFeeBp?: BasisPoints
  payeePixKey?: string
  establishmentPixKey?: string
}

export interface TablePublicInfo {
  id: string
  name: string | null
  status: string
  participantsCount: number
}

export interface JoinResult {
  tableId: string
  participantId: string
  rejoined: boolean
}

export interface CreateResult {
  tableId: string
  joinCode: string
  participantId: string
}

export interface TableConfigPatch {
  name?: string
  settlementMode?: SettlementMode
  serviceFeeBp?: BasisPoints
  payeePixKey?: string
  establishmentPixKey?: string
}

export interface TableGateway {
  createTable(input: CreateTableInput): Promise<CreateResult>
  getTableByCode(joinCode: string): Promise<TablePublicInfo | null>
  joinTable(joinCode: string, name: string): Promise<JoinResult>
  leaveTable(tableId: string): Promise<void>
  updateConfig(tableId: string, patch: TableConfigPatch): Promise<void>
  startClosing(tableId: string): Promise<void>
  cancelClosing(tableId: string): Promise<void>
  closeTable(
    tableId: string,
    shares: readonly PaymentDraft[],
    payee?: { participantId: string; pixKey: string },
  ): Promise<void>
  fetchSnapshot(tableId: string): Promise<TableSnapshot>
}

export interface NewItemInput {
  tableId: string
  description: string
  quantityMilli: QuantityMilli
  unitPriceCents: Cents
  source?: Item['source']
  createdBy?: string
}

export interface ItemPatch {
  description?: string
  quantityMilli?: QuantityMilli
  unitPriceCents?: Cents
}

export interface ItemRepository {
  insert(input: NewItemInput): Promise<Item>
  insertMany(inputs: readonly NewItemInput[]): Promise<Item[]>
  update(itemId: string, patch: ItemPatch): Promise<Item>
  remove(itemId: string): Promise<void>
}

export interface AssignmentMemberInput {
  participantId: string
  quantityMilli?: QuantityMilli
  weight?: number
}

export interface UpsertAssignmentInput {
  itemId: string
  mode: AssignmentMode
  quantityMilli: QuantityMilli
  members: readonly AssignmentMemberInput[]
  assignmentId?: string
}

export interface AssignmentRepository {
  upsert(input: UpsertAssignmentInput): Promise<string>
  remove(assignmentId: string): Promise<void>
  listByTable(tableId: string): Promise<Assignment[]>
}

export interface PaymentRepository {
  updateStatus(paymentId: string, to: PaymentStatus): Promise<void>
}
