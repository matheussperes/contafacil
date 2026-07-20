/**
 * Erros de aplicação e infraestrutura (estrategia-erros.md).
 * DomainError vive no domínio; estes completam a taxonomia.
 */
export class ValidationError extends Error {
  readonly code: string
  readonly field: string | null

  constructor(code: string, field?: string) {
    super(field ? `${code} (${field})` : code)
    this.name = 'ValidationError'
    this.code = code
    this.field = field ?? null
  }
}

export class InfrastructureError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(code: string, retryable: boolean, cause?: unknown) {
    super(code)
    this.name = 'InfrastructureError'
    this.code = code
    this.retryable = retryable
    this.cause = cause
  }
}
