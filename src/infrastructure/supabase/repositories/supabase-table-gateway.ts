/**
 * Implementação do TableGateway sobre o Supabase (ADR-003): funções RPC
 * da FASE 02 para mutações, selects sob RLS para o snapshot.
 */
import type {
  CreateResult,
  CreateTableInput,
  JoinResult,
  TableConfigPatch,
  TableGateway,
  TablePublicInfo,
} from '@/application/ports/table-gateway'
import type { PaymentDraft } from '@/domain/calculator/table-calculator'
import type { TableSnapshot } from '@/domain/entities/types'
import { DomainError } from '@/domain/errors/domain-error'
import type { AppSupabaseClient } from '@/infrastructure/supabase/client'
import { translating } from '@/infrastructure/supabase/errors'
import {
  mapAssignment,
  mapItem,
  mapParticipant,
  mapPayment,
  mapTable,
} from '@/infrastructure/supabase/mappers'
import type {
  AssignmentMemberRow,
  AssignmentRow,
  ItemRow,
  ParticipantRow,
  PaymentRow,
  TableRow,
} from '@/infrastructure/supabase/database-types'

async function rpc<T>(
  client: AppSupabaseClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<T> {
  return translating(async () => {
    const { data, error } = await client.rpc(fn, args)
    if (error) throw error
    return data as T
  })
}

export class SupabaseTableGateway implements TableGateway {
  constructor(private readonly client: AppSupabaseClient) {}

  async createTable(input: CreateTableInput): Promise<CreateResult> {
    const data = await rpc<{
      table_id: string
      join_code: string
      participant_id: string
    }>(this.client, 'create_table', {
      p_creator_name: input.creatorName,
      p_settlement_mode: input.settlementMode,
      p_name: input.name ?? null,
      p_service_fee_bp: input.serviceFeeBp ?? 1000,
      p_payee_pix_key: input.payeePixKey ?? null,
      p_establishment_pix_key: input.establishmentPixKey ?? null,
    })
    return {
      tableId: data.table_id,
      joinCode: data.join_code,
      participantId: data.participant_id,
    }
  }

  async getTableByCode(joinCode: string): Promise<TablePublicInfo | null> {
    const data = await rpc<{
      id: string
      name: string | null
      status: string
      participants_count: number
    } | null>(this.client, 'get_table_by_code', { p_join_code: joinCode })
    if (data === null) return null
    return {
      id: data.id,
      name: data.name,
      status: data.status,
      participantsCount: data.participants_count,
    }
  }

  async joinTable(joinCode: string, name: string): Promise<JoinResult> {
    const data = await rpc<{
      table_id: string
      participant_id: string
      rejoined: boolean
    }>(this.client, 'join_table', { p_join_code: joinCode, p_name: name })
    return {
      tableId: data.table_id,
      participantId: data.participant_id,
      rejoined: data.rejoined,
    }
  }

  async leaveTable(tableId: string): Promise<void> {
    await rpc(this.client, 'leave_table', { p_table_id: tableId })
  }

  async updateConfig(tableId: string, patch: TableConfigPatch): Promise<void> {
    await rpc(this.client, 'update_table_config', {
      p_table_id: tableId,
      p_name: patch.name ?? null,
      p_settlement_mode: patch.settlementMode ?? null,
      p_service_fee_bp: patch.serviceFeeBp ?? null,
      p_payee_pix_key: patch.payeePixKey ?? null,
      p_establishment_pix_key: patch.establishmentPixKey ?? null,
    })
  }

  async startClosing(tableId: string): Promise<void> {
    await rpc(this.client, 'start_closing', { p_table_id: tableId })
  }

  async cancelClosing(tableId: string): Promise<void> {
    await rpc(this.client, 'cancel_closing', { p_table_id: tableId })
  }

  async closeTable(
    tableId: string,
    shares: readonly PaymentDraft[],
    payee?: { participantId: string; pixKey: string },
  ): Promise<void> {
    await rpc(this.client, 'close_table', {
      p_table_id: tableId,
      p_shares: shares.map((s) => ({
        participant_id: s.participantId,
        amount_cents: s.amountCents,
      })),
      p_payee_participant_id: payee?.participantId ?? null,
      p_payee_pix_key: payee?.pixKey ?? null,
    })
  }

  async fetchSnapshot(tableId: string): Promise<TableSnapshot> {
    return translating(async () => {
      const [table, participants, items, assignments, members, payments] =
        await Promise.all([
          this.client.from('tables').select('*').eq('id', tableId).maybeSingle(),
          this.client.from('participants').select('*').eq('table_id', tableId),
          this.client.from('items').select('*').eq('table_id', tableId),
          this.client.from('assignments').select('*').eq('table_id', tableId),
          this.client
            .from('assignment_members')
            .select('*')
            .eq('table_id', tableId),
          this.client.from('payments').select('*').eq('table_id', tableId),
        ])
      const firstError =
        table.error ??
        participants.error ??
        items.error ??
        assignments.error ??
        members.error ??
        payments.error
      if (firstError) throw firstError
      if (table.data === null) {
        throw new DomainError('MESA_NAO_ENCONTRADA')
      }
      const memberRows = (members.data ?? []) as AssignmentMemberRow[]
      return {
        table: mapTable(table.data as TableRow),
        participants: ((participants.data ?? []) as ParticipantRow[]).map(
          mapParticipant,
        ),
        items: ((items.data ?? []) as ItemRow[]).map(mapItem),
        assignments: ((assignments.data ?? []) as AssignmentRow[]).map((a) =>
          mapAssignment(a, memberRows),
        ),
        payments: ((payments.data ?? []) as PaymentRow[]).map(mapPayment),
      }
    })
  }
}
