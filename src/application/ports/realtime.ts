/**
 * Port de sincronização em tempo real (estrategia-realtime.md). A UI
 * assina uma mesa e recebe eventos tipados + sinais de conexão; a
 * ressincronização (refetch do snapshot) é orquestrada pela UI ao
 * receber 'reconnected'.
 */
import type { TableEvent } from '@/application/events/table-events'

export type ConnectionSignal = 'subscribed' | 'disconnected' | 'reconnected'

export interface RealtimeHandlers {
  onEvent: (event: TableEvent) => void
  onConnection: (signal: ConnectionSignal) => void
}

export interface RealtimeSubscription {
  unsubscribe: () => void
}

export interface RealtimeGateway {
  subscribeToTable(
    tableId: string,
    handlers: RealtimeHandlers,
  ): RealtimeSubscription
}
