/**
 * Proxy de leitura da NFC-e (FASE 11). Busca a página da SEFAZ
 * server-side (evita CORS) e devolve itens normalizados. Nunca repassa
 * o HTML cru nem a URL completa em logs (estrategia-logs.md).
 *
 * Cabeçalhos deliberadamente parecidos com um navegador real: portais de
 * SEFAZ costumam filtrar por WAF requisições com User-Agent incomum ou
 * sem os cabeçalhos padrão de um browser (Accept/Accept-Language).
 */
import { NextResponse } from 'next/server'
import { isNfceUrl, parseNfceHtml } from '@/infrastructure/nfce/nfce-parser'
import type { NfceParseResult } from '@/application/nfce/nfce-types'

export const runtime = 'nodejs'
export const maxDuration = 15

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url).searchParams.get('url')
  if (!url || !isNfceUrl(url)) {
    return NextResponse.json<NfceParseResult>({
      ok: false,
      reason: 'QR_INVALIDO',
    })
  }
  let hostname = ''
  try {
    hostname = new URL(url).hostname
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) {
      // diagnóstico sem PII: host + status, nunca a URL/chave da nota
      console.warn('nfce: resposta não-ok', { hostname, status: res.status })
      return NextResponse.json<NfceParseResult>({
        ok: false,
        reason: 'SEFAZ_INDISPONIVEL',
      })
    }
    const html = await res.text()
    return NextResponse.json<NfceParseResult>(parseNfceHtml(html))
  } catch (error) {
    console.warn('nfce: falha ao buscar', {
      hostname,
      error: error instanceof Error ? error.name : 'unknown',
    })
    return NextResponse.json<NfceParseResult>({
      ok: false,
      reason: 'SEFAZ_INDISPONIVEL',
    })
  }
}
