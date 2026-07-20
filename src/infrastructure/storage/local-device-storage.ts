/**
 * DeviceStorage sobre localStorage (estrategia-estados.md). Guarda a
 * participação por mesa e a lista de mesas recentes. Tolerante a
 * ambiente sem localStorage (SSR) — degrada para memória.
 */
import type {
  DeviceStorage,
  TableSession,
} from '@/application/ports/device-storage'

const KEY = 'contafacil.sessions.v1'
const MAX_RECENT = 20

interface Store {
  get(key: string): string | null
  set(key: string, value: string): void
}

const memoryStore = (): Store => {
  const map = new Map<string, string>()
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => {
      map.set(k, v)
    },
  }
}

function resolveStore(): Store {
  try {
    if (typeof localStorage !== 'undefined') {
      return {
        get: (k) => localStorage.getItem(k),
        set: (k, v) => localStorage.setItem(k, v),
      }
    }
  } catch {
    // acesso a localStorage pode lançar (modo privado) — cai no fallback
  }
  return memoryStore()
}

export class LocalDeviceStorage implements DeviceStorage {
  private readonly store: Store

  constructor(store?: Store) {
    this.store = store ?? resolveStore()
  }

  private readAll(): TableSession[] {
    const raw = this.store.get(KEY)
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as TableSession[]) : []
    } catch {
      return []
    }
  }

  private writeAll(sessions: readonly TableSession[]): void {
    this.store.set(KEY, JSON.stringify(sessions.slice(0, MAX_RECENT)))
  }

  getSession(tableId: string): TableSession | null {
    return this.readAll().find((s) => s.tableId === tableId) ?? null
  }

  saveSession(session: TableSession): void {
    const others = this.readAll().filter((s) => s.tableId !== session.tableId)
    this.writeAll([session, ...others])
  }

  listRecentSessions(): TableSession[] {
    return this.readAll().sort((a, b) =>
      b.joinedAt.localeCompare(a.joinedAt),
    )
  }

  removeSession(tableId: string): void {
    this.writeAll(this.readAll().filter((s) => s.tableId !== tableId))
  }
}
