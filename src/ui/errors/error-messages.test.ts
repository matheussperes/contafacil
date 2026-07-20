import { describe, expect, it } from 'vitest'
import {
  errorMessage,
  hasMessageForEveryDomainCode,
  messageForCode,
} from '@/ui/errors/error-messages'
import { DomainError } from '@/domain/errors/domain-error'
import { InfrastructureError, ValidationError } from '@/application/errors'

describe('mapa de mensagens (estrategia-erros.md)', () => {
  it('todo código de domínio tem mensagem pt-BR', () => {
    expect(hasMessageForEveryDomainCode()).toBe(true)
  })

  it('traduz DomainError, ValidationError e InfrastructureError', () => {
    expect(errorMessage(new DomainError('NOME_DUPLICADO'))).toContain('nome')
    expect(errorMessage(new ValidationError('VALOR_INVALIDO'))).toContain(
      'inválido',
    )
    expect(
      errorMessage(new InfrastructureError('NETWORK_UNAVAILABLE', true)),
    ).toContain('conexão')
  })

  it('erro desconhecido cai no fallback', () => {
    expect(errorMessage(new Error('boom'))).toBe(messageForCode('__nope__'))
  })
})
