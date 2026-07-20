/**
 * Port de importação de NFC-e (RN-060). A implementação busca a nota
 * (via proxy server-side, por causa de CORS/SEFAZ) e devolve itens
 * normalizados ou uma falha classificada — nunca lança para a UI, que
 * garante o fallback manual (FA-08/09/RN-061).
 */
import type { NfceParseResult } from '@/application/nfce/nfce-types'

export interface NfceGateway {
  importFromUrl(url: string): Promise<NfceParseResult>
}
