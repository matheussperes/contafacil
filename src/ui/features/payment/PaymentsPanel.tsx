'use client'

import { Badge, Card, formatCents } from '@/ui/design-system'
import type { TableView } from '@/ui/hooks/useTableView'
import type { PaymentStatus } from '@/domain/entities/types'
import { isSettled } from '@/domain/entities/payment-state'

// Painel de pagamentos da mesa fechada (F6/F8). Nesta fase mostra valores
// e status (somente leitura); a FASE 10 acrescenta PIX e a mudança de
// status por papel.
const STATUS_TONE: Record<PaymentStatus, 'neutral' | 'warning' | 'positive'> = {
  PENDENTE: 'warning',
  INFORMADO: 'neutral',
  PAGO: 'positive',
}
const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDENTE: 'Pendente',
  INFORMADO: 'Informado',
  PAGO: 'Pago',
}

export function PaymentsPanel({ view }: { tableId: string; view: TableView }) {
  const nameOf = (id: string) =>
    view.participants.find((p) => p.id === id)?.name ?? '—'
  const settled = isSettled(view.payments)

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text-muted)]">
          Pagamentos
        </h2>
        {settled && <Badge tone="positive">Tudo quitado 🎉</Badge>}
      </div>
      {view.payments.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Gerando pagamentos…
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {view.payments.map((pay) => (
            <Card key={pay.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{nameOf(pay.participantId)}</p>
                <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                  {formatCents(pay.amountCents)}
                </p>
              </div>
              <Badge tone={STATUS_TONE[pay.status]}>
                {STATUS_LABEL[pay.status]}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
