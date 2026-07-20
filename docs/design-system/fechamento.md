# Fechamento — FASE 09

Implementa toda a máquina de estados do fechamento (F6), do gatilho aos
pagamentos gerados: `ABERTA → validar → FECHANDO → motor → close_table →
FECHADA`.

## Peças

- `ClosingService` (estendido) — `validate` (detecta itens sem dono,
  RN-030/032), `divideUnassignedAmongAll` (RN-032: cria atribuição "Todos"
  por item órfão), `start`/`cancel`/`finish`. O `finish` busca o snapshot
  **fresco do servidor**, calcula as partes pelo motor (FASE 03) e chama
  `close_table` (RPC atômica, ADR-007), que re-verifica a conservação.
- `useClosing` — orquestra o fluxo na UI e, em qualquer falha, chama
  `cancel` para reverter `FECHANDO → ABERTA` (FA-21) e exibe o erro.
- `ClosingDialog` — validação de itens sem dono com as duas únicas saídas
  (dividir entre todos / voltar e distribuir), escolha de recebedor no
  modo B, e confirmação.
- `PaymentsPanel` — mesa FECHADA/FECHANDO em modo leitura: pagamentos por
  participante e status; "tudo quitado" quando todos PAGO (F8). PIX vem na
  FASE 10.

## Máquina de estados (defesa em profundidade)

A transição é barrada em três camadas, como projetado:
1. **UI** — `canStartClosing` (seletor do domínio) habilita o botão só
   para o criador com itens/participantes; itens sem dono bloqueiam o
   "Fechar conta" até resolver.
2. **Aplicação** — `finish` só monta pagamentos válidos por modo e exige
   recebedor no modo B.
3. **Banco** — `close_table` re-verifica `Σ partes = total`
   (`CONSERVACAO_VIOLADA`) e as transições; falha reverte tudo (atômico).

## Congelamento e reversão

Durante `FECHANDO`, a mesa fica congelada para todos (trigger
`assert_open` da FASE 02 → `MESA_CONGELADA`). Se o `finish` falha, o
`useClosing` reverte para `ABERTA` e informa "nada foi alterado" — o
fechamento é reexecutável do zero (idempotente).

## Testes

`closing-service.test.ts`: `validate` detecta órfãos; `divideUnassigned`
cria a atribuição "Todos"; ausência do repositório → `OPERACAO_INVALIDA`.
Os testes de conservação do fechamento (Σ pagamentos) já vivem no motor
(FASE 03) e no banco (FASE 02). Total: 98 testes verdes.

## Pendência de ambiente

O E2E do fechamento (dois dispositivos vendo a mesa congelar e fechar) e a
verificação atômica end-to-end dependem de Supabase (Docker). A transação
`close_table` já foi testada diretamente em Postgres na FASE 02
(`database.test.sql`, bloco T08: autorização, congelamento, conservação,
atomicidade).
