'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/ui/providers/ServicesProvider'
import { tableKey } from '@/ui/hooks/useTableSnapshot'
import type { ClosePayee } from '@/application/services/closing-service'
import type { TableSnapshot } from '@/domain/entities/types'
import { errorMessage } from '@/ui/errors/error-messages'

type Phase = 'idle' | 'validating' | 'closing' | 'error'

/**
 * Orquestra a máquina de estados do fechamento na UI (F6):
 * validar → (dividir sem dono | voltar) → start_closing → motor →
 * close_table. Em falha, reverte para ABERTA (FA-21) e mostra o erro.
 */
export function useClosing(tableId: string) {
  const services = useServices()
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: tableKey(tableId) })
    return services.gateway.fetchSnapshot(tableId)
  }, [queryClient, services, tableId])

  const divideUnassigned = useCallback(
    async (snapshot: TableSnapshot) => {
      await services.closing.divideUnassignedAmongAll(snapshot)
      await refresh()
    },
    [services, refresh],
  )

  const confirm = useCallback(
    async (payee?: ClosePayee) => {
      setPhase('closing')
      setError(null)
      try {
        await services.closing.start(tableId)
        // usa o snapshot mais recente do servidor para calcular (ADR-007)
        const fresh = await services.gateway.fetchSnapshot(tableId)
        await services.closing.finish(fresh, payee)
        await queryClient.invalidateQueries({ queryKey: tableKey(tableId) })
        setPhase('idle')
        return true
      } catch (e) {
        // reverte para ABERTA se ficou preso em FECHANDO (FA-21)
        try {
          await services.closing.cancel(tableId)
        } catch {
          /* já pode ter revertido */
        }
        await queryClient.invalidateQueries({ queryKey: tableKey(tableId) })
        setError(errorMessage(e))
        setPhase('error')
        return false
      }
    },
    [services, tableId, queryClient],
  )

  return { phase, error, divideUnassigned, confirm, setError }
}
