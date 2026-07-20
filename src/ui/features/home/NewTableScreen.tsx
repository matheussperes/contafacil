'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, useToast } from '@/ui/design-system'
import { useServices } from '@/ui/providers/ServicesProvider'
import { parseServiceFeePercent } from '@/application/validators/inputs'
import { isDomainError } from '@/domain/errors/domain-error'
import { errorMessage } from '@/ui/errors/error-messages'
import type { SettlementMode } from '@/domain/entities/types'

const MODES: { value: SettlementMode; label: string; help: string }[] = [
  { value: 'RECEBEDOR_FIXO', label: 'Eu recebo (PIX)', help: 'Você paga a conta e os outros te reembolsam.' },
  { value: 'RECEBEDOR_NO_FECHAMENTO', label: 'Definir no fim', help: 'Escolhem quem pagou o restaurante no fechamento.' },
  { value: 'PAGAMENTO_DIRETO', label: 'Cada um paga', help: 'Cada pessoa paga sua parte ao estabelecimento.' },
]

// Nova Mesa (F1): nome, modo de acerto, taxa e nome do criador.
export function NewTableScreen() {
  const router = useRouter()
  const services = useServices()
  const toast = useToast()
  const [tableName, setTableName] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [mode, setMode] = useState<SettlementMode>('RECEBEDOR_NO_FECHAMENTO')
  const [pixKey, setPixKey] = useState('')
  const [fee, setFee] = useState('10')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await services.ensureSession()
      const session = await services.table.create({
        creatorName,
        settlementMode: mode,
        tableName,
        serviceFeeBp: parseServiceFeePercent(fee),
        payeePixKey: mode === 'RECEBEDOR_FIXO' ? pixKey : undefined,
      })
      router.push(`/m/${session.joinCode}`)
    } catch (e) {
      setError(errorMessage(e))
      if (!isDomainError(e)) toast.show('Não foi possível criar a mesa', 'danger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <h1 className="text-[length:var(--text-xl)] font-bold">Nova mesa</h1>

      <Input
        label="Nome da mesa (opcional)"
        placeholder="Bar do Zé — sexta"
        value={tableName}
        onChange={(e) => setTableName(e.target.value)}
      />
      <Input
        label="Seu nome"
        placeholder="Como você aparece na mesa"
        value={creatorName}
        onChange={(e) => setCreatorName(e.target.value)}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-[length:var(--text-sm)] font-medium">
          Como vão acertar?
        </legend>
        {MODES.map((m) => (
          <label
            key={m.value}
            className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-md)] border p-3"
          >
            <input
              type="radio"
              name="mode"
              value={m.value}
              checked={mode === m.value}
              onChange={() => setMode(m.value)}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{m.label}</span>
              <span className="block text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                {m.help}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {mode === 'RECEBEDOR_FIXO' && (
        <Input
          label="Sua chave PIX"
          placeholder="email, telefone, CPF ou aleatória"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
        />
      )}

      <Input
        label="Taxa de serviço (%)"
        inputMode="decimal"
        value={fee}
        onChange={(e) => setFee(e.target.value)}
        hint="Padrão 10%. Use 0 se não houver."
      />

      {error && (
        <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <Button
        size="lg"
        fullWidth
        loading={busy}
        disabled={!creatorName.trim()}
        onClick={submit}
      >
        Criar mesa
      </Button>
    </main>
  )
}
