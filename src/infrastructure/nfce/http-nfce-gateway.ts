/**
 * NfceGateway do cliente: delega a busca+parse ao route handler
 * `/api/nfce` (server-side, contorna CORS da SEFAZ). Traduz qualquer
 * falha de rede em reason classificada — a UI sempre tem fallback manual.
 */
import type { NfceGateway } from '@/application/ports/nfce-gateway'
import { isNfceUrl } from '@/infrastructure/nfce/nfce-parser'
import type { NfceParseResult } from '@/application/nfce/nfce-types'

export class HttpNfceGateway implements NfceGateway {
  async importFromUrl(url: string): Promise<NfceParseResult> {
    if (!isNfceUrl(url)) {
      return { ok: false, reason: 'QR_INVALIDO' }
    }
    try {
      const res = await fetch(`/api/nfce?url=${encodeURIComponent(url)}`)
      if (!res.ok) {
        return { ok: false, reason: 'SEFAZ_INDISPONIVEL' }
      }
      return (await res.json()) as NfceParseResult
    } catch {
      return { ok: false, reason: 'SEFAZ_INDISPONIVEL' }
    }
  }
}
