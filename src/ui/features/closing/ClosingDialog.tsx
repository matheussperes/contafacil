'use client'

import { useState } from 'react'
import {
  Button,
  Dialog,
  Input,
  formatCents,
} from '@/ui/design-system'
import { useClosing } from '@/ui/features/closing/useClosing'
import type { TableView } from '@/ui/hooks/useTableView'

// Fechamento (F6): valida itens sem dono (RN-032 — dividir ou voltar),
// escolhe recebedor no modo B, confirma e dispara o motor + close_table.
export function ClosingDialog({
  open,
  onClose,
  tableId,
  view,
}: {
  open: boolean
  onClose: () => void
  tableId: string
  view: TableView
}) {
  const closing = useClosing(tableId)
  const validation = view
    ? {
        hasUnassigned: view.totals.unassignedValueCents > 0,
        unassignedValueCents: view.totals.unassignedValueCents,
        needsPayeeChoice:
          view.table.settlementMode === 'RECEBEDOR_NO_FECHAMENTO',
      }
    : null
  const [payeeId, setPayeeId] = useState<string>('')
  const [payeePix, setPayeePix] = useState('')

  if (validation === null) return null

  const activeParticipants = view.participants.filter(
    (p) => p.status === 'ATIVO',
  )
  const payeeReady =
    !validation.needsPayeeChoice || (payeeId !== '' && payeePix.trim() !== '')

  async function handleConfirm() {
    const payee =
      validation!.needsPayeeChoice && payeeId
        ? { participantId: payeeId, pixKey: payeePix }
        : undefined
    const ok = await closing.confirm(payee)
    if (ok) onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Fechar a conta"
      description="Isso congela a mesa para todos e gera os pagamentos."
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-muted)]">Total da mesa</span>
          <span className="text-[length:var(--text-lg)] font-bold">
            {formatCents(view.totals.totalCents)}
          </span>
        </div>

        {validation.hasUnassigned && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-warning)] p-3">
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-warning)]">
              {formatCents(view.totals.unassignedValueCents)} sem dono
            </p>
            <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              Escolha o que fazer antes de fechar (RN-032).
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  closing.divideUnassigned({
                    table: view.table,
                    participants: view.participants,
                    items: view.items,
                    assignments: view.assignments,
                    payments: view.payments,
                  })
                }
              >
                Dividir entre todos
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                Voltar e distribuir
              </Button>
            </div>
          </div>
        )}

        {validation.needsPayeeChoice && !validation.hasUnassigned && (
          <div className="flex flex-col gap-2">
            <label className="text-[length:var(--text-sm)] font-medium">
              Quem pagou o estabelecimento?
            </label>
            <select
              value={payeeId}
              onChange={(e) => setPayeeId(e.target.value)}
              className="h-11 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3"
            >
              <option value="">Selecione…</option>
              {activeParticipants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Input
              label="Chave PIX de quem recebe"
              placeholder="email, telefone, CPF ou aleatória"
              value={payeePix}
              onChange={(e) => setPayeePix(e.target.value)}
            />
          </div>
        )}

        {closing.error && (
          <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-danger)]">
            {closing.error} — nada foi alterado, a mesa segue aberta.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={closing.phase === 'closing'}
            disabled={validation.hasUnassigned || !payeeReady}
            onClick={handleConfirm}
          >
            Fechar conta
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
