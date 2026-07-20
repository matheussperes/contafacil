'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/ui/design-system'
import { useServices } from '@/ui/providers/ServicesProvider'
import { TableScreen } from '@/ui/features/table/TableScreen'

/**
 * Resolve joinCode → tableId. Se este dispositivo já é participante,
 * abre a mesa direto; senão, manda para a identificação (F2/NameScreen).
 */
export function TableRoute({ joinCode }: { joinCode: string }) {
  const services = useServices()
  const router = useRouter()
  const [tableId] = useState<string | null>(() => {
    const found = services.table
      .recentSessions()
      .find((s) => s.joinCode === joinCode)
    return found?.tableId ?? null
  })
  const [checking, setChecking] = useState(tableId === null)

  useEffect(() => {
    if (tableId !== null) return
    let active = true
    void (async () => {
      try {
        await services.ensureSession()
        const info = await services.table.lookup(joinCode)
        if (!active) return
        if (info === null || info.status !== 'ABERTA') {
          router.replace(`/entrar?code=${joinCode}`)
          return
        }
        // ainda não é participante → identificar-se
        router.replace(`/m/${joinCode}/nome`)
      } catch {
        router.replace(`/entrar?code=${joinCode}`)
      } finally {
        if (active) setChecking(false)
      }
    })()
    return () => {
      active = false
    }
  }, [tableId, joinCode, services, router])

  if (tableId === null || checking) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-3 p-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-20 w-full" />
      </main>
    )
  }

  return <TableScreen tableId={tableId} />
}
