/**
 * CRUD de itens (UC-03/05, RN-020/021). A janela de edição (mesa ABERTA)
 * é garantida pelo banco; aqui validamos a entrada e orquestramos.
 */
import type {
  ItemPatch,
  ItemRepository,
  NewItemInput,
} from '@/application/ports/table-gateway'
import type { Item, ItemSource } from '@/domain/entities/types'
import {
  parseItemDescription,
  parseMoneyToCents,
  parseQuantity,
} from '@/application/validators/inputs'

export interface ItemFormInput {
  tableId: string
  description: string
  /** quantidade como o usuário digita: "4", "0,5" */
  quantity: string | number
  /** preço unitário como o usuário digita: "15,90" */
  unitPrice: string | number
  source?: ItemSource
  createdBy?: string
}

export class ItemService {
  constructor(private readonly items: ItemRepository) {}

  async add(input: ItemFormInput): Promise<Item> {
    return this.items.insert(this.toNewItem(input))
  }

  /** Importação NFC-e (FASE 11): itens revisados entram pelo mesmo CRUD. */
  async addMany(inputs: readonly ItemFormInput[]): Promise<Item[]> {
    return this.items.insertMany(inputs.map((i) => this.toNewItem(i)))
  }

  async update(
    itemId: string,
    patch: { description?: string; quantity?: string | number; unitPrice?: string | number },
  ): Promise<Item> {
    const clean: ItemPatch = {}
    if (patch.description !== undefined) {
      clean.description = parseItemDescription(patch.description)
    }
    if (patch.quantity !== undefined) {
      clean.quantityMilli = parseQuantity(patch.quantity)
    }
    if (patch.unitPrice !== undefined) {
      clean.unitPriceCents = parseMoneyToCents(patch.unitPrice)
    }
    return this.items.update(itemId, clean)
  }

  async remove(itemId: string): Promise<void> {
    await this.items.remove(itemId)
  }

  private toNewItem(input: ItemFormInput): NewItemInput {
    return {
      tableId: input.tableId,
      description: parseItemDescription(input.description),
      quantityMilli: parseQuantity(input.quantity),
      unitPriceCents: parseMoneyToCents(input.unitPrice),
      source: input.source,
      createdBy: input.createdBy,
    }
  }
}
