'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  formatCents,
  formatQuantityMilli,
  useToast,
} from '@/ui/design-system'
import { ZERO_CENTS } from '@/domain/money/cents'
import { itemCoverage } from '@/domain/calculator/coverage'
import type { Item } from '@/domain/entities/types'
import { useServices } from '@/ui/providers/ServicesProvider'
import { useTableSnapshot } from '@/ui/hooks/useTableSnapshot'
import { useTableView } from '@/ui/hooks/useTableView'
import { canStartClosing } from '@/domain/entities/table-state'
import dynamic from 'next/dynamic'
import { AddItemSheet } from '@/ui/features/table/AddItemSheet'
import { InviteSheet } from '@/ui/features/table/InviteSheet'
import { DistributionSheet } from '@/ui/features/distribution/DistributionSheet'

// Scanner é pesado (câmera + lib de QR): carrega só quando aberto.
const ScannerSheet = dynamic(
  () => import('@/ui/features/scanner/ScannerSheet').then((m) => m.ScannerSheet),
  { ssr: false },
)
import { ParticipantSummary } from '@/ui/features/distribution/ParticipantSummary'
import { ClosingDialog } from '@/ui/features/closing/ClosingDialog'
import { PaymentsPanel } from '@/ui/features/payment/PaymentsPanel'
import { errorMessage } from '@/ui/errors/error-messages'

// Mesa (F3): tela viva — participantes, itens e resumo em tempo real.
// Distribuição (FASE 08), fechamento (FASE 09) e PIX (FASE 10) ainda não.
export function TableScreen({ tableId }: { tableId: string }) {
  const services = useServices()
  const toast = useToast()
  const router = useRouter()
  const query = useTableSnapshot(tableId)
  const session = services.table.session(tableId)
  const view = useTableView(query.data, session?.participantId ?? null)
  const [addOpen, setAddOpen] = useState(false)
  const [distItem, setDistItem] = useState<Item | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [closingOpen, setClosingOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  if (query.isLoading) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-3 p-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </main>
    )
  }

  if (query.isError || view === null) {
    return (
      <main className="mx-auto max-w-md p-6">
        <ErrorState
          description={query.error ? errorMessage(query.error) : undefined}
          action={{ label: 'Tentar de novo', onClick: () => void query.refetch() }}
        />
      </main>
    )
  }

  const { table, me, participants, items, totals, canEdit, isClosed } = view
  const myShare = totals.shares.find((s) => s.participantId === me?.id)

  async function leave() {
    try {
      await services.table.leave(tableId)
      router.push('/')
    } catch (e) {
      toast.show(errorMessage(e), 'danger')
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 p-4 pb-28">
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-[length:var(--text-xl)] font-bold">
            {table.name ?? 'Mesa'}
          </h1>
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Código {table.joinCode}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isClosed ? (
            <Badge tone="neutral">Fechada</Badge>
          ) : table.status === 'FECHANDO' ? (
            <Badge tone="info">Fechando…</Badge>
          ) : (
            <Badge tone="positive">Aberta</Badge>
          )}
          {view.isEditable && (
            <Button size="sm" variant="secondary" onClick={() => setInviteOpen(true)}>
              Convidar
            </Button>
          )}
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-[length:var(--text-sm)] font-semibold text-[var(--color-text-muted)]">
          Na mesa ({participants.filter((p) => p.status === 'ATIVO').length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5">
              <Avatar name={p.name} size="sm" muted={p.status === 'SAIU'} />
              <span className="text-[length:var(--text-sm)]">
                {p.name}
                {p.role === 'CRIADOR' && ' 👑'}
              </span>
            </span>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text-muted)]">
            Itens
          </h2>
          <span className="text-[length:var(--text-sm)] font-medium">
            {formatCents(totals.subtotalCents)}
          </span>
        </div>
        {items.length === 0 ? (
          <EmptyState
            title="Nenhum item ainda"
            description="Adicione o primeiro item da conta."
            icon="🍺"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const cov = itemCoverage(item, view.assignments)
              return (
                <Card
                  key={item.id}
                  interactive={canEdit}
                  onClick={canEdit ? () => setDistItem(item) : undefined}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
                      {formatQuantityMilli(item.quantityMilli)} ×{' '}
                      {formatCents(item.unitPriceCents)}
                      {item.source === 'NFCE' && ' · nota'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cov.status === 'VAZIO' && <Badge tone="warning">sem dono</Badge>}
                    {cov.status === 'PARCIAL' && <Badge tone="warning">parcial</Badge>}
                    {cov.status === 'COMPLETO' && <Badge tone="positive">dividido</Badge>}
                    <span className="font-medium">{formatCents(item.totalCents)}</span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {items.length > 0 && <ParticipantSummary view={view} />}

      {(view.isClosed || table.status === 'FECHANDO') && (
        <PaymentsPanel tableId={tableId} view={view} />
      )}

      {totals.unassignedValueCents > 0 && (
        <Badge tone="warning">
          {formatCents(totals.unassignedValueCents)} sem dono
        </Badge>
      )}

      <Card className="flex items-center justify-between bg-[var(--color-surface-muted)]">
        <div>
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Sua parte {table.serviceFeeBp > 0 && '(com taxa)'}
          </p>
          <p className="text-[length:var(--text-xl)] font-bold">
            {formatCents(myShare?.totalCents ?? ZERO_CENTS)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            Total da mesa
          </p>
          <p className="font-medium">{formatCents(totals.totalCents)}</p>
        </div>
      </Card>

      {/* Barra de ações fixa */}
      {canEdit && (
        <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md gap-2 border-t bg-[var(--color-surface)] p-3">
          <Button fullWidth onClick={() => setAddOpen(true)}>
            Item
          </Button>
          <Button variant="secondary" onClick={() => setScanOpen(true)}>
            Escanear
          </Button>
          {canStartClosing(table, me, items.length, participants.length) ? (
            <Button variant="secondary" onClick={() => setClosingOpen(true)}>
              Fechar
            </Button>
          ) : (
            <Button variant="ghost" onClick={leave}>
              Sair
            </Button>
          )}
        </div>
      )}

      {me && (
        <AddItemSheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          tableId={tableId}
          createdBy={me.id}
        />
      )}

      {me && (
        <ScannerSheet
          open={scanOpen}
          onClose={() => setScanOpen(false)}
          tableId={tableId}
          createdBy={me.id}
        />
      )}

      {distItem && (
        <DistributionSheet
          open={distItem !== null}
          onClose={() => setDistItem(null)}
          tableId={tableId}
          item={distItem}
          participants={participants}
          existing={itemCoverage(distItem, view.assignments).assignment}
        />
      )}

      <ClosingDialog
        open={closingOpen}
        onClose={() => setClosingOpen(false)}
        tableId={tableId}
        view={view}
      />

      <InviteSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        tableName={table.name}
        joinCode={table.joinCode}
      />
    </main>
  )
}
