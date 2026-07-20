/**
 * PaymentRepository sobre o Supabase. Só UPDATE de status; RLS + trigger
 * da FASE 02 garantem papel, transição e mesa FECHADA (RN-051/052).
 */
import type { PaymentRepository } from '@/application/ports/table-gateway'
import type { PaymentStatus } from '@/domain/entities/types'
import type { AppSupabaseClient } from '@/infrastructure/supabase/client'
import { translating } from '@/infrastructure/supabase/errors'

export class SupabasePaymentRepository implements PaymentRepository {
  constructor(private readonly client: AppSupabaseClient) {}

  async updateStatus(paymentId: string, to: PaymentStatus): Promise<void> {
    await translating(async () => {
      const { error } = await this.client
        .from('payments')
        .update({ status: to })
        .eq('id', paymentId)
      if (error) throw error
      return null
    })
  }
}
