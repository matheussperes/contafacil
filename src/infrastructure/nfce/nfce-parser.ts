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
 * Desconto: algumas notas mostram o líquido por item (`Vl. Total` já
 * descontado, ou uma linha própria "Desconto sobre item"). A maioria das
 * páginas de consulta, porém, só informa um desconto ÚNICO e AGREGADO no
 * resumo da nota ("Descontos R$"), sem dizer qual item foi promocional —
 * layout confirmado numa nota real (Carrefour/SP): cada item mostra
 * "Vl. Total" cheio (qtde×unitário, sem desconto algum) e só o resumo diz
 * "Descontos R$ 6,39". Nesse caso, sem como saber qual item específico
 * teve a promoção, o valor é **rateado proporcionalmente entre todos os
 * itens** pelo mesmo método do maior resto usado no resto do app — o que
 * importa para dividir a conta é que a soma bata com o que foi pago, não
 * qual item específico ficou mais barato.
 */
import type {
  NfceParseResult,
  ParsedNfceItem,
} from '@/application/nfce/nfce-types'
import { allocate } from '@/domain/calculator/allocate'
import { cents } from '@/domain/money/cents'

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

/** Marca o início do bloco de totais da nota (fim da lista de itens). */
const TOTALS_SECTION_MARKER =
  /Valor\s+total\s+R\$|Valor\s+a\s+pagar|Qtde?\.?\s+total\s+de\s+itens/i

/**
 * Linha de desconto de UM item, em separado da linha do item (ex.:
 * "Desconto sobre item R$ 6,39" numa `<tr>` própria, logo após o item —
 * layout observado em notas da rede Carrefour/SP). Exige a palavra
 * "item" para não se confundir com o total agregado de descontos da
 * nota ("Descontos R$ ..."), que aparece no bloco de totais.
 */
const PER_ITEM_DISCOUNT_LINE = /Desconto\s+(?:sobre\s+)?(?:o\s+)?item/i

/** Total agregado de descontos da nota, no bloco de totais (não por item). */
const AGGREGATE_DISCOUNT_LINE = /Descontos?\s*R\$\s*:?\s*([\d.,]+)/i

function applyPerItemDiscount(item: ParsedNfceItem, discountCents: number): ParsedNfceItem {
  const gross =
    item.totalCents ?? Math.round((item.quantityMilli * item.unitPriceCents) / 1000)
  const net = gross - discountCents
  return net >= 1 ? { ...item, totalCents: net } : item
}

function grossTotalCents(item: ParsedNfceItem): number {
  return Math.round((item.quantityMilli * item.unitPriceCents) / 1000)
}

/**
 * Rateia um desconto agregado (sem item específico atribuído) entre
 * todos os itens, proporcional ao valor bruto de cada um — método do
 * maior resto (ADR-008), a mesma primitiva de conservação usada em todo
 * o resto do app. Nunca deixa um item com total menor que 1 centavo.
 */
function distributeAggregateDiscount(
  items: readonly ParsedNfceItem[],
  discountCents: number,
): ParsedNfceItem[] {
  const grossValues = items.map(grossTotalCents)
  const grossSum = grossValues.reduce((a, b) => a + b, 0)
  if (discountCents <= 0 || discountCents >= grossSum) return [...items]

  const shares = allocate(cents(discountCents), grossValues)
  return items.map((item, i) => {
    const gross = grossValues[i] ?? 0
    const share = shares[i] ?? 0
    const net = gross - share
    return net >= 1 ? { ...item, totalCents: net } : item
  })
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

  let items: ParsedNfceItem[] = []
  const uf = extractUf(html)

  // Formato 1: tabela de itens. Captura descrição + qtde + unitário.
  // Padrão flexível: <tr> ... nome ... Qtde: N ... Vl. Unit.: N ...
  const rowRegex =
    /<tr[^>]*>[\s\S]*?<\/tr>/gi
  const rows = html.match(rowRegex) ?? []
  let reachedTotals = false
  let anyPerItemDiscount = false
  let aggregateDiscountCents: number | null = null

  for (const row of rows) {
    const text = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    if (TOTALS_SECTION_MARKER.test(text)) {
      reachedTotals = true
      // segue processando (a própria linha de totais não vira item nem
      // desconto — só marca o fim da lista para as linhas seguintes)
    }

    if (reachedTotals && aggregateDiscountCents === null) {
      const aggregateMatch = AGGREGATE_DISCOUNT_LINE.exec(text)
      if (aggregateMatch) {
        aggregateDiscountCents = moneyToCents(aggregateMatch[1] ?? '')
      }
    }

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
        // Desconto na MESMA linha do item (layout com tudo num só <tr>).
        const discountRaw =
          /(?:Vl\.?\s*)?Desconto[s]?\.?\s*(?:R\$)?\s*:?\s*([\d.,]+)/i.exec(text)
        const discountCents = discountRaw ? moneyToCents(discountRaw[1] ?? '') : null

        // "Vl. Total" sozinho NÃO é sinal de desconto: muitas notas o
        // repetem sempre (bruto, qtde×unitário) em todo item, com ou sem
        // promoção — só a palavra "Desconto" na própria linha é sinal
        // real de desconto atribuído a este item específico.
        let totalCents = totalRaw ? moneyToCents(totalRaw[1] ?? '') : null
        if (totalCents === null && discountCents !== null && discountCents > 0) {
          const gross = Math.round((quantityMilli * unitPriceCents) / 1000)
          const net = gross - discountCents
          totalCents = net >= 1 ? net : null
          if (totalCents !== null) anyPerItemDiscount = true
        }

        items.push({
          description: description.slice(0, 100),
          quantityMilli,
          unitPriceCents,
          totalCents,
        })
      }
      continue
    }

    // Desconto em linha PRÓPRIA, separada da linha do item (layout
    // observado na prática — ver PER_ITEM_DISCOUNT_LINE). Só antes do
    // bloco de totais, e só se o valor estiver na própria linha: aplica
    // ao último item lido, sem contar de novo o desconto agregado da
    // nota (que aparece depois, no bloco de totais).
    if (!reachedTotals && items.length > 0 && PER_ITEM_DISCOUNT_LINE.test(text)) {
      const valueMatch = /([\d.,]+)/.exec(text.replace(PER_ITEM_DISCOUNT_LINE, ''))
      const discountCents = valueMatch ? moneyToCents(valueMatch[1] ?? '') : null
      const lastIndex = items.length - 1
      const last = items[lastIndex]
      if (discountCents !== null && discountCents > 0 && last !== undefined) {
        items[lastIndex] = applyPerItemDiscount(last, discountCents)
        anyPerItemDiscount = true
      }
    }
  }

  if (items.length === 0) {
    return { ok: false, reason: 'SEM_ITENS' }
  }

  // Sem desconto atribuído a item nenhum (caso comum — ver comentário no
  // topo do arquivo), mas com um total agregado no resumo: rateia.
  if (!anyPerItemDiscount && aggregateDiscountCents !== null && aggregateDiscountCents > 0) {
    items = distributeAggregateDiscount(items, aggregateDiscountCents)
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
