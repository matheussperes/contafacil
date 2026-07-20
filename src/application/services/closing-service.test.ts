import { describe, expect, it } from 'vitest'
import { ClosingService } from '@/application/services/closing-service'
import { basisPoints, cents, quantityMilli } from '@/domain/money/cents'
import type { TableSnapshot } from '@/domain/entities/types'
import {
  FakeAssignmentRepository,
  FakeTableGateway,
  silentLogger,
} from '../../../tests/fakes/fake-gateway'

function snapshotWithUnassigned(): TableSnapshot {
  return {
    table: {
      id: 't1',
      joinCode: 'ABC234',
      name: null,
      status: 'ABERTA',
      settlementMode: 'PAGAMENTO_DIRETO',
      serviceFeeBp: basisPoints(0),
      payeeParticipantId: null,
      payeePixKey: null,
      establishmentPixKey: null,
      closedAt: null,
      version: 1,
    },
    participants: [
      { id: 'p1', tableId: 't1', name: 'Ana', status: 'ATIVO', role: 'CRIADOR', joinOrder: 1, version: 1 },
      { id: 'p2', tableId: 't1', name: 'Bruno', status: 'ATIVO', role: 'MEMBRO', joinOrder: 2, version: 1 },
    ],
    items: [
      {
        id: 'i1',
        tableId: 't1',
        description: 'Petiscos',
        quantityMilli: quantityMilli(2000),
        unitPriceCents: cents(3000),
        totalCents: cents(6000),
        source: 'MANUAL',
        createdBy: null,
        version: 1,
      },
    ],
    assignments: [], // nada distribuído → tudo sem dono
    payments: [],
  }
}

describe('ClosingService — validação e RN-032', () => {
  it('validate detecta itens sem dono', () => {
    const svc = new ClosingService(new FakeTableGateway(), silentLogger)
    const v = svc.validate(snapshotWithUnassigned())
    expect(v.hasUnassigned).toBe(true)
    expect(v.unassignedValueCents).toBe(6000)
  })

  it('divideUnassignedAmongAll cria atribuição Todos para o item órfão', async () => {
    const repo = new FakeAssignmentRepository()
    const svc = new ClosingService(new FakeTableGateway(), silentLogger, repo)
    await svc.divideUnassignedAmongAll(snapshotWithUnassigned())
    expect(repo.upserts).toHaveLength(1)
    expect(repo.upserts[0]?.mode).toBe('TODOS')
    expect(repo.upserts[0]?.members).toHaveLength(2)
  })

  it('divideUnassigned sem repositório → OPERACAO_INVALIDA', async () => {
    const svc = new ClosingService(new FakeTableGateway(), silentLogger)
    await expect(
      svc.divideUnassignedAmongAll(snapshotWithUnassigned()),
    ).rejects.toThrowError(/OPERACAO_INVALIDA/)
  })
})
