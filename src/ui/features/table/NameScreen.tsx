'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/ui/design-system'
import { useServices } from '@/ui/providers/ServicesProvider'
import { errorMessage } from '@/ui/errors/error-messages'

// Adicionar Nome (F2): identificação antes de entrar; trata nome duplicado.
export function NameScreen({ joinCode }: { joinCode: string }) {
  const router = useRouter()
  const services = useServices()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function join() {
    setBusy(true)
    setError(null)
    try {
      await services.ensureSession()
      await services.table.join(joinCode, name)
      router.push(`/m/${joinCode}`)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <h1 className="text-[length:var(--text-xl)] font-bold">Qual é o seu nome?</h1>
      <p className="text-[var(--color-text-muted)]">
        É assim que você aparece para a mesa.
      </p>
      <Input
        label="Seu nome"
        placeholder="Ana"
        value={name}
        maxLength={30}
        onChange={(e) => setName(e.target.value)}
        error={error ?? undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && name.trim()) void join()
        }}
      />
      <Button
        size="lg"
        fullWidth
        loading={busy}
        disabled={!name.trim()}
        onClick={join}
      >
        Entrar na mesa
      </Button>
    </main>
  )
}
