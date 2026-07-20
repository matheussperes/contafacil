'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/ui/design-system'
import { useServices } from '@/ui/providers/ServicesProvider'
import { errorMessage } from '@/ui/errors/error-messages'

// Entrar em Mesa (F2): digitar o código e validar antes de pedir o nome.
export function JoinScreen({ initialCode = '' }: { initialCode?: string }) {
  const router = useRouter()
  const services = useServices()
  const [code, setCode] = useState(initialCode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function check() {
    setBusy(true)
    setError(null)
    try {
      await services.ensureSession()
      const info = await services.table.lookup(code)
      if (info === null) {
        setError('Mesa não encontrada. Confira o código.')
        return
      }
      if (info.status !== 'ABERTA') {
        setError('Esta mesa não está mais aberta.')
        return
      }
      router.push(`/m/${code.trim().toUpperCase()}/nome`)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <h1 className="text-[length:var(--text-xl)] font-bold">Entrar em uma mesa</h1>
      <Input
        label="Código da mesa"
        placeholder="Ex.: 7GXK2M"
        value={code}
        autoCapitalize="characters"
        maxLength={6}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        error={error ?? undefined}
      />
      <Button
        size="lg"
        fullWidth
        loading={busy}
        disabled={code.trim().length < 6}
        onClick={check}
      >
        Continuar
      </Button>
    </main>
  )
}
