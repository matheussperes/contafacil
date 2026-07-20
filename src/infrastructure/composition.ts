/**
 * Composição (ADR-004): o único lugar que instancia implementações
 * concretas e injeta nos services. A UI consome esta fábrica, nunca
 * os repositories diretamente.
 */
import { TableService } from '@/application/services/table-service'
import { ItemService } from '@/application/services/item-service'
import { AssignmentService } from '@/application/services/assignment-service'
import { PaymentService } from '@/application/services/payment-service'
import { ClosingService } from '@/application/services/closing-service'
import type { Logger } from '@/application/ports/logger'
import type { DeviceStorage } from '@/application/ports/device-storage'
import {
  ensureAnonymousSession,
  lazySupabaseClient,
  type AppSupabaseClient,
} from '@/infrastructure/supabase/client'
import { SupabaseTableGateway } from '@/infrastructure/supabase/repositories/supabase-table-gateway'
import { SupabaseItemRepository } from '@/infrastructure/supabase/repositories/supabase-item-repository'
import { SupabaseAssignmentRepository } from '@/infrastructure/supabase/repositories/supabase-assignment-repository'
import { SupabasePaymentRepository } from '@/infrastructure/supabase/repositories/supabase-payment-repository'
import { SupabaseRealtimeGateway } from '@/infrastructure/supabase/realtime/supabase-realtime-gateway'
import { LocalDeviceStorage } from '@/infrastructure/storage/local-device-storage'
import { ConsoleLogger } from '@/infrastructure/logging/console-logger'
import type { TableGateway } from '@/application/ports/table-gateway'
import type { RealtimeGateway } from '@/application/ports/realtime'

export interface Services {
  table: TableService
  item: ItemService
  assignment: AssignmentService
  payment: PaymentService
  closing: ClosingService
  gateway: TableGateway
  realtime: RealtimeGateway
  ensureSession: () => Promise<string>
}

export function buildServices(deps?: {
  client?: AppSupabaseClient
  storage?: DeviceStorage
  logger?: Logger
}): Services {
  const client = deps?.client ?? lazySupabaseClient()
  const storage = deps?.storage ?? new LocalDeviceStorage()
  const logger =
    deps?.logger ??
    new ConsoleLogger({
      minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      pretty: process.env.NODE_ENV !== 'production',
    })

  const gateway = new SupabaseTableGateway(client)
  const items = new SupabaseItemRepository(client)
  const assignments = new SupabaseAssignmentRepository(client)
  const payments = new SupabasePaymentRepository(client)
  const realtime = new SupabaseRealtimeGateway(client, assignments)

  return {
    table: new TableService(gateway, storage, logger),
    item: new ItemService(items),
    assignment: new AssignmentService(assignments),
    payment: new PaymentService(payments, logger),
    closing: new ClosingService(gateway, logger, assignments),
    gateway,
    realtime,
    ensureSession: () => ensureAnonymousSession(client),
  }
}
