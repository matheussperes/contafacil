/**
 * Distribuição de consumo (UC-06, RN-022/023/024). Monta os membros de
 * cada modo — TODOS materializa o snapshot dos ativos (RN-023) — e
 * delega a escrita atômica ao repository (upsert_assignment).
 */
import type {
  AssignmentMemberInput,
  AssignmentRepository,
  UpsertAssignmentInput,
} from '@/application/ports/table-gateway'
import type { Item, Participant } from '@/domain/entities/types'
import type { QuantityMilli } from '@/domain/money/cents'
import { DomainError } from '@/domain/errors/domain-error'

export class AssignmentService {
  constructor(private readonly assignments: AssignmentRepository) {}

  /** RN-023: "Todos" = snapshot dos participantes ATIVOS agora. */
  async assignToAll(
    item: Pick<Item, 'id' | 'quantityMilli'>,
    participants: readonly Pick<Participant, 'id' | 'status'>[],
    quantityMilli?: QuantityMilli,
    assignmentId?: string,
  ): Promise<string> {
    const active = participants.filter((p) => p.status === 'ATIVO')
    if (active.length === 0) {
      throw new DomainError('DISTRIBUICAO_SEM_MEMBROS')
    }
    return this.assignments.upsert({
      itemId: item.id,
      mode: 'TODOS',
      quantityMilli: quantityMilli ?? item.quantityMilli,
      members: active.map((p) => ({ participantId: p.id, weight: 1 })),
      assignmentId,
    })
  }

  async assignToPerson(
    item: Pick<Item, 'id' | 'quantityMilli'>,
    participantId: string,
    quantityMilli?: QuantityMilli,
    assignmentId?: string,
  ): Promise<string> {
    const covered = quantityMilli ?? item.quantityMilli
    return this.assignments.upsert({
      itemId: item.id,
      mode: 'PESSOA',
      quantityMilli: covered,
      members: [{ participantId, quantityMilli: covered }],
      assignmentId,
    })
  }

  /** GRUPO com pesos (proporção) ou quantidades por pessoa (RN-024). */
  async assignToGroup(
    item: Pick<Item, 'id' | 'quantityMilli'>,
    members: readonly AssignmentMemberInput[],
    quantityMilli: QuantityMilli,
    assignmentId?: string,
  ): Promise<string> {
    if (members.length === 0) {
      throw new DomainError('DISTRIBUICAO_SEM_MEMBROS')
    }
    const hasQty = members.some((m) => m.quantityMilli !== undefined)
    const hasWeight = members.some((m) => m.weight !== undefined)
    if (hasQty && hasWeight) {
      throw new DomainError('REFINAMENTO_MISTO')
    }
    const input: UpsertAssignmentInput = {
      itemId: item.id,
      mode: 'GRUPO',
      quantityMilli,
      members,
      assignmentId,
    }
    return this.assignments.upsert(input)
  }

  async remove(assignmentId: string): Promise<void> {
    await this.assignments.remove(assignmentId)
  }
}
