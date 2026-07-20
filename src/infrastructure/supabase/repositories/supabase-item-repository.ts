/**
 * ItemRepository sobre o Supabase. Escrita direta sob RLS (participante
 * ativo + mesa ABERTA garantidos por policy/trigger da FASE 02).
 * total_cents é calculado pelo banco — nunca enviado pelo cliente.
 */
import type {
  ItemPatch,
  ItemRepository,
  NewItemInput,
} from '@/application/ports/table-gateway'
import type { Item } from '@/domain/entities/types'
import { DomainError } from '@/domain/errors/domain-error'
import type { AppSupabaseClient } from '@/infrastructure/supabase/client'
import { translating } from '@/infrastructure/supabase/errors'
import { mapItem, milliToNumeric } from '@/infrastructure/supabase/mappers'
import type { ItemRow } from '@/infrastructure/supabase/database-types'

function newItemRow(input: NewItemInput): Record<string, unknown> {
  return {
    table_id: input.tableId,
    description: input.description,
    quantity: milliToNumeric(input.quantityMilli),
    unit_price_cents: input.unitPriceCents,
    source: input.source ?? 'MANUAL',
    created_by: input.createdBy ?? null,
  }
}

export class SupabaseItemRepository implements ItemRepository {
  constructor(private readonly client: AppSupabaseClient) {}

  async insert(input: NewItemInput): Promise<Item> {
    return translating(async () => {
      const { data, error } = await this.client
        .from('items')
        .insert(newItemRow(input))
        .select('*')
        .single()
      if (error) throw error
      return mapItem(data as ItemRow)
    })
  }

  async insertMany(inputs: readonly NewItemInput[]): Promise<Item[]> {
    if (inputs.length === 0) return []
    return translating(async () => {
      const { data, error } = await this.client
        .from('items')
        .insert(inputs.map(newItemRow))
        .select('*')
      if (error) throw error
      return (data as ItemRow[]).map(mapItem)
    })
  }

  async update(itemId: string, patch: ItemPatch): Promise<Item> {
    const row: Record<string, unknown> = {}
    if (patch.description !== undefined) row.description = patch.description
    if (patch.quantityMilli !== undefined) {
      row.quantity = milliToNumeric(patch.quantityMilli)
    }
    if (patch.unitPriceCents !== undefined) {
      row.unit_price_cents = patch.unitPriceCents
    }
    if (Object.keys(row).length === 0) {
      throw new DomainError('OPERACAO_INVALIDA', 'patch vazio')
    }
    return translating(async () => {
      const { data, error } = await this.client
        .from('items')
        .update(row)
        .eq('id', itemId)
        .select('*')
        .single()
      if (error) throw error
      return mapItem(data as ItemRow)
    })
  }

  async remove(itemId: string): Promise<void> {
    await translating(async () => {
      const { error } = await this.client.from('items').delete().eq('id', itemId)
      if (error) throw error
      return null
    })
  }
}
