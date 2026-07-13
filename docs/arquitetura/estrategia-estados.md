# Estratégia de Estados — ContaFácil

Detalha o ADR-005. O princípio: estado é classificado pela **origem**, e cada origem tem exatamente um dono.

## As quatro origens

| Origem | Dono | Exemplos | Persistência |
|--------|------|----------|--------------|
| Servidor | TanStack Query (cache) | mesa, participantes, itens, distribuições, pagamentos | cache em memória; refetch/realtime |
| UI efêmera | Zustand (store por feature) | sheet aberto, item em arraste, seleção de grupo em curso | nenhuma |
| Dispositivo | `DeviceStorage` (port → localStorage) | sessão anônima (supabase-js), participação por mesa, mesas recentes | localStorage |
| Domínio (derivado) | funções puras de `src/domain` | "pode editar?", "parte de cada um", "mesa quitada?" | nunca armazenado — sempre recalculado |

## Estado do servidor

- Chaves canônicas: `['table', id]` (snapshot completo da mesa: mesa + participantes + itens + distribuições) e `['payments', id]`.
- **Snapshot único por mesa** em vez de N queries por entidade: a mesa é pequena (dezenas de itens) e o produto raciocina sempre sobre o conjunto — simplifica consistência e a ressincronização (FA-90).
- Eventos realtime atualizam o cache via reducer tipado (`application/events`); em dúvida (gap de eventos, reconexão), **invalidate + refetch completo** — o snapshot é a autoridade.
- `staleTime` alto com a assinatura realtime ativa (o push mantém fresco); refetch agressivo on-focus/on-reconnect.

## Máquina de estados no cliente

Os estados da mesa/pagamento (FASE 00) são **uniões discriminadas** no domínio:

```ts
type TableState =
  | { status: 'ABERTA' }
  | { status: 'FECHANDO'; startedAt: IsoDate }
  | { status: 'FECHADA'; closedAt: IsoDate }
```

A UI **deriva capacidades** por seletores do domínio (`canEditItems(table, participant)`, `canClose(table, participant)`) — nunca compara strings de status em componente. Assim RN-031/033 têm implementação única.

## Optimistic updates — política

| Operação | Otimista? | Racional |
|----------|-----------|----------|
| Criar/editar/remover item | ✅ com rollback | reversível, conflito improvável, latência percebida importa |
| Distribuição de consumo | ✅ com rollback | idem; reconciliação pelo snapshot em conflito (FA-15) |
| Entrar/sair da mesa | ❌ | envolve unicidade de nome e migração de papel — servidor decide |
| Fechamento | ❌ **nunca** | transação crítica (ADR-007); UI espera o resultado real |
| Status de pagamento | ❌ | RN-051 tem autorização por papel; feedback real em <1s via realtime |

Rollback = restaurar o snapshot anterior do cache + toast de erro (estratégia de erros).

## Antipadrões (defeito em revisão)

1. Dado do servidor copiado para store Zustand ou `useState`.
2. Componente decidindo regra por `if (status === 'ABERTA')` em vez de seletor do domínio.
3. Cálculo de dinheiro fora de `domain/calculator` (inclusive "somazinha" em componente).
4. Estado derivado persistido.
