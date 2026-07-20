# PIX — FASE 10

Gera o pagamento via PIX **estático** (BR Code EMV do Banco Central), com
copia-e-cola e QR Code, e permite marcar o status manualmente por papel.
Sem nenhuma integração bancária (visão do produto).

## Domínio (puro e testado)

- `crc16.ts` — CRC16/CCITT-FALSE do campo 63. Verificado contra o vetor
  canônico `"123456789" → 0x29B1`.
- `brcode.ts` — monta os campos TLV do EMV-MPM: payload format, ponto de
  iniciação **estático** (`010211`), merchant account com a chave
  (`br.gov.bcb.pix`), moeda `986` (BRL), valor com 2 casas, país, nome e
  cidade sanitizados (ASCII, maiúsculas, limites do EMV), txid e o CRC
  final. Testado: estrutura, campos, sanitização e recomputo do CRC.
- `payment-brcode.ts` — escolhe a chave por modo (RN-050/053): A/B →
  recebedor; C → estabelecimento; C sem chave → sem BR Code (cartão/outro
  meio).

## UI

- `QrCode` — renderiza o QR a partir do payload (biblioteca `qrcode`,
  client-only).
- `PaymentSheet` — valor exato, PIX copia-e-cola (com botão copiar +
  Toast) e QR quando há chave; senão, orientação para pagar por
  cartão/outro meio (RN-053). Os botões de status vêm de
  `availablePaymentActions` (domínio): devedor "Já paguei"; recebedor
  "Recebi"/"Não recebi"; modo C autodeclara PAGO.
- `PaymentsPanel` — cada pagamento abre o sheet; propaga status em tempo
  real (evento da FASE 05); "tudo quitado" quando todos PAGO.

## Conformidade

O copia-e-cola está **sempre** disponível como alternativa equivalente ao
QR (RN-050/FA-24). A mudança de status respeita papel e mesa FECHADA
(RN-051/052) — validada no domínio e no trigger do banco (FASE 02).

## Testes

12 novos (crc16 + brcode + payment-brcode), incluindo o vetor de CRC e o
caso C sem chave (CA-053). Total do projeto: 110 testes verdes.

## Pendência de ambiente

A validação "payload aceito por app bancário real" (CA-050) é manual e
exige um celular com app de banco — fora deste ambiente. O que é
automatizável (formato EMV, CRC, campos, sanitização) está coberto por
teste; o payload segue o padrão EMV-MPM e é estruturalmente válido.
