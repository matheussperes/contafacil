'use client'

import { useMemo, useState } from 'react'
import {
  BottomSheet,
  Button,
  QrCode,
  formatCents,
  useToast,
} from '@/ui/design-system'
import { useServices } from '@/ui/providers/ServicesProvider'
import { paymentBrCode } from '@/domain/pix/payment-brcode'
import type { Payment } from '@/domain/entities/types'
import type { TableView } from '@/ui/hooks/useTableView'
import { errorMessage } from '@/ui/errors/error-messages'

// Pagamento (F7): valor exato, PIX copia-e-cola + QR (se houver chave) e
// as ações de status permitidas ao participante deste dispositivo
// (RN-051/052/053). As transições vêm do domínio (availablePaymentActions).
export function PaymentSheet({
  open,
  onClose,
  payment,
  view,
}: {
  open: boolean
  onClose: () => void
  payment: Payment
  view: TableView
}) {
  const services = useServices()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const payee = view.participants.find(
    (p) => p.id === view.table.payeeParticipantId,
  )
  const pix = useMemo(
    () => paymentBrCode(view.table, payment, payee),
    [view.table, payment, payee],
  )
  const actions = services.payment.actionsFor(
    view.table,
    payment,
    view.me ? { id: view.me.id } : undefined,
  )

  async function copy() {
    if (!pix.brCode) return
    try {
      await navigator.clipboard.writeText(pix.brCode)
      toast.show('Código PIX copiado', 'positive')
    } catch {
      toast.show('Não foi possível copiar', 'danger')
    }
  }

  async function act(intent: (typeof actions)[number]['intent']) {
    if (!view.me) return
    setBusy(true)
    try {
      await services.payment.act(view.table, payment, { id: view.me.id }, intent)
      toast.show('Status atualizado', 'positive')
      onClose()
    } catch (e) {
      toast.show(errorMessage(e), 'danger')
    } finally {
      setBusy(false)
    }
  }

  const payerName =
    view.participants.find((p) => p.id === payment.participantId)?.name ?? ''

  return (
    <BottomSheet open={open} onClose={onClose} title={`Pagamento de ${payerName}`}>
      <div className="flex flex-col items-center gap-4">
        <p className="text-[length:var(--text-2xl)] font-bold">
          {formatCents(payment.amountCents)}
        </p>

        {pix.brCode ? (
          <>
            <QrCode value={pix.brCode} alt="QR Code PIX" />
            <div className="w-full">
              <p className="mb-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                PIX copia e cola
              </p>
              <code className="block max-h-24 w-full overflow-y-auto break-all rounded-[var(--radius-md)] bg-[var(--color-surface-inset)] p-2 text-[length:var(--text-xs)]">
                {pix.brCode}
              </code>
              <Button fullWidth variant="secondary" className="mt-2" onClick={copy}>
                Copiar código
              </Button>
            </div>
          </>
        ) : (
          <p className="text-center text-[var(--color-text-muted)]">
            Pague {formatCents(payment.amountCents)} ao estabelecimento — PIX,
            cartão ou outro meio — e marque como pago.
          </p>
        )}

        {actions.length > 0 && (
          <div className="flex w-full flex-col gap-2">
            {actions.map((a) => (
              <Button
                key={a.intent}
                fullWidth
                variant={a.intent === 'REJEITAR' ? 'ghost' : 'primary'}
                loading={busy}
                onClick={() => act(a.intent)}
              >
                {a.intent === 'INFORMAR' && 'Já paguei'}
                {a.intent === 'PAGAR' && 'Já paguei'}
                {a.intent === 'CONFIRMAR' && 'Recebi'}
                {a.intent === 'REJEITAR' && 'Não recebi'}
              </Button>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
