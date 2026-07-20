import { describe, expect, it } from 'vitest'
import { translateChange } from '@/infrastructure/supabase/realtime/change-translator'

const baseItemRow = {
  id: 'i1',
  table_id: 't1',
  description: 'Chopp',
  quantity: '4.000',
  unit_price_cents: 1590,
  total_cents: 6360,
  source: 'MANUAL',
  created_by: null,
  version: 1,
}

describe('tradução de mudanças → eventos do domínio', () => {
  it('INSERT em tables → TableCreated; UPDATE → TableStateChanged', () => {
    const tableRow = {
      id: 't1',
      join_code: 'ABC234',
      name: null,
      status: 'ABERTA',
      settlement_mode: 'PAGAMENTO_DIRETO',
      service_fee_bp: 1000,
      payee_participant_id: null,
      payee_pix_key: null,
      establishment_pix_key: null,
      closed_at: null,
      version: 1,
    }
    expect(
      translateChange({ table: 'tables', eventType: 'INSERT', new: tableRow, old: null })
        ?.type,
    ).toBe('TableCreated')
    expect(
      translateChange({
        table: 'tables',
        eventType: 'UPDATE',
        new: { ...tableRow, status: 'FECHADA', version: 2 },
        old: tableRow,
      })?.type,
    ).toBe('TableStateChanged')
  })

  it('participante SAIU → ParticipantLeft; ATIVO → ParticipantJoined', () => {
    const p = {
      id: 'p1',
      table_id: 't1',
      name: 'Ana',
      status: 'ATIVO',
      role: 'MEMBRO',
      join_order: 1,
      version: 1,
    }
    expect(
      translateChange({ table: 'participants', eventType: 'INSERT', new: p, old: null })
        ?.type,
    ).toBe('ParticipantJoined')
    expect(
      translateChange({
        table: 'participants',
        eventType: 'UPDATE',
        new: { ...p, status: 'SAIU', version: 2 },
        old: p,
      })?.type,
    ).toBe('ParticipantLeft')
  })

  it('item: INSERT/UPDATE/DELETE mapeados; conversão de quantidade', () => {
    const created = translateChange({
      table: 'items',
      eventType: 'INSERT',
      new: baseItemRow,
      old: null,
    })
    expect(created?.type).toBe('ItemCreated')
    if (created?.type === 'ItemCreated') {
      expect(created.item.quantityMilli).toBe(4000)
      expect(created.item.totalCents).toBe(6360)
    }
    const removed = translateChange({
      table: 'items',
      eventType: 'DELETE',
      new: null,
      old: baseItemRow,
    })
    expect(removed).toEqual({ type: 'ItemRemoved', itemId: 'i1' })
  })

  it('payments → PaymentUpdated', () => {
    const ev = translateChange({
      table: 'payments',
      eventType: 'UPDATE',
      new: {
        id: 'pay1',
        table_id: 't1',
        participant_id: 'p2',
        amount_cents: 2332,
        status: 'INFORMADO',
        paid_declared_at: null,
        confirmed_at: null,
        version: 2,
      },
      old: null,
    })
    expect(ev?.type).toBe('PaymentUpdated')
  })

  it('tabela desconhecida ou linha nula → null', () => {
    expect(
      translateChange({ table: 'unknown', eventType: 'INSERT', new: {}, old: null }),
    ).toBeNull()
    expect(
      translateChange({ table: 'items', eventType: 'DELETE', new: null, old: null }),
    ).toBeNull()
  })
})
