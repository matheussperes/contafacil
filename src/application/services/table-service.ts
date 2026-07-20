/**
 * Casos de uso da mesa (UC-01/02/07 + configuração). Orquestra ports;
 * as regras vivem no domínio e no banco (RN-001..010).
 */
import type {
  CreateTableInput,
  TableConfigPatch,
  TableGateway,
  TablePublicInfo,
} from '@/application/ports/table-gateway'
import type { DeviceStorage, TableSession } from '@/application/ports/device-storage'
import type { Logger } from '@/application/ports/logger'
import type { SettlementMode } from '@/domain/entities/types'
import type { BasisPoints } from '@/domain/money/cents'
import { DomainError } from '@/domain/errors/domain-error'
import {
  parseJoinCode,
  parseParticipantName,
  parsePixKey,
  parseTableName,
} from '@/application/validators/inputs'

export interface CreateTableCommand {
  creatorName: string
  settlementMode: SettlementMode
  tableName?: string
  serviceFeeBp: BasisPoints
  payeePixKey?: string
  establishmentPixKey?: string
}

export class TableService {
  constructor(
    private readonly gateway: TableGateway,
    private readonly storage: DeviceStorage,
    private readonly logger: Logger,
  ) {}

  async create(cmd: CreateTableCommand): Promise<TableSession> {
    const creatorName = parseParticipantName(cmd.creatorName)
    const name = parseTableName(cmd.tableName)
    // RN-003: modo A exige chave — validada aqui e garantida pelo banco
    if (cmd.settlementMode === 'RECEBEDOR_FIXO' && !cmd.payeePixKey) {
      throw new DomainError('CHAVE_PIX_OBRIGATORIA')
    }
    const input: CreateTableInput = {
      creatorName,
      settlementMode: cmd.settlementMode,
      name,
      serviceFeeBp: cmd.serviceFeeBp,
      payeePixKey: cmd.payeePixKey ? parsePixKey(cmd.payeePixKey) : undefined,
      establishmentPixKey: cmd.establishmentPixKey
        ? parsePixKey(cmd.establishmentPixKey)
        : undefined,
    }
    const result = await this.gateway.createTable(input)
    const session: TableSession = {
      tableId: result.tableId,
      joinCode: result.joinCode,
      participantId: result.participantId,
      tableName: name ?? null,
      joinedAt: new Date().toISOString(),
    }
    this.storage.saveSession(session)
    this.logger.info('mesa criada', { tableId: result.tableId })
    return session
  }

  async lookup(joinCodeRaw: string): Promise<TablePublicInfo | null> {
    return this.gateway.getTableByCode(parseJoinCode(joinCodeRaw))
  }

  async join(joinCodeRaw: string, nameRaw: string): Promise<TableSession> {
    const joinCode = parseJoinCode(joinCodeRaw)
    const name = parseParticipantName(nameRaw)
    const result = await this.gateway.joinTable(joinCode, name)
    const session: TableSession = {
      tableId: result.tableId,
      joinCode,
      participantId: result.participantId,
      tableName: null,
      joinedAt: new Date().toISOString(),
    }
    this.storage.saveSession(session)
    this.logger.info('entrou na mesa', {
      tableId: result.tableId,
      rejoined: result.rejoined,
    })
    return session
  }

  async leave(tableId: string): Promise<void> {
    await this.gateway.leaveTable(tableId)
    this.storage.removeSession(tableId)
    this.logger.info('saiu da mesa', { tableId })
  }

  async updateConfig(tableId: string, patch: TableConfigPatch): Promise<void> {
    const clean: TableConfigPatch = {
      ...patch,
      name: patch.name !== undefined ? parseTableName(patch.name) : undefined,
      payeePixKey:
        patch.payeePixKey !== undefined
          ? parsePixKey(patch.payeePixKey)
          : undefined,
      establishmentPixKey:
        patch.establishmentPixKey !== undefined
          ? parsePixKey(patch.establishmentPixKey)
          : undefined,
    }
    await this.gateway.updateConfig(tableId, clean)
  }

  session(tableId: string): TableSession | null {
    return this.storage.getSession(tableId)
  }

  recentSessions(): TableSession[] {
    return this.storage.listRecentSessions()
  }
}
