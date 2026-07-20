import { describe, expect, it } from 'vitest'
import {
  effectiveUnitPriceCents,
  isNfceUrl,
  moneyToCents,
  parseNfceHtml,
  quantityToMilli,
} from '@/infrastructure/nfce/nfce-parser'

// Fixtures representando dois layouts comuns de NFC-e (simplificados).
const fixtureSP = `
<html><body>
<span>Estado: SP</span>
<table>
  <tr><td>CHOPP PILSEN 500ML (Código: 123)</td><td>Qtde.: 4</td><td>Vl. Unit.: 15,90</td><td>Vl. Total: 63,60</td></tr>
  <tr><td>BATATA FRITA G (Código: 987)</td><td>Qtde.: 1</td><td>Vl. Unit.: 34,90</td><td>Vl. Total: 34,90</td></tr>
</table>
</body></html>`

const fixtureMG = `
<html><body>
<div>uf=MG</div>
<table>
  <tr><td>AGUA MINERAL 500ML</td><td>Qtde: 2,000</td><td>Vl Unit: 5,00</td></tr>
</table>
</body></html>`

// Item promocional: nota só informa "Desconto", sem Vl. Total explícito.
const fixtureDescontoSemTotal = `
<html><body>
<table>
  <tr><td>CERVEJA PROMO 350ML</td><td>Qtde.: 1</td><td>Vl. Unit.: 10,00</td><td>Desconto R$: 6,39</td></tr>
</table>
</body></html>`

// Item promocional: nota já informa Vl. Total líquido (mais comum na prática).
const fixtureTotalLiquido = `
<html><body>
<table>
  <tr><td>REFRIGERANTE PROMO 2L</td><td>Qtde.: 2</td><td>Vl. Unit.: 5,00</td><td>Vl. Total: 8,61</td></tr>
</table>
</body></html>`

// Layout observado na prática (rede Carrefour/SP): o desconto vem numa
// <tr> própria, LOGO APÓS a <tr> do item — não na mesma linha — e a nota
// ainda tem um bloco de totais no fim repetindo "Descontos R$" agregado.
const fixtureDescontoEmLinhaPropria = `
<html><body>
<span>Estado: SP</span>
<table>
  <tr><td>BALA GELAT FINI TUBE</td><td>Qtde.: 1</td><td>Vl. Unit.: 2,78</td></tr>
  <tr><td>BATATA OND CEB SALS</td><td>Qtde.: 3</td><td>Vl. Unit.: 6,39</td></tr>
  <tr><td>Desconto sobre item R$ 6,39</td></tr>
  <tr><td>BALA FINI HI CIT 800</td><td>Qtde.: 1</td><td>Vl. Unit.: 9,29</td></tr>
  <tr><td>Valor total R$: 81,20</td></tr>
  <tr><td>Descontos R$: 6,39</td></tr>
  <tr><td>Valor a Pagar R$: 74,81</td></tr>
</table>
</body></html>`

describe('conversões (sem float)', () => {
  it('moneyToCents entende padrão BR e US', () => {
    expect(moneyToCents('15,90')).toBe(1590)
    expect(moneyToCents('1.234,56')).toBe(123456)
    expect(moneyToCents('34.90')).toBe(3490)
    expect(moneyToCents('abc')).toBeNull()
  })

  it('quantityToMilli converte para mili-unidades', () => {
    expect(quantityToMilli('4')).toBe(4000)
    expect(quantityToMilli('2,000')).toBe(2000)
    expect(quantityToMilli('0,5')).toBe(500)
  })
})

describe('isNfceUrl', () => {
  it('reconhece URLs de NFC-e e rejeita links comuns', () => {
    expect(isNfceUrl('https://www.fazenda.sp.gov.br/nfce/qrcode?p=' + '3'.repeat(44))).toBe(true)
    expect(isNfceUrl('https://google.com')).toBe(false)
  })
})

describe('parseNfceHtml (RN-060) — tolerante a UF', () => {
  it('layout SP: extrai itens com valores em inteiros', () => {
    const r = parseNfceHtml(fixtureSP)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.uf).toBe('SP')
    expect(r.data.items).toHaveLength(2)
    expect(r.data.items[0]).toMatchObject({
      quantityMilli: 4000,
      unitPriceCents: 1590,
      totalCents: 6360,
    })
    expect(r.data.items[0]?.description).toContain('CHOPP')
  })

  it('layout MG: quantidade fracionária, sem total', () => {
    const r = parseNfceHtml(fixtureMG)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.items[0]).toMatchObject({
      quantityMilli: 2000,
      unitPriceCents: 500,
      totalCents: null,
    })
  })

  it('HTML sem itens → SEM_ITENS (FA-09)', () => {
    const r = parseNfceHtml('<html><body>nada aqui</body></html>')
    expect(r).toEqual({ ok: false, reason: 'SEM_ITENS' })
  })

  it('entrada vazia → FORMATO_DESCONHECIDO', () => {
    expect(parseNfceHtml('')).toEqual({
      ok: false,
      reason: 'FORMATO_DESCONHECIDO',
    })
  })
})

describe('desconto por item (RN-060) — item promocional', () => {
  it('sem Vl. Total: deriva o líquido de qtde×unitário − desconto', () => {
    const r = parseNfceHtml(fixtureDescontoSemTotal)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // Qtde 1 × Vl.Unit 10,00 − Desconto 6,39 = 3,61
    expect(r.data.items[0]).toMatchObject({
      quantityMilli: 1000,
      unitPriceCents: 1000,
      totalCents: 361,
    })
  })

  it('com Vl. Total já líquido: usa o total informado (não recalcula)', () => {
    const r = parseNfceHtml(fixtureTotalLiquido)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.items[0]).toMatchObject({
      quantityMilli: 2000,
      unitPriceCents: 500, // preço de tabela impresso, informativo
      totalCents: 861, // já líquido do desconto (2×5,00 seria 10,00)
    })
  })

  it('effectiveUnitPriceCents deriva o preço a cobrar do total líquido', () => {
    // caso do usuário: item a R$10,00 com R$6,39 de desconto → R$3,61
    expect(
      effectiveUnitPriceCents({
        quantityMilli: 1000,
        unitPriceCents: 1000,
        totalCents: 361,
      }),
    ).toBe(361)

    // 2 unidades, total líquido 8,61 → 4,305/un, arredonda para 431
    expect(
      effectiveUnitPriceCents({
        quantityMilli: 2000,
        unitPriceCents: 500,
        totalCents: 861,
      }),
    ).toBe(431)
  })

  it('effectiveUnitPriceCents sem total informado mantém o preço de tabela', () => {
    expect(
      effectiveUnitPriceCents({
        quantityMilli: 4000,
        unitPriceCents: 1590,
        totalCents: null,
      }),
    ).toBe(1590)
  })

  it('effectiveUnitPriceCents nunca deriva preço menor que 1 centavo', () => {
    // desconto absurdo/erro de parsing não pode zerar o preço
    expect(
      effectiveUnitPriceCents({
        quantityMilli: 1000,
        unitPriceCents: 500,
        totalCents: 0,
      }),
    ).toBe(500)
  })

  it('desconto em <tr> própria (Carrefour/SP): aplica só ao item anterior', () => {
    const r = parseNfceHtml(fixtureDescontoEmLinhaPropria)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.items).toHaveLength(3)

    // item antes do desconto: sem Vl.Total informado, não é tocado
    expect(r.data.items[0]).toMatchObject({
      quantityMilli: 1000,
      unitPriceCents: 278,
      totalCents: null,
    })

    // item com a linha "Desconto sobre item" logo depois: líquido
    // 3×6,39 = 19,17 − 6,39 = 12,78
    expect(r.data.items[1]).toMatchObject({
      quantityMilli: 3000,
      unitPriceCents: 639,
      totalCents: 1278,
    })

    // item seguinte: não recebe o desconto do item anterior nem o
    // "Descontos R$" agregado do bloco de totais (evita contar 2x)
    expect(r.data.items[2]).toMatchObject({
      quantityMilli: 1000,
      unitPriceCents: 929,
      totalCents: null,
    })
  })
})
