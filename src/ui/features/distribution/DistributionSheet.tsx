'use client'

import { useMemo, useState } from 'react'
import {
  Avatar,
  BottomSheet,
  Button,
  formatCents,
  useToast,
} from '@/ui/design-system'
import { useDistribution } from '@/ui/features/distribution/useDistribution'
import { errorMessage } from '@/ui/errors/error-messages'
import { allocate } from '@/domain/calculator/allocate'
import type { Assignment, Item, Participant } from '@/domain/entities/types'

type Mode = 'TODOS' | 'PESSOA' | 'GRUPO'

// Distribui um item entre participantes (F4). Todos/Pessoa/Grupo, com
// proporção opcional no Grupo. A prévia de quanto cada um paga vem do
// motor (allocate) — a UI não calcula à mão.
export function DistributionSheet({
  open,
  onClose,
  tableId,
  item,
  participants,
  existing,
}: {
  open: boolean
  onClose: () => void
  tableId: string
  item: Item
  participants: readonly Participant[]
  existing?: Assignment
}) {
  const dist = useDistribution(tableId)
  const toast = useToast()
  const active = useMemo(
    () => participants.filter((p) => p.status === 'ATIVO'),
    [participants],
  )
  const [mode, setMode] = useState<Mode>(existing?.mode ?? 'TODOS')
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(existing?.members.map((m) => m.participantId) ?? []),
  )
  const [proportional, setProportional] = useState(false)
  const [weights, setWeights] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)

  const memberIds =
    mode === 'TODOS' ? active.map((p) => p.id) : [...selected]

  // prévia: divide o total do item pelos pesos escolhidos (motor)
  const preview = useMemo(() => {
    if (memberIds.length === 0) return new Map<string, number>()
    const ws = memberIds.map((id) =>
      mode === 'GRUPO' && proportional ? Math.max(1, weights[id] ?? 1) : 1,
    )
    try {
      const parts = allocate(item.totalCents, ws)
      return new Map(memberIds.map((id, i) => [id, parts[i] ?? 0]))
    } catch {
      return new Map<string, number>()
    }
  }, [memberIds, mode, proportional, weights, item.totalCents])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (mode === 'PESSOA') {
        next.clear()
        next.add(id)
      } else if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function save() {
    setBusy(true)
    try {
      if (mode === 'TODOS') {
        await dist.assignToAll(item, active, existing?.id)
      } else if (mode === 'PESSOA') {
        const one = [...selected][0]
        if (!one) throw new Error('escolha uma pessoa')
        await dist.assignToPerson(item, one, existing?.id)
      } else {
        const members = [...selected].map((id) => ({
          participantId: id,
          ...(proportional
            ? { weight: Math.max(1, weights[id] ?? 1) }
            : { weight: 1 }),
        }))
        await dist.assignToGroup(item, members, item.quantityMilli, existing?.id)
      }
      toast.show('Distribuição salva', 'positive')
      onClose()
    } catch (e) {
      toast.show(errorMessage(e), 'danger')
    } finally {
      setBusy(false)
    }
  }

  const canSave =
    mode === 'TODOS' || (mode === 'PESSOA' ? selected.size === 1 : selected.size >= 1)

  return (
    <BottomSheet open={open} onClose={onClose} title={`Dividir: ${item.description}`}>
      <div className="flex flex-col gap-4">
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
          Total {formatCents(item.totalCents)}
        </p>

        <div role="tablist" className="flex gap-2">
          {(['TODOS', 'PESSOA', 'GRUPO'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m)
                if (m === 'TODOS') setSelected(new Set())
              }}
              className={
                'flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-[length:var(--text-sm)] ' +
                (mode === m
                  ? 'bg-[var(--color-brand-600)] text-[var(--color-text-inverse)]'
                  : 'bg-[var(--color-surface)]')
              }
            >
              {m === 'TODOS' ? 'Todos' : m === 'PESSOA' ? 'Pessoa' : 'Grupo'}
            </button>
          ))}
        </div>

        {mode === 'GRUPO' && (
          <label className="flex items-center gap-2 text-[length:var(--text-sm)]">
            <input
              type="checkbox"
              checked={proportional}
              onChange={(e) => setProportional(e.target.checked)}
            />
            Dividir por proporção (pesos)
          </label>
        )}

        <ul className="flex flex-col gap-1">
          {active.map((p) => {
            const included =
              mode === 'TODOS' ? true : selected.has(p.id)
            return (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-[var(--radius-md)] px-2 py-1.5"
              >
                <label className="flex items-center gap-2">
                  <input
                    type={mode === 'PESSOA' ? 'radio' : 'checkbox'}
                    name="member"
                    disabled={mode === 'TODOS'}
                    checked={included}
                    onChange={() => toggle(p.id)}
                  />
                  <Avatar name={p.name} size="sm" />
                  <span>{p.name}</span>
                </label>
                <div className="flex items-center gap-2">
                  {mode === 'GRUPO' && proportional && included && (
                    <input
                      aria-label={`Peso de ${p.name}`}
                      type="number"
                      min={1}
                      value={weights[p.id] ?? 1}
                      onChange={(e) =>
                        setWeights((w) => ({
                          ...w,
                          [p.id]: Number(e.target.value),
                        }))
                      }
                      className="w-14 rounded border px-2 py-1 text-[length:var(--text-sm)]"
                    />
                  )}
                  {included && preview.has(p.id) && (
                    <span className="text-[length:var(--text-sm)] font-medium tabular-nums">
                      {formatCents(preview.get(p.id) as never)}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="flex gap-2">
          {existing && (
            <Button
              variant="ghost"
              onClick={async () => {
                await dist.clear(existing.id)
                onClose()
              }}
            >
              Limpar
            </Button>
          )}
          <Button fullWidth loading={busy} disabled={!canSave} onClick={save}>
            Salvar divisão
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
