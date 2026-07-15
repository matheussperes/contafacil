import { describe, expect, it } from 'vitest'
import {
  canManageTable,
  canParticipate,
  canStartClosing,
  canTransition,
  isTableEditable,
  isTableFrozen,
} from '@/domain/entities/table-state'
import {
  availablePaymentActions,
  isSettled,
  paymentTransitions,
} from '@/domain/entities/payment-state'
import type { Participant } from '@/domain/entities/types'

const owner: Participant = {
  id: 'p1',
  tableId: 't1',
  name: 'Ana',
  status: 'ATIVO',
  role: 'CRIADOR',
  joinOrder: 1,
  version: 1,
}
const member: Participant = { ...owner, id: 'p2', name: 'Bruno', role: 'MEMBRO', joinOrder: 2 }
const leftMember: Participant = { ...member, id: 'p3', name: 'Carla', status: 'SAIU' }

describe('I-M1 — transições da mesa', () => {
  it('só ABERTA→FECHANDO, FECHANDO→FECHADA, FECHANDO→ABERTA', () => {
    expect(canTransition('ABERTA', 'FECHANDO')).toBe(true)
    expect(canTransition('FECHANDO', 'FECHADA')).toBe(true)
    expect(canTransition('FECHANDO', 'ABERTA')).toBe(true)
    expect(canTransition('ABERTA', 'FECHADA')).toBe(false)
    expect(canTransition('FECHADA', 'ABERTA')).toBe(false)
    expect(canTransition('FECHADA', 'FECHANDO')).toBe(false)
  })
})

describe('RN-006/010/031/033 — capacidades por estado e papel', () => {
  it('mesa ABERTA é editável; FECHANDO congela; FECHADA não edita', () => {
    expect(isTableEditable({ status: 'ABERTA' })).toBe(true)
    expect(isTableFrozen({ status: 'FECHANDO' })).toBe(true)
    expect(isTableEditable({ status: 'FECHANDO' })).toBe(false)
    expect(isTableEditable({ status: 'FECHADA' })).toBe(false)
  })

  it('CA-031: só o criador ativo gerencia', () => {
    expect(canManageTable({ status: 'ABERTA' }, owner)).toBe(true)
    expect(canManageTable({ status: 'ABERTA' }, member)).toBe(false)
    expect(canManageTable({ status: 'ABERTA' }, undefined)).toBe(false)
  })

  it('CA-030: fechamento exige itens e participantes', () => {
    expect(canStartClosing({ status: 'ABERTA' }, owner, 0, 3)).toBe(false)
    expect(canStartClosing({ status: 'ABERTA' }, owner, 2, 3)).toBe(true)
  })

  it('RN-010: quem saiu não participa', () => {
    expect(canParticipate({ status: 'ABERTA' }, member)).toBe(true)
    expect(canParticipate({ status: 'ABERTA' }, leftMember)).toBe(false)
  })
})

describe('RN-051/052 — máquina do pagamento', () => {
  it('modos A/B: PENDENTE→INFORMADO (devedor), INFORMADO→PAGO|PENDENTE (recebedor)', () => {
    expect(paymentTransitions('RECEBEDOR_FIXO', 'PENDENTE')).toEqual([
      { to: 'INFORMADO', actor: 'DEVEDOR', intent: 'INFORMAR' },
    ])
    expect(paymentTransitions('RECEBEDOR_FIXO', 'INFORMADO')).toEqual([
      { to: 'PAGO', actor: 'RECEBEDOR', intent: 'CONFIRMAR' },
      { to: 'PENDENTE', actor: 'RECEBEDOR', intent: 'REJEITAR' },
    ])
    expect(paymentTransitions('RECEBEDOR_FIXO', 'PAGO')).toEqual([])
  })

  it('CA-051b: modo C vai direto PENDENTE→PAGO pelo devedor', () => {
    expect(paymentTransitions('PAGAMENTO_DIRETO', 'PENDENTE')).toEqual([
      { to: 'PAGO', actor: 'DEVEDOR', intent: 'PAGAR' },
    ])
  })

  it('CA-051a: ações disponíveis respeitam papel e mesa FECHADA', () => {
    const table = {
      status: 'FECHADA' as const,
      settlementMode: 'RECEBEDOR_FIXO' as const,
      payeeParticipantId: 'p1',
    }
    const payment = { status: 'PENDENTE' as const, participantId: 'p2' }
    // devedor informa
    expect(availablePaymentActions(table, payment, { id: 'p2' })).toHaveLength(1)
    // recebedor não informa pelo devedor
    expect(availablePaymentActions(table, payment, { id: 'p1' })).toHaveLength(0)
    // após informado, só o recebedor age
    const informed = { ...payment, status: 'INFORMADO' as const }
    expect(availablePaymentActions(table, informed, { id: 'p1' })).toHaveLength(2)
    expect(availablePaymentActions(table, informed, { id: 'p2' })).toHaveLength(0)
    // mesa não fechada: nada (RN-052)
    expect(
      availablePaymentActions({ ...table, status: 'ABERTA' }, payment, { id: 'p2' }),
    ).toHaveLength(0)
  })

  it('isSettled: todos PAGO e ao menos um pagamento', () => {
    expect(isSettled([])).toBe(false)
    expect(isSettled([{ status: 'PAGO' }, { status: 'PENDENTE' }])).toBe(false)
    expect(isSettled([{ status: 'PAGO' }, { status: 'PAGO' }])).toBe(true)
  })
})
