import { describe, expect, it } from 'vitest'
import { TableService } from '@/application/services/table-service'
import { ItemService } from '@/application/services/item-service'
import { AssignmentService } from '@/application/services/assignment-service'
import { PaymentService } from '@/application/services/payment-service'
import { ClosingService } from '@/application/services/closing-service'
import { ValidationError } from '@/application/errors'
import { basisPoints, cents, quantityMilli } from '@/domain/money/cents'
import type { TableSnapshot } from '@/domain/entities/types'
import {
  FakeAssignmentRepository,
  FakeDeviceStorage,
  FakeItemRepository,
  FakePaymentRepository,
  FakeTableGateway,
  silentLogger,
} from '../../../tests/fakes/fake-gateway'

describe('TableService (UC-01/02/07)', () => {
  it('cria mesa, valida chave no modo A e persiste sessão', async () => {
    const gw = new FakeTableGateway()
    const storage = new FakeDeviceStorage()
    const svc = new TableService(gw, storage, silentLogger)

    const session = await svc.create({
      creatorName: '  Ana ',
      settlementMode: 'RECEBEDOR_FIXO',
      serviceFeeBp: basisPoints(1000),
      payeePixKey: 'ana@pix.com',
    })
    expect(gw.createTableCalls[0]?.creatorName).toBe('Ana')
    expect(storage.getSession(session.tableId)).not.toBeNull()
  })

  it('CA-003a: modo A sem chave → CHAVE_PIX_OBRIGATORIA', async () => {
    const svc = new TableService(
      new FakeTableGateway(),
      new FakeDeviceStorage(),
      silentLogger,
    )
    await expect(
      svc.create({
        creatorName: 'Ana',
        settlementMode: 'RECEBEDOR_FIXO',
        serviceFeeBp: basisPoints(1000),
      }),
    ).rejects.toThrowError(/CHAVE_PIX_OBRIGATORIA/)
  })

  it('CA-007: nome inválido → ValidationError', async () => {
    const svc = new TableService(
      new FakeTableGateway(),
      new FakeDeviceStorage(),
      silentLogger,
    )
    await expect(
      svc.create({
        creatorName: '   ',
        settlementMode: 'PAGAMENTO_DIRETO',
        serviceFeeBp: basisPoints(0),
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('remove a sessão ao sair', async () => {
    const storage = new FakeDeviceStorage()
    const svc = new TableService(new FakeTableGateway(), storage, silentLogger)
    storage.saveSession({
      tableId: 't1',
      joinCode: 'ABC234',
      participantId: 'p1',
      tableName: null,
      joinedAt: new Date().toISOString(),
    })
    await svc.leave('t1')
    expect(storage.getSession('t1')).toBeNull()
  })
})

describe('ItemService (UC-03, RN-020)', () => {
  it('parseia "15,90" → 1590 centavos e "0,5" → 500 mili', async () => {
    const repo = new FakeItemRepository()
    const svc = new ItemService(repo)
    await svc.add({
      tableId: 't1',
      description: 'Chopp',
      quantity: '0,5',
      unitPrice: '15,90',
    })
    expect(repo.inserted[0]?.unitPriceCents).toBe(1590)
    expect(repo.inserted[0]?.quantityMilli).toBe(500)
  })

  it('valor inválido → ValidationError no campo', async () => {
    const svc = new ItemService(new FakeItemRepository())
    await expect(
      svc.add({ tableId: 't1', description: 'x', quantity: '1', unitPrice: '0' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('AssignmentService (UC-06, RN-023)', () => {
  it('assignToAll materializa só os ativos (snapshot)', async () => {
    const repo = new FakeAssignmentRepository()
    const svc = new AssignmentService(repo)
    await svc.assignToAll(
      { id: 'item1', quantityMilli: quantityMilli(4000) },
      [
        { id: 'p1', status: 'ATIVO' },
        { id: 'p2', status: 'SAIU' },
        { id: 'p3', status: 'ATIVO' },
      ],
    )
    expect(repo.upserts[0]?.members.map((m) => m.participantId)).toEqual([
      'p1',
      'p3',
    ])
  })

  it('grupo com refinamento misto → REFINAMENTO_MISTO', async () => {
    const svc = new AssignmentService(new FakeAssignmentRepository())
    await expect(
      svc.assignToGroup(
        { id: 'item1', quantityMilli: quantityMilli(2000) },
        [
          { participantId: 'p1', quantityMilli: quantityMilli(1000) },
          { participantId: 'p2', weight: 1 },
        ],
        quantityMilli(2000),
      ),
    ).rejects.toThrowError(/REFINAMENTO_MISTO/)
  })
})

describe('PaymentService (UC-09/10, RN-051)', () => {
  const table = {
    id: 't1',
    status: 'FECHADA' as const,
    settlementMode: 'RECEBEDOR_FIXO' as const,
    payeeParticipantId: 'p1',
  }

  it('devedor informa; recebedor confirma', async () => {
    const repo = new FakePaymentRepository()
    const svc = new PaymentService(repo, silentLogger)
    await svc.act(
      table,
      { id: 'pay1', status: 'PENDENTE', participantId: 'p2' },
      { id: 'p2' },
      'INFORMAR',
    )
    expect(repo.updates[0]).toEqual({ paymentId: 'pay1', to: 'INFORMADO' })
  })

  it('devedor não confirma pagamento (nega) → NAO_AUTORIZADO', async () => {
    const svc = new PaymentService(new FakePaymentRepository(), silentLogger)
    await expect(
      svc.act(
        table,
        { id: 'pay1', status: 'INFORMADO', participantId: 'p2' },
        { id: 'p2' },
        'CONFIRMAR',
      ),
    ).rejects.toThrowError(/NAO_AUTORIZADO/)
  })
})

describe('ClosingService (UC-08, RN-035/036)', () => {
  function snapshot(mode: TableSnapshot['table']['settlementMode']): TableSnapshot {
    return {
      table: {
        id: 't1',
        joinCode: 'ABC234',
        name: null,
        status: 'FECHANDO',
        settlementMode: mode,
        serviceFeeBp: basisPoints(1000),
        payeeParticipantId: mode === 'RECEBEDOR_FIXO' ? 'p1' : null,
        payeePixKey: mode === 'RECEBEDOR_FIXO' ? 'ana@pix.com' : null,
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
          id: 'item1',
          tableId: 't1',
          description: 'Rodada',
          quantityMilli: quantityMilli(2000),
          unitPriceCents: cents(5000),
          totalCents: cents(10000),
          source: 'MANUAL',
          createdBy: null,
          version: 1,
        },
      ],
      assignments: [
        {
          id: 'a1',
          tableId: 't1',
          itemId: 'item1',
          mode: 'TODOS',
          quantityMilli: quantityMilli(2000),
          members: [
            { participantId: 'p1', quantityMilli: null, weight: 1 },
            { participantId: 'p2', quantityMilli: null, weight: 1 },
          ],
          version: 1,
        },
      ],
      payments: [],
    }
  }

  it('modo A: exclui recebedor e chama close_table com o payee da mesa', async () => {
    const gw = new FakeTableGateway()
    const svc = new ClosingService(gw, silentLogger)
    await svc.finish(snapshot('RECEBEDOR_FIXO'))
    const call = gw.closeTableCalls[0]
    expect(call?.payee?.participantId).toBe('p1')
    // total 11000, partes 5500/5500 → Σ shares = total
    expect(call?.shares.reduce((a, s) => a + s.amountCents, 0)).toBe(11000)
  })

  it('modo B sem recebedor → RECEBEDOR_OBRIGATORIO', async () => {
    const svc = new ClosingService(new FakeTableGateway(), silentLogger)
    await expect(
      svc.finish(snapshot('RECEBEDOR_NO_FECHAMENTO')),
    ).rejects.toThrowError(/RECEBEDOR_OBRIGATORIO/)
  })
})
