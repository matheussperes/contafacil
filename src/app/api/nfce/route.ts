/**
 * Proxy de leitura da NFC-e (FASE 11). Busca a página da SEFAZ
 * server-side (evita CORS) e devolve itens normalizados. Nunca repassa
 * o HTML cru nem a URL completa em logs (estrategia-logs.md).
 */
import { NextResponse } from 'next/server'
import { isNfceUrl, parseNfceHtml } from '@/infrastructure/nfce/nfce-parser'
import type { NfceParseResult } from '@/application/nfce/nfce-types'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url).searchParams.get('url')
  if (!url || !isNfceUrl(url)) {
    return NextResponse.json<NfceParseResult>({
      ok: false,
      reason: 'QR_INVALIDO',
    })
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 ContaFacil' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      return NextResponse.json<NfceParseResult>({
        ok: false,
        reason: 'SEFAZ_INDISPONIVEL',
      })
    }
    const html = await res.text()
    return NextResponse.json<NfceParseResult>(parseNfceHtml(html))
  } catch {
    return NextResponse.json<NfceParseResult>({
      ok: false,
      reason: 'SEFAZ_INDISPONIVEL',
    })
  }
}
