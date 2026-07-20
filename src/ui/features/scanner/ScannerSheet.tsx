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
import { effectiveUnitPriceCents, moneyToCents } from '@/infrastructure/nfce/nfce-parser'
import { errorMessage } from '@/ui/errors/error-messages'
import { parseMoneyToCents, parseQuantity } from '@/application/validators/inputs'

type Step = 'scan' | 'loading' | 'review'

const FAIL_MSG: Record<NfceFailureReason, string> = {
  QR_INVALIDO: 'Isso não parece um QR de nota fiscal.',
  SEFAZ_INDISPONIVEL: 'Não conseguimos falar com a SEFAZ.',
  FORMATO_DESCONHECIDO: 'Não reconhecemos o formato da nota.',
  SEM_ITENS: 'Não encontramos itens nessa nota.',
}

/**
 * Item em edição na revisão (F3/RN-060). Quantidade e preço de tabela
 * ficam como texto — os mesmos formatos aceitos no formulário manual
 * (AddItemSheet) — e são validados/convertidos pelo ItemService no
 * confirm(). `itemDiscount` é o desconto atribuído a ESSE item (não por
 * unidade, o valor total da linha) — quem revisa decide qual item teve a
 * promoção, o app não presume (ver comentário no topo do nfce-parser).
 */
interface DraftItem {
  description: string
  quantity: string
  unitPrice: string
  itemDiscount: string
}

/** 1590 → "15,90" — formato aceito por parseMoneyToCents (decimal com vírgula). */
function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function toDraft(item: ParsedNfceItem): DraftItem {
  const gross = Math.round((item.quantityMilli * item.unitPriceCents) / 1000)
  const discount = item.totalCents !== null ? Math.max(0, gross - item.totalCents) : 0
  return {
    description: item.description,
    quantity: formatQuantityMilli(item.quantityMilli),
    unitPrice: centsToInputValue(item.unitPriceCents),
    itemDiscount: discount > 0 ? centsToInputValue(discount) : '',
  }
}

// Scanner NFC-e (F11): scan → parser → revisão → mesa. Qualquer falha cai
// na entrada manual (RN-061) — nunca há beco sem saída. A revisão permite
// editar descrição, quantidade, preço de tabela e o desconto de cada item
// (RN-060: "revê e edita") — inclusive quando a nota só informa um
// desconto agregado (sem dizer qual item foi a promoção): quem revisa
// distribui esse valor manualmente, item por item.
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
  const [noteDiscountTotal, setNoteDiscountTotal] = useState('')

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
    setNoteDiscountTotal(
      result.data.noteDiscountCents !== null
        ? centsToInputValue(result.data.noteDiscountCents)
        : '',
    )
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

  async function confirm() {
    if (items.length === 0) {
      onClose()
      return
    }
    setBusy(true)
    try {
      const resolved = items.map((it) => {
        const discountCents = moneyToCents(it.itemDiscount) ?? 0
        if (discountCents <= 0) return it
        let qtyMilli: number
        let grossUnitPriceCents: number
        try {
          qtyMilli = parseQuantity(it.quantity)
          grossUnitPriceCents = parseMoneyToCents(it.unitPrice)
        } catch {
          return it // deixa o ItemService validar e reportar o erro certo
        }
        const grossTotal = Math.round((qtyMilli * grossUnitPriceCents) / 1000)
        const netTotal = Math.max(1, grossTotal - discountCents)
        const effective = effectiveUnitPriceCents({
          quantityMilli: qtyMilli,
          unitPriceCents: grossUnitPriceCents,
          totalCents: netTotal,
        })
        return { ...it, unitPrice: centsToInputValue(effective) }
      })
      await services.item.addMany(
        resolved.map((it) => ({
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
    setNoteDiscountTotal('')
  }

  const noteDiscountTotalCents = moneyToCents(noteDiscountTotal) ?? 0
  const assignedDiscountCents = items.reduce(
    (sum, it) => sum + (moneyToCents(it.itemDiscount) ?? 0),
    0,
  )
  const remainingDiscountCents = noteDiscountTotalCents - assignedDiscountCents

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
            Confira e ajuste os itens antes de adicionar à mesa. Se a nota
            teve desconto, informe o total abaixo e distribua nos itens
            certos — só quem estava na mesa sabe qual foi a promoção.
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
                <Input
                  aria-label={`Desconto em ${it.description}`}
                  prefix="R$"
                  inputMode="decimal"
                  placeholder="Desconto (opcional)"
                  value={it.itemDiscount}
                  onChange={(e) => updateItem(i, { itemDiscount: e.target.value })}
                />
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
              <Input
                label="Desconto total da nota"
                prefix="R$"
                inputMode="decimal"
                placeholder="0,00"
                value={noteDiscountTotal}
                onChange={(e) => setNoteDiscountTotal(e.target.value)}
              />
              <p
                className={
                  remainingDiscountCents === 0
                    ? 'text-[length:var(--text-sm)] font-medium text-[var(--color-positive)]'
                    : remainingDiscountCents < 0
                      ? 'text-[length:var(--text-sm)] font-medium text-[var(--color-danger)]'
                      : 'text-[length:var(--text-sm)] font-medium text-[var(--color-text)]'
                }
              >
                Desconto a distribuir: R$ {centsToInputValue(remainingDiscountCents)}
              </p>
              {remainingDiscountCents < 0 && (
                <p className="text-[length:var(--text-xs)] text-[var(--color-danger)]">
                  Você distribuiu mais desconto do que o total da nota.
                </p>
              )}
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
