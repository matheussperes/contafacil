/**
 * Aplica um evento realtime ao snapshot em cache (ADR-005). Idempotente
 * e tolerante a reordenação (FA-91): cada entidade carrega `version`
 * (contador por linha, FASE 02) e o reducer só aceita um evento se ele
 * for MAIS NOVO que o estado atual daquela entidade. O snapshot é a
 * autoridade; eventos são deltas de conveniência.
 */
import type { TableEvent } from '@/application/events/table-events'
import type { TableSnapshot } from '@/domain/entities/types'

interface Versioned {
  id: string
  version: number
}

/** Substitui/insere mantendo o de maior version; ignora o mais antigo. */
function upsertByVersion<T extends Versioned>(
  list: readonly T[],
  incoming: T,
): T[] {
  const idx = list.findIndex((e) => e.id === incoming.id)
  if (idx === -1) return [...list, incoming]
  const current = list[idx]
  if (current !== undefined && incoming.version < current.version) {
    return [...list] // evento atrasado — descarta (FA-91)
  }
  const next = [...list]
  next[idx] = incoming
  return next
}

function removeById<T extends { id: string }>(
  list: readonly T[],
  id: string,
): T[] {
  return list.filter((e) => e.id !== id)
}

export function applyEvent(
  snapshot: TableSnapshot,
  event: TableEvent,
): TableSnapshot {
  switch (event.type) {
    case 'TableCreated':
    case 'TableStateChanged':
      // a mesa é única no snapshot; só avança se a version for maior
      if (event.table.version < snapshot.table.version) return snapshot
      return { ...snapshot, table: event.table }

    case 'ParticipantJoined':
    case 'ParticipantLeft':
      return {
        ...snapshot,
        participants: upsertByVersion(snapshot.participants, event.participant),
      }

    case 'ItemCreated':
    case 'ItemUpdated':
      return { ...snapshot, items: upsertByVersion(snapshot.items, event.item) }

    case 'ItemRemoved':
      return {
        ...snapshot,
        items: removeById(snapshot.items, event.itemId),
        // atribuições do item somem junto (ON DELETE CASCADE no banco)
        assignments: snapshot.assignments.filter(
          (a) => a.itemId !== event.itemId,
        ),
      }

    case 'AssignmentChanged':
      return {
        ...snapshot,
        assignments: upsertByVersion(snapshot.assignments, event.assignment),
      }

    case 'AssignmentRemoved':
      return {
        ...snapshot,
        assignments: removeById(snapshot.assignments, event.assignmentId),
      }

    case 'PaymentUpdated':
      return {
        ...snapshot,
        payments: upsertByVersion(snapshot.payments, event.payment),
      }
  }
}

export function applyEvents(
  snapshot: TableSnapshot,
  events: readonly TableEvent[],
): TableSnapshot {
  return events.reduce(applyEvent, snapshot)
}
