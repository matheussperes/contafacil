/**
 * Logs estruturados (estrategia-logs.md). Implementações fazem redação
 * automática de campos sensíveis antes de qualquer saída.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = Record<string, unknown>

export interface Logger {
  debug(msg: string, ctx?: LogContext): void
  info(msg: string, ctx?: LogContext): void
  warn(msg: string, ctx?: LogContext): void
  error(msg: string, ctx?: LogContext): void
}
