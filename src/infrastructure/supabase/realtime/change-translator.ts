/**
 * Tradução de mudanças cruas do Postgres (postgres_changes) para os
 * eventos tipados do domínio (estrategia-realtime.md). Isolada e pura
 * para ser testável sem um socket real.
 */
import type { TableEvent } from '@/application/events/table-events'
import {
  mapAssignment,
  mapItem,
  mapParticipant,
  mapPayment,
  mapTable,
} from '@/infrastructure/supabase/mappers'
import type {
  AssignmentRow,
  ItemRow,
  ParticipantRow,
  PaymentRow,
  TableRow,
} from '@/infrastructure/supabase/database-types'

export type ChangeEventType = 'INSERT' | 'UPDATE' | 'DELETE'

export interface RawChange {
  table: string
  eventType: ChangeEventType
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
}

/**
 * Um único change vira zero ou um TableEvent do domínio.
 * assignment_members não gera evento próprio: a UI recarrega a
 * atribuição afetada (o adapter emite AssignmentChanged ao ver o
 * membro mudar, resolvendo a atribuição via refetch — ver adapter).
 */
export function translateChange(change: RawChange): TableEvent | null {
  const row = change.new ?? change.old
  if (row === null) return null

  switch (change.table) {
    case 'tables': {
      const table = mapTable(change.new as unknown as TableRow)
      return change.eventType === 'INSERT'
        ? { type: 'TableCreated', table }
        : { type: 'TableStateChanged', table }
    }
    case 'participants': {
      const participant = mapParticipant(change.new as unknown as ParticipantRow)
      return participant.status === 'SAIU'
        ? { type: 'ParticipantLeft', participant }
        : { type: 'ParticipantJoined', participant }
    }
    case 'items': {
      if (change.eventType === 'DELETE') {
        return {
          type: 'ItemRemoved',
          itemId: (change.old as unknown as ItemRow).id,
        }
      }
      const item = mapItem(change.new as unknown as ItemRow)
      return change.eventType === 'INSERT'
        ? { type: 'ItemCreated', item }
        : { type: 'ItemUpdated', item }
    }
    case 'assignments': {
      if (change.eventType === 'DELETE') {
        return {
          type: 'AssignmentRemoved',
          assignmentId: (change.old as unknown as AssignmentRow).id,
        }
      }
      // membros vêm em outra tabela; o adapter completa via refetch.
      // Aqui devolvemos a atribuição sem membros (a UI reconcilia).
      const assignment = mapAssignment(change.new as unknown as AssignmentRow, [])
      return { type: 'AssignmentChanged', assignment }
    }
    case 'payments': {
      const payment = mapPayment(change.new as unknown as PaymentRow)
      return { type: 'PaymentUpdated', payment }
    }
    default:
      return null
  }
}
