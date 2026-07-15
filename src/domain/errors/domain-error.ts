/**
 * Erros de domínio (estratégia de erros, FASE 01). O `code` é o
 * vocabulário compartilhado com o banco (triggers/funções usam os
 * mesmos códigos) e com a UI (mapa código → mensagem).
 */
export const DOMAIN_ERROR_CODES = [
  // acesso e autenticação
  'NAO_AUTENTICADO',
  'NAO_AUTORIZADO',
  // mesa
  'MESA_NAO_ENCONTRADA',
  'MESA_NAO_ABERTA',
  'MESA_CONGELADA',
  'MESA_SEM_ITENS',
  'MESA_SEM_PARTICIPANTES',
  'MESA_SEM_CONSUMO',
  'TRANSICAO_INVALIDA',
  'CODIGO_INDISPONIVEL',
  'CHAVE_PIX_OBRIGATORIA',
  'RECEBEDOR_OBRIGATORIO',
  // participantes
  'NOME_DUPLICADO',
  'NOME_INVALIDO',
  'PARTICIPANTE_NAO_ENCONTRADO',
  'PARTICIPANTE_INVALIDO',
  'PARTICIPANTE_INATIVO',
  // itens e distribuição
  'ITEM_NAO_ENCONTRADO',
  'DESCRICAO_INVALIDA',
  'VALOR_INVALIDO',
  'TAXA_FORA_DO_INTERVALO',
  'QUANTIDADE_EXCEDIDA',
  'QUANTIDADE_INCONSISTENTE',
  'DISTRIBUICAO_NAO_ENCONTRADA',
  'DISTRIBUICAO_SEM_MEMBROS',
  'DISTRIBUICAO_INVALIDA',
  'REFINAMENTO_MISTO',
  'PESO_INVALIDO',
  // asserções: indicam bug, nunca fluxo (estrategia-erros.md)
  'CONSERVACAO_VIOLADA',
  'CAMPO_IMUTAVEL',
  'OPERACAO_INVALIDA',
] as const

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number]

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'DomainError'
    this.code = code
  }
}

export function isDomainError(e: unknown): e is DomainError {
  return e instanceof DomainError
}
