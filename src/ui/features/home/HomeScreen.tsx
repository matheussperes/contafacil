'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, EmptyState } from '@/ui/design-system'
import { useServices } from '@/ui/providers/ServicesProvider'
import type { TableSession } from '@/application/ports/device-storage'

// Home (F1/F2): criar nova mesa ou entrar em uma existente; atalho para
// mesas recentes deste dispositivo.
export function HomeScreen() {
  const router = useRouter()
  const services = useServices()
  const [recent, setRecent] = useState<TableSession[]>([])

  useEffect(() => {
    void services.ensureSession().catch(() => {})
    setRecent(services.table.recentSessions())
  }, [services])

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header className="pt-6 text-center">
        <h1 className="text-[length:var(--text-2xl)] font-bold">ContaFácil</h1>
        <p className="mt-1 text-[var(--color-text-muted)]">
          Divida a conta do bar em tempo real.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Button size="lg" fullWidth onClick={() => router.push('/nova')}>
          Nova mesa
        </Button>
        <Button
          size="lg"
          variant="secondary"
          fullWidth
          onClick={() => router.push('/entrar')}
        >
          Entrar em uma mesa
        </Button>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text-muted)]">
          Mesas recentes
        </h2>
        {recent.length === 0 ? (
          <EmptyState title="Nenhuma mesa ainda" icon="🍻" />
        ) : (
          recent.map((s) => (
            <Card
              key={s.tableId}
              interactive
              onClick={() => router.push(`/m/${s.joinCode}`)}
            >
              <p className="font-medium">{s.tableName ?? 'Mesa'}</p>
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                Código {s.joinCode}
              </p>
            </Card>
          ))
        )}
      </section>
    </main>
  )
}
