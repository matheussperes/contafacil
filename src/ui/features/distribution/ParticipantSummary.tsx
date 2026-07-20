'use client'

import { Avatar, Card, formatCents } from '@/ui/design-system'
import type { TableView } from '@/ui/hooks/useTableView'

// Resumo por participante (F4): total de cada um, sempre consistente com
// o total da mesa — os valores vêm do motor (useTableView.totals).
export function ParticipantSummary({ view }: { view: TableView }) {
  const { participants, totals } = view
  const shareOf = (id: string) =>
    totals.shares.find((s) => s.participantId === id)

  return (
    <section>
      <h2 className="mb-2 text-[length:var(--text-sm)] font-semibold text-[var(--color-text-muted)]">
        Resumo por pessoa
      </h2>
      <Card className="flex flex-col gap-1 p-2">
        {participants.map((p) => {
          const share = shareOf(p.id)
          return (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-[var(--radius-md)] px-2 py-1.5"
            >
              <span className="flex items-center gap-2">
                <Avatar name={p.name} size="sm" muted={p.status === 'SAIU'} />
                <span className={p.status === 'SAIU' ? 'text-[var(--color-text-muted)]' : ''}>
                  {p.name}
                  {p.status === 'SAIU' && ' (saiu)'}
                </span>
              </span>
              <span className="font-medium tabular-nums">
                {formatCents(share?.totalCents ?? (0 as never))}
              </span>
            </div>
          )
        })}
        {totals.unassignedValueCents > 0 && (
          <div className="flex items-center justify-between rounded-[var(--radius-md)] px-2 py-1.5 text-[var(--color-warning)]">
            <span>Sem dono</span>
            <span className="font-medium tabular-nums">
              {formatCents(totals.unassignedValueCents)}
            </span>
          </div>
        )}
      </Card>
    </section>
  )
}
