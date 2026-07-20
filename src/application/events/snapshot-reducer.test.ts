import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  applyEvent,
  applyEvents,
} from '@/application/events/snapshot-reducer'
import type { TableEvent } from '@/application/events/table-events'
import type { Item, Participant, TableSnapshot } from '@/domain/entities/types'
import { basisPoints, cents, quantityMilli } from '@/domain/money/cents'

function emptySnapshot(): TableSnapshot {
  return {
    table: {
      id: 't1',
      joinCode: 'ABC234',
      name: 'Bar',
      status: 'ABERTA',
      settlementMode: 'PAGAMENTO_DIRETO',
      serviceFeeBp: basisPoints(1000),
      payeeParticipantId: null,
      payeePixKey: null,
      establishmentPixKey: null,
      closedAt: null,
      version: 1,
    },
    participants: [],
    items: [],
    assignments: [],
    payments: [],
  }
}

function item(id: string, version: number, price = 1000): Item {
  return {
    id,
    tableId: 't1',
    description: id,
    quantityMilli: quantityMilli(1000),
    unitPriceCents: cents(price),
    totalCents: cents(price),
    source: 'MANUAL',
    createdBy: null,
    version,
  }
}

function participant(id: string, version: number): Participant {
  return {
    id,
    tableId: 't1',
    name: id,
    status: 'ATIVO',
    role: 'MEMBRO',
    joinOrder: version,
    version,
  }
}

describe('reducer — aplicação básica', () => {
  it('ItemCreated insere; ItemUpdated substitui; ItemRemoved remove', () => {
    let s = emptySnapshot()
    s = applyEvent(s, { type: 'ItemCreated', item: item('i1', 1) })
    expect(s.items).toHaveLength(1)
    s = applyEvent(s, { type: 'ItemUpdated', item: item('i1', 2, 2000) })
    expect(s.items[0]?.unitPriceCents).toBe(2000)
    s = applyEvent(s, { type: 'ItemRemoved', itemId: 'i1' })
    expect(s.items).toHaveLength(0)
  })

  it('ItemRemoved leva junto as atribuições do item (cascade)', () => {
    let s = emptySnapshot()
    s = applyEvent(s, { type: 'ItemCreated', item: item('i1', 1) })
    s = applyEvent(s, {
      type: 'AssignmentChanged',
      assignment: {
        id: 'a1',
        tableId: 't1',
        itemId: 'i1',
        mode: 'TODOS',
        quantityMilli: quantityMilli(1000),
        members: [{ participantId: 'p1', quantityMilli: null, weight: 1 }],
        version: 1,
      },
    })
    s = applyEvent(s, { type: 'ItemRemoved', itemId: 'i1' })
    expect(s.assignments).toHaveLength(0)
  })
})

describe('FA-91 — idempotência e reordenação', () => {
  it('evento duplicado não muda o estado', () => {
    let s = emptySnapshot()
    const ev: TableEvent = { type: 'ItemCreated', item: item('i1', 1) }
    s = applyEvent(s, ev)
    const after = applyEvent(s, ev)
    expect(after.items).toHaveLength(1)
    expect(after.items[0]?.version).toBe(1)
  })

  it('evento atrasado (version menor) é descartado', () => {
    let s = emptySnapshot()
    s = applyEvent(s, { type: 'ItemUpdated', item: item('i1', 5, 5000) })
    s = applyEvent(s, { type: 'ItemUpdated', item: item('i1', 3, 3000) })
    expect(s.items[0]?.unitPriceCents).toBe(5000)
  })

  it('mudança de estado da mesa mais antiga é ignorada', () => {
    let s = emptySnapshot()
    s.table.version = 5
    s = applyEvent(s, {
      type: 'TableStateChanged',
      table: { ...s.table, status: 'FECHADA', version: 3 },
    })
    expect(s.table.status).toBe('ABERTA')
  })

  it('propriedade: qualquer permutação de eventos converge ao mesmo estado', () => {
    // conjunto de eventos: cada entidade com sua version final fixa
    const events: TableEvent[] = [
      { type: 'ParticipantJoined', participant: participant('p1', 1) },
      { type: 'ParticipantJoined', participant: participant('p2', 1) },
      { type: 'ItemCreated', item: item('i1', 1) },
      { type: 'ItemUpdated', item: item('i1', 2, 2500) },
      { type: 'ItemCreated', item: item('i2', 1) },
    ]
    fc.assert(
      fc.property(
        fc.shuffledSubarray(events, { minLength: events.length }),
        (permuted) => {
          const result = applyEvents(emptySnapshot(), permuted)
          // convergência: i1 na version 2, i2 presente, 2 participantes
          expect(result.items.find((i) => i.id === 'i1')?.version).toBe(2)
          expect(result.items.find((i) => i.id === 'i1')?.unitPriceCents).toBe(
            2500,
          )
          expect(result.items).toHaveLength(2)
          expect(result.participants).toHaveLength(2)
        },
      ),
    )
  })

  it('propriedade: aplicar duas vezes = aplicar uma vez (idempotência)', () => {
    const events: TableEvent[] = [
      { type: 'ItemCreated', item: item('i1', 1) },
      { type: 'ItemUpdated', item: item('i1', 2, 2000) },
      { type: 'ParticipantJoined', participant: participant('p1', 1) },
    ]
    fc.assert(
      fc.property(fc.shuffledSubarray(events, { minLength: 1 }), (evs) => {
        const once = applyEvents(emptySnapshot(), evs)
        const twice = applyEvents(once, evs)
        expect(twice).toEqual(once)
      }),
    )
  })
})
