/**
 * Tradução de erros do Supabase/PostgREST para a taxonomia do projeto
 * (estrategia-erros.md). As funções e triggers da FASE 02 lançam
 * `raise exception 'CODIGO_DE_DOMINIO'` — o código chega na message.
 */
import { InfrastructureError } from '@/application/errors'
import {
  DOMAIN_ERROR_CODES,
  DomainError,
  type DomainErrorCode,
} from '@/domain/errors/domain-error'

interface SupabaseErrorLike {
  message?: string
  code?: string
  details?: string
}

const RETRYABLE_PG_CODES = new Set([
  '08000', // connection_exception
  '08003',
  '08006',
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '57014', // query_canceled (timeout)
])

export function translateSupabaseError(error: unknown): Error {
  const e = (error ?? {}) as SupabaseErrorLike
  const message = e.message ?? ''

  for (const code of DOMAIN_ERROR_CODES) {
    if (message.includes(code)) {
      return new DomainError(code as DomainErrorCode)
    }
  }
  // violações de constraint com nome de domínio (ex.: nome duplicado)
  if (e.code === '23505' && message.includes('participants_nome_unico')) {
    return new DomainError('NOME_DUPLICADO')
  }
  if (e.code === '42501' || message.includes('row-level security')) {
    return new InfrastructureError('RLS_DENIED', false, error)
  }
  if (message.includes('Failed to fetch') || message.includes('fetch failed')) {
    return new InfrastructureError('NETWORK_UNAVAILABLE', true, error)
  }
  const retryable = e.code !== undefined && RETRYABLE_PG_CODES.has(e.code)
  return new InfrastructureError('SUPABASE_ERROR', retryable, error)
}

/** Envolve uma chamada ao Supabase traduzindo o erro na saída. */
export async function translating<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    throw translateSupabaseError(error)
  }
}
