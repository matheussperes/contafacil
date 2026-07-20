/**
 * Logger estruturado (estrategia-logs.md). Em produção emite JSON; em
 * dev, linha legível. Sempre aplica redação antes de sair do processo.
 * Correlação por tableId/correlationId fica no contexto passado.
 */
import type {
  LogContext,
  LogLevel,
  Logger,
} from '@/application/ports/logger'
import { redact } from '@/infrastructure/logging/redaction'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export interface ConsoleLoggerOptions {
  minLevel?: LogLevel
  pretty?: boolean
  sink?: (level: LogLevel, line: string) => void
}

export class ConsoleLogger implements Logger {
  private readonly minLevel: number
  private readonly pretty: boolean
  private readonly sink: (level: LogLevel, line: string) => void

  constructor(options: ConsoleLoggerOptions = {}) {
    this.minLevel = LEVEL_ORDER[options.minLevel ?? 'info']
    this.pretty = options.pretty ?? false
    this.sink =
      options.sink ??
      ((level, line) => {
        const fn =
          level === 'error'
            ? console.error
            : level === 'warn'
              ? console.warn
              : console.log
        fn(line)
      })
  }

  private emit(level: LogLevel, msg: string, ctx?: LogContext): void {
    if (LEVEL_ORDER[level] < this.minLevel) return
    const safe = redact(ctx)
    if (this.pretty) {
      const suffix = safe ? ` ${JSON.stringify(safe)}` : ''
      this.sink(level, `[${level}] ${msg}${suffix}`)
      return
    }
    this.sink(
      level,
      JSON.stringify({ level, msg, ...safe, ts: new Date().toISOString() }),
    )
  }

  debug(msg: string, ctx?: LogContext): void {
    this.emit('debug', msg, ctx)
  }
  info(msg: string, ctx?: LogContext): void {
    this.emit('info', msg, ctx)
  }
  warn(msg: string, ctx?: LogContext): void {
    this.emit('warn', msg, ctx)
  }
  error(msg: string, ctx?: LogContext): void {
    this.emit('error', msg, ctx)
  }
}
