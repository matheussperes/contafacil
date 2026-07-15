/**
 * Máquina de estados da mesa e seletores de capacidade
 * (docs/produto/maquina-de-estados.md). A UI decide o que oferecer
 * EXCLUSIVAMENTE por estes seletores — nunca comparando strings
 * (estrategia-estados.md).
 */
import type {
  Participant,
  Table,
  TableStatus,
} from '@/domain/entities/types'

const VALID_TRANSITIONS: Record<TableStatus, readonly TableStatus[]> = {
  ABERTA: ['FECHANDO'],
  FECHANDO: ['FECHADA', 'ABERTA'],
  FECHADA: [],
}

export function canTransition(from: TableStatus, to: TableStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

/** RN-006: itens/distribuição/entrada só com mesa ABERTA. */
export function isTableEditable(table: Pick<Table, 'status'>): boolean {
  return table.status === 'ABERTA'
}

/** RN-033: FECHANDO congela a mesa para todos. */
export function isTableFrozen(table: Pick<Table, 'status'>): boolean {
  return table.status === 'FECHANDO'
}

export function isTableClosed(table: Pick<Table, 'status'>): boolean {
  return table.status === 'FECHADA'
}

function isActiveOwner(p: Participant): boolean {
  return p.role === 'CRIADOR' && p.status === 'ATIVO'
}

/** RN-031: só o criador ativo fecha e configura. */
export function canManageTable(
  table: Pick<Table, 'status'>,
  me: Participant | undefined,
): boolean {
  return table.status === 'ABERTA' && me !== undefined && isActiveOwner(me)
}

/** RN-030/031: pré-condições de iniciar o fechamento (a validação de
 * itens sem dono é o passo seguinte — RN-032). */
export function canStartClosing(
  table: Pick<Table, 'status'>,
  me: Participant | undefined,
  itemsCount: number,
  participantsCount: number,
): boolean {
  return (
    canManageTable(table, me) && itemsCount > 0 && participantsCount > 0
  )
}

/** RN-010: quem saiu não age; RN-006: só com mesa ABERTA. */
export function canParticipate(
  table: Pick<Table, 'status'>,
  me: Participant | undefined,
): boolean {
  return isTableEditable(table) && me !== undefined && me.status === 'ATIVO'
}
