'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BottomSheet, Button, Input, useToast } from '@/ui/design-system'
import { useServices } from '@/ui/providers/ServicesProvider'
import { tableKey } from '@/ui/hooks/useTableSnapshot'
import { errorMessage } from '@/ui/errors/error-messages'

// Adiciona item manual à mesa (F3). Fecha e invalida o snapshot; o
// realtime também traz o evento — a invalidação garante consistência.
export function AddItemSheet({
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
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add() {
    setBusy(true)
    setError(null)
    try {
      await services.item.add({
        tableId,
        description,
        quantity,
        unitPrice,
        createdBy,
      })
      await queryClient.invalidateQueries({ queryKey: tableKey(tableId) })
      toast.show('Item adicionado', 'positive')
      setDescription('')
      setQuantity('1')
      setUnitPrice('')
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Adicionar item">
      <div className="flex flex-col gap-3">
        <Input
          label="Descrição"
          placeholder="Chopp 500ml"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex gap-3">
          <Input
            label="Quantidade"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-24"
          />
          <Input
            label="Preço unitário"
            prefix="R$"
            inputMode="decimal"
            placeholder="0,00"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-danger)]">
            {error}
          </p>
        )}
        <Button
          fullWidth
          loading={busy}
          disabled={!description.trim() || !unitPrice.trim()}
          onClick={add}
        >
          Adicionar
        </Button>
      </div>
    </BottomSheet>
  )
}
