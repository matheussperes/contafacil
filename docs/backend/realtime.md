# Realtime — Sincronização da mesa (FASE 05)

Propaga os 8 eventos do produto (estrategia-realtime.md) a todos os
participantes conectados, sem que payload cru do Supabase escape da
camada de infraestrutura.

## Peças

```
src/application/events/
├── table-events.ts        TableEvent (união dos 8 eventos + variantes)
└── snapshot-reducer.ts    applyEvent/applyEvents — idempotente por version

src/application/ports/realtime.ts   RealtimeGateway, sinais de conexão

src/infrastructure/supabase/realtime/
├── change-translator.ts             postgres_changes cru → TableEvent (puro)
└── supabase-realtime-gateway.ts     canal por mesa + reconexão + refetch
```

## Como os 8 eventos aparecem

| Evento (FASE 00) | Origem no banco | TableEvent |
|------------------|-----------------|------------|
| Mesa criada | INSERT tables | `TableCreated` |
| Mesa fechada / FECHANDO | UPDATE tables | `TableStateChanged` |
| Pessoa entrou | INSERT participants | `ParticipantJoined` |
| Pessoa saiu | UPDATE participants (→SAIU) | `ParticipantLeft` |
| Item criado | INSERT items | `ItemCreated` |
| Item editado | UPDATE/DELETE items | `ItemUpdated` / `ItemRemoved` |
| Consumo atualizado | */assignments+members | `AssignmentChanged` / `AssignmentRemoved` |
| Pagamento atualizado | INSERT/UPDATE payments | `PaymentUpdated` |

## Decisões

1. **Snapshot é a autoridade; eventos são deltas.** O reducer aplica um
   evento só se sua `version` (contador por linha da FASE 02) for maior
   que a da entidade em cache. Assim, evento **duplicado** ou **fora de
   ordem** nunca corrompe o estado (FA-91) — provado por propriedade:
   qualquer permutação dos eventos converge ao mesmo snapshot, e aplicar
   o mesmo lote duas vezes é igual a aplicar uma vez.
2. **Distribuição mora em duas tabelas.** Como `assignment_members` é
   separada de `assignments`, o adapter **refaz o fetch da atribuição
   completa** (com membros) ao ver qualquer mudança nas duas, e só então
   emite `AssignmentChanged`. O reducer nunca recebe atribuição sem
   membros (que apagaria o consumo em cache).
3. **Reconexão = ressincronização.** O gateway distingue a primeira
   inscrição (`subscribed`) de uma reinscrição após queda
   (`reconnected`); a UI (FASE 07) reage a `reconnected` refazendo o
   snapshot antes de voltar a aplicar eventos (FA-90). Corretude nunca
   depende de ter recebido todos os eventos.
4. **RLS filtra o canal.** `postgres_changes` respeita as policies da
   FASE 02: cada cliente só recebe mudanças de mesas onde é participante
   — isolamento entre mesas por construção, sem config extra.

## Testes

- `snapshot-reducer.test.ts` — inserção/atualização/remoção, cascade de
  item→atribuições, idempotência, descarte de evento atrasado, e as duas
  **propriedades de convergência** (permutação e dupla aplicação).
- `change-translator.test.ts` — cada tabela → evento correto, conversão
  de quantidade/valor, DELETE e linha nula.

## Pendência de ambiente

O teste de integração "dois clients, ação de um aparece no outro" (ADR-010)
exige Supabase Realtime rodando (Docker). A lógica testável offline — a
tradução e o reducer, onde mora todo o risco de corrupção — está coberta
por unidade e propriedade. O adapter é uma casca fina sobre o client.
