/**
 * Estrutura intermediária normalizada da NFC-e (RN-060). Independe do
 * formato de origem (varia por estado/SEFAZ). É o contrato entre o
 * parser e a tela de revisão.
 */
export interface ParsedNfceItem {
  description: string
  /** quantidade em mili-unidades inteiras (3 casas) */
  quantityMilli: number
  /** preço unitário em centavos inteiros */
  unitPriceCents: number
  /** total em centavos, quando a nota informa (para conferência) */
  totalCents: number | null
}

export interface ParsedNfce {
  items: ParsedNfceItem[]
  /** UF de origem, quando identificável (para logs sem PII) */
  uf: string | null
  /**
   * Desconto agregado da nota (bloco de totais), sem item específico
   * atribuído — só a pessoa que revisa sabe qual item foi a promoção.
   * `null` quando a nota não tem desconto agregado, ou quando o desconto
   * já veio atribuído por item (evita contar duas vezes).
   */
  noteDiscountCents: number | null
}

export type NfceParseResult =
  | { ok: true; data: ParsedNfce }
  | { ok: false; reason: NfceFailureReason }

export type NfceFailureReason =
  | 'QR_INVALIDO' // não é URL de NFC-e
  | 'SEFAZ_INDISPONIVEL' // fetch falhou
  | 'FORMATO_DESCONHECIDO' // HTML não reconhecido
  | 'SEM_ITENS' // parseou mas não achou itens
