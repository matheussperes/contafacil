# FASE 10 — PIX

## Contexto

FASES 00–09 aprovadas. A mesa fecha e gera pagamentos por participante. Falta o meio de pagar: PIX **estático**, sem nenhuma integração bancária.

## Objetivo

Gerar payload PIX (BR Code / EMV) válido para cada pagamento, com copia-e-cola e QR Code, e permitir o acompanhamento manual do status.

## Fluxo

```
Payload PIX
   ↓
Copia e Cola
   ↓
QR Code
   ↓
Status
   ↓
Pago
```

## Entregáveis

1. **Payload PIX** — geração do BR Code estático (padrão EMV-MPM do Banco Central) com chave do recebedor, valor do pagamento e identificador; implementado como módulo puro e testável (incluindo CRC16).
2. **Copia e Cola** — string PIX exibida com botão de copiar e feedback (Toast do design system).
3. **QR Code** — renderização do QR a partir do payload, legível por apps bancários.
4. **Status** — estados do pagamento conforme máquina de estados (ex.: PENDENTE → PAGO), com marcação **manual** de "paguei"/"recebi" conforme regras da FASE 00.
5. **Propagação realtime** — evento "Pagamento atualizado" (FASE 05) reflete o status para todos.
6. **Testes** — payloads validados contra vetores conhecidos do padrão; casos com/sem valor, nomes longos, caracteres especiais.

## Fora do escopo

- **Nada de integração bancária.** Sem API de PSP, sem webhook de confirmação, sem PIX dinâmico.
- Conciliação automática de pagamento.
- Novas telas além das necessárias ao fluxo de pagamento.

## Critérios de aceite

- [ ] Payload gerado é aceito por apps bancários reais (validado manualmente) e passa nos testes de CRC/formato.
- [ ] Copia-e-cola e QR Code funcionam para cada pagamento gerado no fechamento.
- [ ] Mudança de status propaga em tempo real para todos os participantes.
- [ ] Build, testes e lint verdes; fechamento (FASE 09) não modificado.

## Dependências

- FASE 09 aprovada (pagamentos gerados), FASE 05 aprovada (evento de pagamento).
