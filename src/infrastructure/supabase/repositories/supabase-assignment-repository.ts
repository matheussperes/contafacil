/**
 * AssignmentRepository sobre o Supabase. A escrita de atribuição + membros
 * é atômica via RPC upsert_assignment (FASE 02): validações diferidas
 * rodam no commit da mesma transação.
 */
import type {
  AssignmentRepository,
  UpsertAssignmentInput,
} from '@/application/ports/table-gateway'
import type { Assignment } from '@/domain/entities/types'
import type { AppSupabaseClient } from '@/infrastructure/supabase/client'
import { translating } from '@/infrastructure/supabase/errors'
import {
  mapAssignment,
  milliToNumeric,
} from '@/infrastructure/supabase/mappers'
import type {
  AssignmentMemberRow,
  AssignmentRow,
} from '@/infrastructure/supabase/database-types'

export class SupabaseAssignmentRepository implements AssignmentRepository {
  constructor(private readonly client: AppSupabaseClient) {}

  async upsert(input: UpsertAssignmentInput): Promise<string> {
    return translating(async () => {
      const { data, error } = await this.client.rpc('upsert_assignment', {
        p_item_id: input.itemId,
        p_mode: input.mode,
        p_quantity: milliToNumeric(input.quantityMilli),
        p_members: input.members.map((m) => ({
          participant_id: m.participantId,
          quantity:
            m.quantityMilli !== undefined
              ? milliToNumeric(m.quantityMilli)
              : null,
          weight: m.weight ?? null,
        })),
        p_assignment_id: input.assignmentId ?? null,
      })
      if (error) throw error
      return data as string
    })
  }

  async remove(assignmentId: string): Promise<void> {
    await translating(async () => {
      const { error } = await this.client
        .from('assignments')
        .delete()
        .eq('id', assignmentId)
      if (error) throw error
      return null
    })
  }

  async listByTable(tableId: string): Promise<Assignment[]> {
    return translating(async () => {
      const [assignments, members] = await Promise.all([
        this.client.from('assignments').select('*').eq('table_id', tableId),
        this.client
          .from('assignment_members')
          .select('*')
          .eq('table_id', tableId),
      ])
      if (assignments.error) throw assignments.error
      if (members.error) throw members.error
      const memberRows = (members.data ?? []) as AssignmentMemberRow[]
      return ((assignments.data ?? []) as AssignmentRow[]).map((a) =>
        mapAssignment(a, memberRows),
      )
    })
  }
}
