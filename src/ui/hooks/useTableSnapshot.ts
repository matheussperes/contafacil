'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useServices } from '@/ui/providers/ServicesProvider'
import { applyEvent } from '@/application/events/snapshot-reducer'
import type { TableEvent } from '@/application/events/table-events'
import type { TableSnapshot } from '@/domain/entities/types'

export const tableKey = (id: string) => ['table', id] as const

/**
 * Fonte de verdade da tela da mesa (ADR-005): o snapshot completo vive
 * no cache da Query; o realtime escreve nele. Na reconexão, refetch do
 * snapshot antes de voltar a aplicar eventos (FA-90).
 */
export function useTableSnapshot(tableId: string) {
  const services = useServices()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: tableKey(tableId),
    queryFn: () => services.gateway.fetchSnapshot(tableId),
    enabled: Boolean(tableId),
  })

  useEffect(() => {
    if (!tableId) return
    const sub = services.realtime.subscribeToTable(tableId, {
      onEvent: (event: TableEvent) => {
        queryClient.setQueryData<TableSnapshot>(tableKey(tableId), (prev) =>
          prev ? applyEvent(prev, event) : prev,
        )
      },
      onConnection: (signal) => {
        // reconexão: ressincroniza o snapshot completo (FA-90)
        if (signal === 'reconnected') {
          void queryClient.invalidateQueries({ queryKey: tableKey(tableId) })
        }
      },
    })
    return () => sub.unsubscribe()
  }, [tableId, queryClient, services])

  return query
}
