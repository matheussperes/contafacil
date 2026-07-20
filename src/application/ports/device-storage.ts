/**
 * Estado do dispositivo (estrategia-estados.md): qual participante este
 * aparelho é em cada mesa, e mesas visitadas recentemente.
 */
export interface TableSession {
  tableId: string
  joinCode: string
  participantId: string
  tableName: string | null
  joinedAt: string
}

export interface DeviceStorage {
  getSession(tableId: string): TableSession | null
  saveSession(session: TableSession): void
  listRecentSessions(): TableSession[]
  removeSession(tableId: string): void
}
