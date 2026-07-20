/**
 * Os 8 eventos do produto (estrategia-realtime.md), tipados. O adapter
 * de infraestrutura (FASE 05) traduz mudanças cruas do Supabase nestes
 * eventos — nenhum payload cru do provedor sobe além da tradução.
 */
import type {
  Assignment,
  Item,
  Participant,
  Payment,
  Table,
} from '@/domain/entities/types'

export type TableEvent =
  | { type: 'TableCreated'; table: Table }
  | { type: 'TableStateChanged'; table: Table }
  | { type: 'ParticipantJoined'; participant: Participant }
  | { type: 'ParticipantLeft'; participant: Participant }
  | { type: 'ItemCreated'; item: Item }
  | { type: 'ItemUpdated'; item: Item }
  | { type: 'ItemRemoved'; itemId: string }
  | { type: 'AssignmentChanged'; assignment: Assignment }
  | { type: 'AssignmentRemoved'; assignmentId: string }
  | { type: 'PaymentUpdated'; payment: Payment }

export type TableEventType = TableEvent['type']
