'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  BottomSheet,
  Button,
  Input,
  formatQuantityMilli,
  useToast,
} from '@/ui/design-system'
import { QrScanner } from '@/ui/features/scanner/QrScanner'
import { useServices } from '@/ui/providers/ServicesProvider'
import { tableKey } from '@/ui/hooks/useTableSnapshot'
import type { ParsedNfceItem, NfceFailureReason } from '@/application/nfce/nfce-types'
import { effectiveUnitPriceCents } from '@/infrastructure/nfce/nfce-parser'
import { errorMessage } from '@/ui/errors/error-messages'
import { parseMoneyToCents, parseQuantity } from '@/application/validators/inputs'
import { allocate } from '@/domain/calculator/allocate'
import { cents } from '@/domain/money/cents'

type Step = 'scan' | 'loading' | 'review'

const FAIL_MSG: Record<NfceFailureReason, string> = {
  QR_INVALIDO: 'Isso não parece um QR de nota fiscal.',
  SEFAZ_INDISPONIVEL: 'Não conseguimos falar com a SEFAZ.',
  FORMATO_DESCONHECIDO: 'Não reconhecemos o formato da nota.',
  SEM_ITENS: 'Não encontramos itens nessa nota.',
}

/**
 * Item em edição na revisão (F3/RN-060). Quantidade e preço ficam como
 * texto — os mesmos formatos aceitos no formulário manual (AddItemSheet)
 * — e são validados/convertidos pelo ItemService no confirm(), único
 * lugar que faz esse parsing (sem duplicar regra aqui).
 */
interface DraftItem {
  description: string
  quantity: string
  unitPrice: string
  /** true quando o preço já veio ajustado por desconto da nota */
  discounted: boolean
}

/** 1590 → "15,90" — formato aceito por parseMoneyToCents (decimal com vírgula). */
function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function toDraft(item: ParsedNfceItem): DraftItem {
  const effective = effectiveUnitPriceCents(item)
  return {
    description: item.description,
    quantity: formatQuantityMilli(item.quantityMilli),
    unitPrice: centsToInputValue(effective),
    discounted: effective !== item.unitPriceCents,
  }
}

// Scanner NFC-e (F11): scan → parser → revisão → mesa. Qualquer falha cai
// na entrada manual (RN-061) — nunca há beco sem saída. A revisão permite
// editar descrição, quantidade e preço (RN-060: "revê e edita"), inclusive
// para corrigir descontos que o parser não tenha identificado sozinho.
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
  const [items, setItems] = useState<DraftItem[]>([])
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [noteDiscount, setNoteDiscount] = useState('')

  async function handleDetected(text: string) {
    setStep('loading')
    setFailure(null)
    const result = await services.nfce.importFromUrl(text)
    if (!result.ok) {
      setFailure(FAIL_MSG[result.reason])
      setStep('scan')
      return
    }
    setItems(result.data.items.map(toDraft))
    setStep('review')
  }

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    )
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  /**
   * Rede de segurança quando o parser não identifica o desconto sozinho
   * (a nota do usuário não bate no formato que o parser reconhece): quem
   * revisa digita o valor total do desconto impresso na nota, e ele é
   * rateado entre os itens listados pelo mesmo método (`allocate`) usado
   * automaticamente — trata os preços atuais como o bruto a ratear.
   */
  function applyNoteDiscount(discountCents: number) {
    setItems((prev) => {
      const grossTotals = prev.map((it) => {
        try {
          const qty = parseQuantity(it.quantity)
          const price = parseMoneyToCents(it.unitPrice)
          return Math.round((qty * price) / 1000)
        } catch {
          return 0
        }
      })
      const grossSum = grossTotals.reduce((a, b) => a + b, 0)
      if (discountCents <= 0 || grossSum <= 0 || discountCents >= grossSum) {
        toast.show('Desconto inválido para os itens atuais', 'danger')
        return prev
      }
      const shares = allocate(cents(discountCents), grossTotals)
      return prev.map((it, i) => {
        const gross = grossTotals[i] ?? 0
        const share = shares[i] ?? 0
        const net = gross - share
        if (net < 1) return it
        let qtyMilli: number
        try {
          qtyMilli = parseQuantity(it.quantity)
        } catch {
          return it
        }
        return {
          ...it,
          unitPrice: centsToInputValue(Math.max(1, Math.round((net * 1000) / qtyMilli))),
          discounted: true,
        }
      })
    })
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
          quantity: it.quantity,
          unitPrice: it.unitPrice,
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
    setNoteDiscount('')
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
            Confira e ajuste os itens antes de adicionar à mesa. Preços com
            desconto na nota já vêm ajustados — mas você pode corrigir
            qualquer valor à mão.
          </p>
          <ul className="flex flex-col gap-2">
            {items.map((it, i) => (
              <li
                key={i}
                className="flex flex-col gap-2 rounded-[var(--radius-md)] border p-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Descrição"
                    value={it.description}
                    onChange={(e) =>
                      updateItem(i, { description: e.target.value })
                    }
                    className="flex-1"
                  />
                  <button
                    aria-label={`Remover ${it.description}`}
                    onClick={() => removeItem(i)}
                    className="px-2 text-[var(--color-danger)]"
                  >
                    ×
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Quantidade"
                    inputMode="decimal"
                    value={it.quantity}
                    onChange={(e) => updateItem(i, { quantity: e.target.value })}
                    className="w-20"
                  />
                  <Input
                    aria-label="Preço unitário"
                    prefix="R$"
                    inputMode="decimal"
                    value={it.unitPrice}
                    onChange={(e) => updateItem(i, { unitPrice: e.target.value })}
                    className="flex-1"
                  />
                </div>
                {it.discounted && (
                  <p className="text-[length:var(--text-xs)] text-[var(--color-positive)]">
                    Preço ajustado pelo desconto da nota
                  </p>
                )}
              </li>
            ))}
          </ul>
          {items.length === 0 && (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Nenhum item — nada será adicionado.
            </p>
          )}
          {items.length > 0 && (
            <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-dashed p-2">
              <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                A nota teve desconto e não apareceu nos preços acima? Digite o
                valor total do desconto — ele é rateado entre os itens
                listados.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  aria-label="Desconto total da nota"
                  prefix="R$"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={noteDiscount}
                  onChange={(e) => setNoteDiscount(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    let discountCents: number
                    try {
                      discountCents = parseMoneyToCents(noteDiscount)
                    } catch {
                      toast.show('Desconto inválido', 'danger')
                      return
                    }
                    applyNoteDiscount(discountCents)
                    setNoteDiscount('')
                  }}
                >
                  Ratear desconto
                </Button>
              </div>
            </div>
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
