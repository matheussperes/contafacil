import { describe, expect, it } from 'vitest'
import {
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
