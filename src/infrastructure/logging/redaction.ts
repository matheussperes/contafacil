/**
 * Redação de dados sensíveis (estrategia-logs.md). Chaves PIX, BR Code e
 * tokens NUNCA saem do processo em claro — mascarados antes de qualquer
 * log. Aplicada recursivamente sobre o contexto estruturado.
 */
import type { LogContext } from '@/application/ports/logger'

const SENSITIVE_KEYS = new Set([
  'pixkey',
  'payeepixkey',
  'establishmentpixkey',
  'p_payee_pix_key',
  'p_establishment_pix_key',
  'brcode',
  'brcodepayload',
  'accesstoken',
  'access_token',
  'refresh_token',
  'authorization',
  'nfceurl',
  'nfce_url',
])

const MASK = '«redacted»'
const MAX_DEPTH = 6

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase().replace(/[\s-]/g, ''))
}

function redactValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return MASK
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, depth + 1))
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = isSensitiveKey(k) ? MASK : redactValue(v, depth + 1)
    }
    return out
  }
  return value
}

export function redact(ctx: LogContext | undefined): LogContext | undefined {
  if (ctx === undefined) return undefined
  return redactValue(ctx, 0) as LogContext
}
