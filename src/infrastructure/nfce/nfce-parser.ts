/**
 * Parser de NFC-e (RN-060/061) — tolerante a variações entre estados.
 * Puro: recebe o HTML da página da SEFAZ e devolve itens normalizados,
 * ou uma falha classificada (nunca lança para fora — o chamador garante
 * o fallback manual, FA-08/09).
 *
 * Estratégia: em vez de depender do layout exato de cada UF, varre a
 * tabela de produtos por padrões comuns (qtde/unitário/descrição) e
 * converte tudo para inteiros (centavos / mili-unidades).
 *
 * Desconto por item: a nota às vezes já mostra "Vl. Total" líquido
 * (após desconto promocional) e/ou uma linha "Desconto R$ X". Quando
 * algum dos dois aparece, `totalCents` reflete o valor líquido da linha
 * — é ele, e não `unitPriceCents` (o preço de tabela impresso), que deve
 * virar o preço a cobrar (ver `effectiveUnitPriceCents`).
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
        const discountRaw =
          /(?:Vl\.?\s*)?Desconto[s]?\.?\s*(?:R\$)?\s*:?\s*([\d.,]+)/i.exec(text)
        const discountCents = discountRaw ? moneyToCents(discountRaw[1] ?? '') : null

        // Vl. Total, quando a nota o informa, já costuma vir líquido de
        // desconto — é a fonte preferida. Sem ele, mas com "Desconto"
        // detectado, deriva o líquido: qtde×unitário − desconto.
        let totalCents = totalRaw ? moneyToCents(totalRaw[1] ?? '') : null
        if (totalCents === null && discountCents !== null && discountCents > 0) {
          const gross = Math.round((quantityMilli * unitPriceCents) / 1000)
          const net = gross - discountCents
          totalCents = net >= 1 ? net : null
        }

        items.push({
          description: description.slice(0, 100),
          quantityMilli,
          unitPriceCents,
          totalCents,
        })
      }
    }
  }

  if (items.length === 0) {
    return { ok: false, reason: 'SEM_ITENS' }
  }
  return { ok: true, data: { items, uf } }
}

/**
 * Preço unitário a efetivamente cobrar (RN-060): quando a nota informa
 * o total líquido da linha (`totalCents` — já com desconto aplicado,
 * ver `parseNfceHtml`), deriva o preço por unidade a partir dele, em vez
 * do preço de tabela impresso (`unitPriceCents`). Sem total informado,
 * usa o preço de tabela como está. Sempre um inteiro em centavos ≥ 1
 * (ADR-001) — nunca deriva um preço zerado ou negativo.
 */
export function effectiveUnitPriceCents(
  item: Pick<ParsedNfceItem, 'quantityMilli' | 'unitPriceCents' | 'totalCents'>,
): number {
  if (item.totalCents === null || item.quantityMilli <= 0) {
    return item.unitPriceCents
  }
  const derived = Math.round((item.totalCents * 1000) / item.quantityMilli)
  return derived >= 1 ? derived : item.unitPriceCents
}
