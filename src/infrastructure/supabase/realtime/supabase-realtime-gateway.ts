/**
 * RealtimeGateway sobre o Supabase (estrategia-realtime.md).
 *
 * - Um canal por mesa (`table:{id}`), postgres_changes filtrado por
 *   table_id, respeitando RLS.
 * - Traduz mudanças cruas em eventos do domínio (change-translator).
 * - Como membros de distribuição vivem em outra tabela, qualquer
 *   mudança em assignments/assignment_members dispara um refetch da
 *   atribuição completa (com membros) antes de emitir AssignmentChanged
 *   — o reducer nunca recebe atribuição sem membros.
 * - Sinaliza conexão (subscribed/disconnected/reconnected); a UI
 *   ressincroniza o snapshot ao reconectar (FA-90).
 */
import type {
  ConnectionSignal,
  RealtimeGateway,
  RealtimeHandlers,
  RealtimeSubscription,
} from '@/application/ports/realtime'
import type { AssignmentRepository } from '@/application/ports/table-gateway'
import type { AppSupabaseClient } from '@/infrastructure/supabase/client'
import {
  translateChange,
  type ChangeEventType,
  type RawChange,
} from '@/infrastructure/supabase/realtime/change-translator'

interface PostgresChangePayload {
  eventType: ChangeEventType
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
  table: string
}

const WATCHED_TABLES = [
  'tables',
  'participants',
  'items',
  'assignments',
  'assignment_members',
  'payments',
]

export class SupabaseRealtimeGateway implements RealtimeGateway {
  constructor(
    private readonly client: AppSupabaseClient,
    private readonly assignments: AssignmentRepository,
  ) {}

  subscribeToTable(
    tableId: string,
    handlers: RealtimeHandlers,
  ): RealtimeSubscription {
    const channel = this.client.channel(`table:${tableId}`)
    let hadSubscribed = false

    const handleChange = (payload: PostgresChangePayload): void => {
      const change: RawChange = {
        table: payload.table,
        eventType: payload.eventType,
        new: payload.new,
        old: payload.old,
      }
      // membros/atribuições: refetch da atribuição completa (com membros)
      if (
        change.table === 'assignment_members' ||
        change.table === 'assignments'
      ) {
        void this.resolveAssignments(tableId, change, handlers)
        return
      }
      const event = translateChange(change)
      if (event !== null) handlers.onEvent(event)
    }

    for (const table of WATCHED_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `table_id=eq.${tableId}` },
        (payload) => handleChange(payload as unknown as PostgresChangePayload),
      )
    }

    channel.subscribe((status: string) => {
      const signal = mapStatus(status)
      if (signal === null) return
      if (signal === 'subscribed') {
        // resubscribe após queda = 'reconnected' (dispara ressync na UI)
        handlers.onConnection(hadSubscribed ? 'reconnected' : 'subscribed')
        hadSubscribed = true
      } else {
        handlers.onConnection(signal)
      }
    })

    return {
      unsubscribe: () => {
        void this.client.removeChannel(channel)
      },
    }
  }

  private async resolveAssignments(
    tableId: string,
    change: RawChange,
    handlers: RealtimeHandlers,
  ): Promise<void> {
    // DELETE de uma atribuição inteira: emite remoção direta
    if (change.table === 'assignments' && change.eventType === 'DELETE') {
      const id = (change.old as { id?: string } | null)?.id
      if (id) handlers.onEvent({ type: 'AssignmentRemoved', assignmentId: id })
      return
    }
    let affectedId: string | undefined
    if (change.table === 'assignments') {
      affectedId = (change.new as { id?: string } | null)?.id
    } else {
      const memberRow = (change.new ?? change.old) as {
        assignment_id?: string
      } | null
      affectedId = memberRow?.assignment_id
    }
    try {
      const all = await this.assignments.listByTable(tableId)
      const resolved = all.find((a) => a.id === affectedId)
      if (resolved !== undefined) {
        handlers.onEvent({ type: 'AssignmentChanged', assignment: resolved })
      } else if (affectedId !== undefined) {
        handlers.onEvent({
          type: 'AssignmentRemoved',
          assignmentId: affectedId,
        })
      }
    } catch {
      // falha no refetch: a UI ressincroniza no próximo sinal/foco
    }
  }
}

function mapStatus(status: string): ConnectionSignal | null {
  switch (status) {
    case 'SUBSCRIBED':
      return 'subscribed'
    case 'CLOSED':
    case 'CHANNEL_ERROR':
    case 'TIMED_OUT':
      return 'disconnected'
    default:
      return null
  }
}
