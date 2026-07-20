'use client'

import { useMemo } from 'react'
import type { TableSnapshot } from '@/domain/entities/types'
import {
  canParticipate,
  isTableClosed,
  isTableEditable,
  isTableFrozen,
} from '@/domain/entities/table-state'
import { computeTableTotals } from '@/domain/calculator/table-calculator'

/**
 * Deriva, do snapshot + id do participante deste dispositivo, tudo o que
 * a UI precisa — SEM reimplementar regra (usa seletores/motor do
 * domínio). Totais por participante vêm do motor (ADR-005/008).
 */
export function useTableView(
  snapshot: TableSnapshot | undefined,
  myParticipantId: string | null,
) {
  return useMemo(() => {
    if (snapshot === undefined) return null
    const me = snapshot.participants.find((p) => p.id === myParticipantId)
    const totals = computeTableTotals({
      table: snapshot.table,
      participants: snapshot.participants,
      items: snapshot.items,
      assignments: snapshot.assignments,
    })
    return {
      table: snapshot.table,
      me,
      participants: [...snapshot.participants].sort(
        (a, b) => a.joinOrder - b.joinOrder,
      ),
      items: snapshot.items,
      assignments: snapshot.assignments,
      payments: snapshot.payments,
      totals,
      canEdit: canParticipate(snapshot.table, me),
      isEditable: isTableEditable(snapshot.table),
      isFrozen: isTableFrozen(snapshot.table),
      isClosed: isTableClosed(snapshot.table),
    }
  }, [snapshot, myParticipantId])
}

export type TableView = NonNullable<ReturnType<typeof useTableView>>
