/**
 * Tipos das linhas do banco (FASE 02). Mantidos à mão e mínimos —
 * quando o Supabase CLI estiver disponível no ambiente, podem ser
 * substituídos por tipos gerados (`supabase gen types`).
 */
export interface TableRow {
  id: string
  join_code: string
  name: string | null
  status: 'ABERTA' | 'FECHANDO' | 'FECHADA'
  settlement_mode:
    | 'RECEBEDOR_FIXO'
    | 'RECEBEDOR_NO_FECHAMENTO'
    | 'PAGAMENTO_DIRETO'
  service_fee_bp: number
  payee_participant_id: string | null
  payee_pix_key: string | null
  establishment_pix_key: string | null
  closed_at: string | null
  version: number
}

export interface ParticipantRow {
  id: string
  table_id: string
  name: string
  status: 'ATIVO' | 'SAIU'
  role: 'CRIADOR' | 'MEMBRO'
  join_order: number
  version: number
}

export interface ItemRow {
  id: string
  table_id: string
  description: string
  quantity: string | number // numeric(12,3) chega como string
  unit_price_cents: number
  total_cents: number
  source: 'MANUAL' | 'NFCE'
  created_by: string | null
  version: number
}

export interface AssignmentRow {
  id: string
  table_id: string
  item_id: string
  mode: 'TODOS' | 'PESSOA' | 'GRUPO'
  quantity: string | number
  version: number
}

export interface AssignmentMemberRow {
  id: string
  assignment_id: string
  table_id: string
  participant_id: string
  quantity: string | number | null
  weight: number | null
  version: number
}

export interface PaymentRow {
  id: string
  table_id: string
  participant_id: string
  amount_cents: number
  status: 'PENDENTE' | 'INFORMADO' | 'PAGO'
  paid_declared_at: string | null
  confirmed_at: string | null
  version: number
}
