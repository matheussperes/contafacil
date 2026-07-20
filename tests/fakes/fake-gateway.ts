/**
 * Dublês em memória dos ports (ADR-010). Permitem testar os services
 * sem banco, verificando orquestração e tradução de erros.
 */
import type {
  AssignmentRepository,
  CreateResult,
  CreateTableInput,
  ItemRepository,
  ItemPatch,
  JoinResult,
  NewItemInput,
  PaymentRepository,
  TableConfigPatch,
  TableGateway,
  TablePublicInfo,
  UpsertAssignmentInput,
} from '@/application/ports/table-gateway'
import type { PaymentDraft } from '@/domain/calculator/table-calculator'
import type {
  Assignment,
  Item,
  PaymentStatus,
  TableSnapshot,
} from '@/domain/entities/types'
import type {
  DeviceStorage,
  TableSession,
} from '@/application/ports/device-storage'
import { cents, quantityMilli } from '@/domain/money/cents'
import { DomainError } from '@/domain/errors/domain-error'

export class FakeTableGateway implements TableGateway {
  createTableCalls: CreateTableInput[] = []
  closeTableCalls: {
    tableId: string
    shares: readonly PaymentDraft[]
    payee?: { participantId: string; pixKey: string }
  }[] = []
  snapshots = new Map<string, TableSnapshot>()
  lookupResult: TablePublicInfo | null = null
  private seq = 0

  async createTable(input: CreateTableInput): Promise<CreateResult> {
    this.createTableCalls.push(input)
    this.seq += 1
    return {
      tableId: `t${this.seq}`,
      joinCode: 'ABC234',
      participantId: `p${this.seq}`,
    }
  }
  async getTableByCode(): Promise<TablePublicInfo | null> {
    return this.lookupResult
  }
  async joinTable(_code: string, _name: string): Promise<JoinResult> {
    this.seq += 1
    return { tableId: 't1', participantId: `p${this.seq}`, rejoined: false }
  }
  async leaveTable(): Promise<void> {}
  async updateConfig(_id: string, _patch: TableConfigPatch): Promise<void> {}
  async startClosing(): Promise<void> {}
  async cancelClosing(): Promise<void> {}
  async closeTable(
    tableId: string,
    shares: readonly PaymentDraft[],
    payee?: { participantId: string; pixKey: string },
  ): Promise<void> {
    this.closeTableCalls.push({ tableId, shares, payee })
  }
  async fetchSnapshot(tableId: string): Promise<TableSnapshot> {
    const snap = this.snapshots.get(tableId)
    if (!snap) throw new DomainError('MESA_NAO_ENCONTRADA')
    return snap
  }
}

export class FakeItemRepository implements ItemRepository {
  inserted: NewItemInput[] = []
  private seq = 0
  private make(input: NewItemInput): Item {
    this.seq += 1
    return {
      id: `item${this.seq}`,
      tableId: input.tableId,
      description: input.description,
      quantityMilli: input.quantityMilli,
      unitPriceCents: input.unitPriceCents,
      totalCents: cents(
        Math.round((input.quantityMilli / 1000) * input.unitPriceCents),
      ),
      source: input.source ?? 'MANUAL',
      createdBy: input.createdBy ?? null,
      version: 1,
    }
  }
  async insert(input: NewItemInput): Promise<Item> {
    this.inserted.push(input)
    return this.make(input)
  }
  async insertMany(inputs: readonly NewItemInput[]): Promise<Item[]> {
    return Promise.all(inputs.map((i) => this.insert(i)))
  }
  async update(itemId: string, patch: ItemPatch): Promise<Item> {
    return this.make({
      tableId: 't1',
      description: patch.description ?? 'x',
      quantityMilli: patch.quantityMilli ?? quantityMilli(1000),
      unitPriceCents: patch.unitPriceCents ?? cents(100),
    })
  }
  async remove(): Promise<void> {}
}

export class FakeAssignmentRepository implements AssignmentRepository {
  upserts: UpsertAssignmentInput[] = []
  async upsert(input: UpsertAssignmentInput): Promise<string> {
    this.upserts.push(input)
    return 'a1'
  }
  async remove(): Promise<void> {}
  async listByTable(): Promise<Assignment[]> {
    return []
  }
}

export class FakePaymentRepository implements PaymentRepository {
  updates: { paymentId: string; to: PaymentStatus }[] = []
  async updateStatus(paymentId: string, to: PaymentStatus): Promise<void> {
    this.updates.push({ paymentId, to })
  }
}

export class FakeDeviceStorage implements DeviceStorage {
  sessions = new Map<string, TableSession>()
  getSession(tableId: string): TableSession | null {
    return this.sessions.get(tableId) ?? null
  }
  saveSession(session: TableSession): void {
    this.sessions.set(session.tableId, session)
  }
  listRecentSessions(): TableSession[] {
    return [...this.sessions.values()]
  }
  removeSession(tableId: string): void {
    this.sessions.delete(tableId)
  }
}

export const silentLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
}
