/**
 * Parser de NFC-e (RN-060/061) — tolerante a variações entre estados.
 * Puro: recebe o HTML da página da SEFAZ e devolve itens normalizados,
 * ou uma falha classificada (nunca lança para fora — o chamador garante
 * o fallback manual, FA-08/09).
 *
 * Estratégia: em vez de depender do layout exato de cada UF, varre a
 * tabela de produtos por padrões comuns (qtde/unitário/descrição) e
 * converte tudo para inteiros (centavos / mili-unidades).
 */
import type {
  NfceParseResult,
  ParsedNfceItem,
} from '@/application/nfce/nfce-types'

/** "1.234,56" | "1234.56" | "12,5" → centavos inteiros. */
export function moneyToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, '').trim()
  if (cleaned === '') return null
  // se tem vírgula, ela é o separador decimal (padrão BR)
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned
  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100)
}

/** "2" | "0,500" | "1.000" → mili-unidades inteiras. */
export function quantityToMilli(raw: string): number | null {
  const cents = moneyToCents(raw)
  if (cents === null) return null
  // moneyToCents deu valor×100; queremos valor×1000 → ×10
  return cents * 10
}

/** Verifica se a URL/QR aponta para uma consulta de NFC-e. */
export function isNfceUrl(text: string): boolean {
  return /nfce|nfe|fazenda|sefaz|qrcode|chNFe|p=\d{44}/i.test(text)
}

function extractUf(html: string): string | null {
  const m = /Estado[:\s]*([A-Z]{2})\b/.exec(html) ?? /uf[=:]\s*([A-Z]{2})/i.exec(html)
  return m?.[1]?.toUpperCase() ?? null
}

/**
 * Parser principal. Reconhece dois formatos comuns:
 * 1) linhas de tabela `<tr>` com células de descrição/qtde/unitário;
 * 2) blocos com rótulos "Qtde"/"Vl. Unit." (layout SAT/algumas UFs).
 */
export function parseNfceHtml(html: string): NfceParseResult {
  if (typeof html !== 'string' || html.trim() === '') {
    return { ok: false, reason: 'FORMATO_DESCONHECIDO' }
  }

  const items: ParsedNfceItem[] = []
  const uf = extractUf(html)

  // Formato 1: tabela de itens. Captura descrição + qtde + unitário.
  // Padrão flexível: <tr> ... nome ... Qtde: N ... Vl. Unit.: N ...
  const rowRegex =
    /<tr[^>]*>[\s\S]*?<\/tr>/gi
  const rows = html.match(rowRegex) ?? []
  for (const row of rows) {
    const text = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const qty = /Qtde\.?\s*:?\s*([\d.,]+)/i.exec(text)
    const unit = /Vl\.?\s*Unit\.?\s*:?\s*([\d.,]+)/i.exec(text)
    const nameMatch = /^([A-Za-zÀ-ÿ0-9][^0-9]*?)\s+(?:\(|Qtde|Código)/i.exec(text)
    if (qty && unit) {
      const quantityMilli = quantityToMilli(qty[1] ?? '')
      const unitPriceCents = moneyToCents(unit[1] ?? '')
      const description = (nameMatch?.[1] ?? text.slice(0, 40)).trim()
      if (
        quantityMilli !== null &&
        quantityMilli > 0 &&
        unitPriceCents !== null &&
        unitPriceCents >= 1 &&
        description.length > 0
      ) {
        const totalRaw = /Vl\.?\s*Total\.?\s*:?\s*([\d.,]+)/i.exec(text)
        items.push({
          description: description.slice(0, 100),
          quantityMilli,
          unitPriceCents,
          totalCents: totalRaw ? moneyToCents(totalRaw[1] ?? '') : null,
        })
      }
    }
  }

  if (items.length === 0) {
    return { ok: false, reason: 'SEM_ITENS' }
  }
  return { ok: true, data: { items, uf } }
}
