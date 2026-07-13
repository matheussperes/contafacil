# Estratégia Realtime — ContaFácil

Como os 8 eventos do produto (FASE 05) chegam a todos os participantes. Detalha o que o ADR-003/005 fixam.

## Topologia

- **Um canal por mesa**: `table:{tableId}`. Assinado ao entrar na tela da mesa; desassinado ao sair dela.
- Fonte dos eventos: **`postgres_changes`** — mudanças nas tabelas (filtradas por `table_id`) emitidas pelo Supabase Realtime. Nenhum evento é "inventado" pelo cliente: o que aconteceu no banco é o que é propagado (fonte única de verdade).
- **Presence** (quem está com a tela aberta) entra na FASE 07 como recurso do mesmo canal — não confundir com participante `ATIVO` (estado de domínio).

## Catálogo de eventos

O adapter (`infrastructure/supabase/realtime`) traduz mudanças cruas em **eventos tipados do domínio** (`application/events`) — payload cru do Supabase não vaza para cima:

| Evento (FASE 00/05) | Origem (`postgres_changes`) | Payload tipado |
|---------------------|------------------------------|----------------|
| Mesa criada | INSERT `tables` | `TableCreated { table }` |
| Pessoa entrou | INSERT `participants` | `ParticipantJoined { participant }` |
| Pessoa saiu | UPDATE `participants` (→ SAIU) | `ParticipantLeft { participantId, newOwnerId? }` |
| Item criado | INSERT `items` | `ItemCreated { item }` |
| Item editado | UPDATE/DELETE `items` | `ItemUpdated { item } / ItemRemoved { itemId }` |
| Consumo atualizado | INSERT/UPDATE/DELETE `assignments` | `AssignmentChanged { itemId, assignments }` |
| Mesa fechada | UPDATE `tables` (status) | `TableStateChanged { state }` (cobre FECHANDO e FECHADA) |
| Pagamento atualizado | INSERT/UPDATE `payments` | `PaymentUpdated { payment }` |

## Consistência: idempotência e ordenação

- Toda linha carrega `updated_at` + `version` (contador por linha, FASE 02). O reducer só aplica evento **mais novo** que o estado em cache — evento duplicado ou atrasado é descartado (FA-91).
- Eventos são **deltas de conveniência**; a autoridade é o snapshot. Regra de dúvida: qualquer suspeita de gap (versão saltou, evento órfão) → `invalidateQueries(['table', id])` e refetch. Corretude nunca depende de receber todos os eventos.

## Reconexão (FA-90)

1. Canal cai → UI marca "reconectando" (estado do adapter, não do domínio).
2. Ao voltar (`SUBSCRIBED`): **refetch do snapshot completo antes** de reaplicar eventos.
3. Backoff exponencial gerido pelo supabase-js; após limite, erro visível com ação "recarregar".

## Segurança

- Realtime respeita RLS: cliente só assina mudanças de mesas onde é participante (Realtime Authorization / policies da FASE 02).
- Nenhum dado de outra mesa trafega no canal, por construção.

## Teste (FASE 05)

- Unitário: reducer com eventos duplicados/fora de ordem (propriedade: qualquer permutação de eventos + refetch final converge).
- Integração: 2 clients contra Supabase local — ação de um observada no outro, para os 8 eventos.
