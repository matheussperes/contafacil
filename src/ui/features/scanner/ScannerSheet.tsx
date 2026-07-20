'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  BottomSheet,
  Button,
  Input,
  formatCents,
  formatQuantityMilli,
  useToast,
} from '@/ui/design-system'
import { QrScanner } from '@/ui/features/scanner/QrScanner'
import { useServices } from '@/ui/providers/ServicesProvider'
import { tableKey } from '@/ui/hooks/useTableSnapshot'
import type { ParsedNfceItem, NfceFailureReason } from '@/application/nfce/nfce-types'
import { errorMessage } from '@/ui/errors/error-messages'

type Step = 'scan' | 'loading' | 'review'

const FAIL_MSG: Record<NfceFailureReason, string> = {
  QR_INVALIDO: 'Isso não parece um QR de nota fiscal.',
  SEFAZ_INDISPONIVEL: 'Não conseguimos falar com a SEFAZ.',
  FORMATO_DESCONHECIDO: 'Não reconhecemos o formato da nota.',
  SEM_ITENS: 'Não encontramos itens nessa nota.',
}

// Scanner NFC-e (F11): scan → parser → revisão → mesa. Qualquer falha cai
// na entrada manual (RN-061) — nunca há beco sem saída.
export function ScannerSheet({
  open,
  onClose,
  tableId,
  createdBy,
}: {
  open: boolean
  onClose: () => void
  tableId: string
  createdBy: string
}) {
  const services = useServices()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('scan')
  const [items, setItems] = useState<ParsedNfceItem[]>([])
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleDetected(text: string) {
    setStep('loading')
    setFailure(null)
    const result = await services.nfce.importFromUrl(text)
    if (!result.ok) {
      setFailure(FAIL_MSG[result.reason])
      setStep('scan')
      return
    }
    setItems(result.data.items)
    setStep('review')
  }

  function updateItem(index: number, patch: Partial<ParsedNfceItem>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    )
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function confirm() {
    if (items.length === 0) {
      onClose()
      return
    }
    setBusy(true)
    try {
      await services.item.addMany(
        items.map((it) => ({
          tableId,
          description: it.description,
          quantity: it.quantityMilli / 1000,
          unitPrice: it.unitPriceCents / 100,
          source: 'NFCE' as const,
          createdBy,
        })),
      )
      await queryClient.invalidateQueries({ queryKey: tableKey(tableId) })
      toast.show(`${items.length} itens adicionados`, 'positive')
      reset()
      onClose()
    } catch (e) {
      toast.show(errorMessage(e), 'danger')
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setStep('scan')
    setItems([])
    setFailure(null)
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Escanear nota fiscal"
    >
      {step === 'scan' && (
        <div className="flex flex-col gap-3">
          {failure && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-warning)] p-3">
              <p className="text-[length:var(--text-sm)] text-[var(--color-warning)]">
                {failure}
              </p>
              <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                Você pode tentar de novo ou adicionar os itens manualmente.
              </p>
            </div>
          )}
          <QrScanner onDetected={handleDetected} />
          <Button variant="ghost" onClick={onClose}>
            Adicionar manualmente
          </Button>
        </div>
      )}

      {step === 'loading' && (
        <p className="py-8 text-center text-[var(--color-text-muted)]">
          Lendo a nota…
        </p>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-3">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Confira os itens antes de adicionar à mesa.
          </p>
          <ul className="flex flex-col gap-2">
            {items.map((it, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-[var(--radius-md)] border p-2"
              >
                <Input
                  aria-label="Descrição"
                  value={it.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  className="flex-1"
                />
                <span className="whitespace-nowrap text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                  {formatQuantityMilli(it.quantityMilli)} ×{' '}
                  {formatCents(it.unitPriceCents as never)}
                </span>
                <button
                  aria-label={`Remover ${it.description}`}
                  onClick={() => removeItem(i)}
                  className="px-2 text-[var(--color-danger)]"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {items.length === 0 && (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Nenhum item — nada será adicionado.
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reset}>
              Escanear de novo
            </Button>
            <Button fullWidth loading={busy} onClick={confirm}>
              Adicionar {items.length > 0 ? `${items.length} itens` : ''}
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
