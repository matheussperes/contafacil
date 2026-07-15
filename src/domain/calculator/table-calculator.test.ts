import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  buildPayments,
  computeClosingShares,
  computeTableTotals,
} from '@/domain/calculator/table-calculator'
import { basisPoints, cents, quantityMilli } from '@/domain/money/cents'
import type { Assignment, Item, Participant } from '@/domain/entities/types'
import { DomainError } from '@/domain/errors/domain-error'

// ── fábricas ─────────────────────────────────────────────────────────
let seq = 0
const pid = (n: number) => `p${n}`

function participants(n: number): Pick<Participant, 'id' | 'joinOrder'>[] {
  return Array.from({ length: n }, (_, i) => ({ id: pid(i + 1), joinOrder: i + 1 }))
}

function item(
  quantityUnits: number,
  totalCents: number,
): Pick<Item, 'id' | 'quantityMilli' | 'totalCents'> {
  seq += 1
  return {
    id: `item${seq}`,
    quantityMilli: quantityMilli(quantityUnits * 1000),
    totalCents: cents(totalCents),
  }
}

function todos(
  itemId: string,
  quantityUnitsMilli: number,
  memberIds: string[],
): Pick<Assignment, 'id' | 'itemId' | 'quantityMilli' | 'members'> {
  seq += 1
  return {
    id: `a${seq}`,
    itemId,
    quantityMilli: quantityMilli(quantityUnitsMilli),
    members: memberIds.map((id) => ({
      participantId: id,
      quantityMilli: null,
      weight: 1,
    })),
  }
}

const FEE_10 = { serviceFeeBp: basisPoints(1000) }
const FEE_0 = { serviceFeeBp: basisPoints(0) }

// ── cenários numerados da FASE 00 ────────────────────────────────────
describe('RN-043/044 — consumo, taxa e partes', () => {
  it('cenário da suíte do banco: 4×1590 TODOS(3) a 10% → 2332 cada (Σ 6996)', () => {
    const ps = participants(3)
    const chopp = item(4, 6360)
    const totals = computeTableTotals({
      table: FEE_10,
      participants: ps,
      items: [chopp],
      assignments: [todos(chopp.id, 4000, [pid(1), pid(2), pid(3)])],
    })
    expect(totals.subtotalCents).toBe(6360)
    expect(totals.serviceFeeCents).toBe(636)
    expect(totals.totalCents).toBe(6996)
    expect(totals.shares.map((s) => s.totalCents)).toEqual([2332, 2332, 2332])
    expect(totals.unassignedValueCents).toBe(0)
  })

  it('CA-024: pizza de 8 fatias por quantidade — Ana 3, Bruno 3, Caio 2', () => {
    const ps = participants(3)
    const pizza = item(8, 9600)
    const totals = computeTableTotals({
      table: FEE_0,
      participants: ps,
      items: [pizza],
      assignments: [
        {
          id: 'a-pizza',
          itemId: pizza.id,
          quantityMilli: quantityMilli(8000),
          members: [
            { participantId: pid(1), quantityMilli: quantityMilli(3000), weight: null },
            { participantId: pid(2), quantityMilli: quantityMilli(3000), weight: null },
            { participantId: pid(3), quantityMilli: quantityMilli(2000), weight: null },
          ],
        },
      ],
    })
    expect(totals.shares.map((s) => s.consumptionCents)).toEqual([
      3600, 3600, 2400,
    ])
  })

  it('CA-024: proporção 2:1 divide na razão 2/3 e 1/3', () => {
    const ps = participants(2)
    const vinho = item(1, 1000)
    const totals = computeTableTotals({
      table: FEE_0,
      participants: ps,
      items: [vinho],
      assignments: [
        {
          id: 'a-vinho',
          itemId: vinho.id,
          quantityMilli: quantityMilli(1000),
          members: [
            { participantId: pid(1), quantityMilli: null, weight: 2 },
            { participantId: pid(2), quantityMilli: null, weight: 1 },
          ],
        },
      ],
    })
    expect(totals.shares.map((s) => s.consumptionCents)).toEqual([667, 333])
  })

  it('CA-025: item parcialmente distribuído aparece como sem dono', () => {
    const ps = participants(2)
    const petiscos = item(3, 9000)
    const totals = computeTableTotals({
      table: FEE_0,
      participants: ps,
      items: [petiscos],
      assignments: [todos(petiscos.id, 2000, [pid(1), pid(2)])],
    })
    expect(totals.unassigned).toEqual([
      { itemId: petiscos.id, quantityMilli: 1000, valueCents: 3000 },
    ])
    expect(totals.unassignedValueCents).toBe(3000)
    // I-S1: consumo + sem dono = subtotal
    const consumed = totals.shares.reduce((a, s) => a + s.consumptionCents, 0)
    expect(consumed + 3000).toBe(9000)
  })

  it('participante sem consumo não paga taxa (RN-044)', () => {
    const ps = participants(3)
    const cafe = item(1, 1000)
    const totals = computeTableTotals({
      table: FEE_10,
      participants: ps,
      items: [cafe],
      assignments: [
        {
          id: 'a-cafe',
          itemId: cafe.id,
          quantityMilli: quantityMilli(1000),
          members: [{ participantId: pid(2), quantityMilli: null, weight: 1 }],
        },
      ],
    })
    expect(totals.shares.map((s) => s.feeCents)).toEqual([0, 100, 0])
  })
})

describe('RN-035/036 — partes de fechamento e pagamentos', () => {
  const scenario = () => {
    const ps = participants(3)
    const chopp = item(4, 6360)
    return {
      table: FEE_10,
      participants: ps,
      items: [chopp],
      assignments: [todos(chopp.id, 4000, [pid(1), pid(2), pid(3)])],
    }
  }

  it('CA-035a: modos A/B excluem o recebedor — Σ pagamentos = total − parte dele', () => {
    const shares = computeClosingShares(scenario())
    const payments = buildPayments(shares, 'RECEBEDOR_NO_FECHAMENTO', pid(2))
    expect(payments).toHaveLength(2)
    expect(payments.map((p) => p.participantId)).toEqual([pid(1), pid(3)])
    expect(payments.reduce((a, p) => a + p.amountCents, 0)).toBe(6996 - 2332)
  })

  it('CA-035b: modo C gera pagamento para todos — Σ = total', () => {
    const shares = computeClosingShares(scenario())
    const payments = buildPayments(shares, 'PAGAMENTO_DIRETO', null)
    expect(payments).toHaveLength(3)
    expect(payments.reduce((a, p) => a + p.amountCents, 0)).toBe(6996)
  })

  it('modos A/B sem recebedor → RECEBEDOR_OBRIGATORIO', () => {
    const shares = computeClosingShares(scenario())
    expect(() =>
      buildPayments(shares, 'RECEBEDOR_FIXO', null),
    ).toThrowError(/RECEBEDOR_OBRIGATORIO/)
  })

  it('RN-032: fechamento com valor sem dono → DISTRIBUICAO_INVALIDA', () => {
    const ps = participants(2)
    const petiscos = item(3, 9000)
    expect(() =>
      computeClosingShares({
        table: FEE_0,
        participants: ps,
        items: [petiscos],
        assignments: [todos(petiscos.id, 2000, [pid(1), pid(2)])],
      }),
    ).toThrowError(/DISTRIBUICAO_INVALIDA/)
  })
})

describe('validações estruturais', () => {
  it('I-I2: atribuições excedendo a quantidade do item → QUANTIDADE_EXCEDIDA', () => {
    const ps = participants(2)
    const chopp = item(1, 1000)
    expect(() =>
      computeTableTotals({
        table: FEE_0,
        participants: ps,
        items: [chopp],
        assignments: [
          todos(chopp.id, 1000, [pid(1)]),
          todos(chopp.id, 500, [pid(2)]),
        ],
      }),
    ).toThrowError(/QUANTIDADE_EXCEDIDA/)
  })

  it('soma dos membros ≠ quantidade da atribuição → QUANTIDADE_INCONSISTENTE', () => {
    const ps = participants(2)
    const pizza = item(8, 9600)
    expect(() =>
      computeTableTotals({
        table: FEE_0,
        participants: ps,
        items: [pizza],
        assignments: [
          {
            id: 'a1',
            itemId: pizza.id,
            quantityMilli: quantityMilli(8000),
            members: [
              { participantId: pid(1), quantityMilli: quantityMilli(3000), weight: null },
              { participantId: pid(2), quantityMilli: quantityMilli(3000), weight: null },
            ],
          },
        ],
      }),
    ).toThrowError(/QUANTIDADE_INCONSISTENTE/)
  })

  it('refinamento misto na mesma atribuição → REFINAMENTO_MISTO', () => {
    const ps = participants(2)
    const it1 = item(2, 2000)
    expect(() =>
      computeTableTotals({
        table: FEE_0,
        participants: ps,
        items: [it1],
        assignments: [
          {
            id: 'a1',
            itemId: it1.id,
            quantityMilli: quantityMilli(2000),
            members: [
              { participantId: pid(1), quantityMilli: quantityMilli(1000), weight: null },
              { participantId: pid(2), quantityMilli: null, weight: 1 },
            ],
          },
        ],
      }),
    ).toThrowError(/REFINAMENTO_MISTO/)
  })

  it('membro que não é participante da mesa → PARTICIPANTE_INVALIDO', () => {
    const ps = participants(1)
    const it1 = item(1, 500)
    expect(() =>
      computeTableTotals({
        table: FEE_0,
        participants: ps,
        items: [it1],
        assignments: [todos(it1.id, 1000, ['fantasma'])],
      }),
    ).toThrowError(DomainError)
  })
})

describe('propriedades de conservação (I-S1/RN-036)', () => {
  const arbTable = fc
    .record({
      nParticipants: fc.integer({ min: 1, max: 5 }),
      items: fc.array(
        fc.record({
          units: fc.integer({ min: 1, max: 8 }),
          unitPrice: fc.integer({ min: 1, max: 9_999 }),
        }),
        { minLength: 1, maxLength: 6 },
      ),
      bp: fc.integer({ min: 0, max: 10_000 }),
    })
    .map(({ nParticipants, items: rawItems, bp }) => {
      const ps = participants(nParticipants)
      const memberIds = ps.map((p) => p.id)
      const items = rawItems.map((r) => item(r.units, r.units * r.unitPrice))
      const assignments = items.map((i) =>
        todos(i.id, i.quantityMilli, memberIds),
      )
      return {
        table: { serviceFeeBp: basisPoints(bp) },
        participants: ps,
        items,
        assignments,
      }
    })

  it('mesa totalmente distribuída: Σ partes = subtotal + taxa = total', () => {
    fc.assert(
      fc.property(arbTable, (input) => {
        const totals = computeTableTotals(input)
        const sum = totals.shares.reduce((a, s) => a + s.totalCents, 0)
        expect(sum).toBe(totals.totalCents)
        expect(totals.totalCents).toBe(
          totals.subtotalCents + totals.serviceFeeCents,
        )
        const drafts = computeClosingShares(input)
        expect(drafts.reduce((a, d) => a + d.amountCents, 0)).toBe(
          totals.totalCents,
        )
      }),
    )
  })

  it('modos A/B: Σ pagamentos + parte do recebedor = total (RN-036)', () => {
    fc.assert(
      fc.property(arbTable, fc.nat(), (input, payeePick) => {
        const shares = computeClosingShares(input)
        fc.pre(shares.length > 0)
        const payee = shares[payeePick % shares.length]
        if (payee === undefined) return
        const payments = buildPayments(
          shares,
          'RECEBEDOR_FIXO',
          payee.participantId,
        )
        const total = shares.reduce((a, s) => a + s.amountCents, 0)
        expect(
          payments.reduce((a, p) => a + p.amountCents, 0) + payee.amountCents,
        ).toBe(total)
      }),
    )
  })
})
