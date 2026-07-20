'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/ui/providers/ServicesProvider'
import { tableKey } from '@/ui/hooks/useTableSnapshot'
import type { AssignmentMemberInput } from '@/application/ports/table-gateway'
import type { Item, Participant } from '@/domain/entities/types'
import type { QuantityMilli } from '@/domain/money/cents'

/**
 * Ações de distribuição (FASE 08). Cada ação escreve via service e
 * invalida o snapshot; o realtime também propaga. A UI nunca calcula
 * partes — só monta a intenção; o motor (FASE 03) calcula o resumo.
 */
export function useDistribution(tableId: string) {
  const services = useServices()
  const queryClient = useQueryClient()

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: tableKey(tableId) }),
    [queryClient, tableId],
  )

  const assignToAll = useCallback(
    async (
      item: Pick<Item, 'id' | 'quantityMilli'>,
      participants: readonly Pick<Participant, 'id' | 'status'>[],
      assignmentId?: string,
    ) => {
      await services.assignment.assignToAll(item, participants, undefined, assignmentId)
      await refresh()
    },
    [services, refresh],
  )

  const assignToPerson = useCallback(
    async (
      item: Pick<Item, 'id' | 'quantityMilli'>,
      participantId: string,
      assignmentId?: string,
    ) => {
      await services.assignment.assignToPerson(item, participantId, undefined, assignmentId)
      await refresh()
    },
    [services, refresh],
  )

  const assignToGroup = useCallback(
    async (
      item: Pick<Item, 'id' | 'quantityMilli'>,
      members: readonly AssignmentMemberInput[],
      quantityMilli: QuantityMilli,
      assignmentId?: string,
    ) => {
      await services.assignment.assignToGroup(item, members, quantityMilli, assignmentId)
      await refresh()
    },
    [services, refresh],
  )

  const clear = useCallback(
    async (assignmentId: string) => {
      await services.assignment.remove(assignmentId)
      await refresh()
    },
    [services, refresh],
  )

  return { assignToAll, assignToPerson, assignToGroup, clear }
}
