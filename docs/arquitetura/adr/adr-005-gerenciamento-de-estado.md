# ADR-005 — Estado: TanStack Query + Zustand, realtime escreve no cache

**Status:** Aceito · **Data:** 13/07/2026 · **Detalhamento:** `estrategia-estados.md`

## Contexto

A tela da mesa é um documento vivo: o estado "verdadeiro" mora no servidor e muda por ações de outras pessoas (realtime). Misturar isso com estado de UI (bottom sheet aberto, item sendo arrastado) num único store é receita para inconsistência.

## Decisão

Separar estado por **origem**, não por tela:

1. **Estado do servidor** — **TanStack Query v5**. Cache por chave (`['table', tableId]`, `['payments', tableId]`…). Os eventos realtime **escrevem no cache** (`setQueryData`) ou o invalidam; a UI apenas assina o cache.
2. **Estado de UI** — **Zustand v5**, stores pequenos e efêmeros por feature (seleção de distribuição em curso, sheet aberto). Nunca contém dados do servidor.
3. **Estado do dispositivo** — identidade anônima e mesas visitadas em `localStorage`, atrás de um port (`DeviceStorage`).
4. A **máquina de estados da mesa** vive no domínio como união discriminada; a UI deriva permissões ("pode editar?") exclusivamente de seletores do domínio — nunca reimplementa a regra.

## Alternativas consideradas

1. **Redux Toolkit + RTK Query** — equivalente, porém mais cerimônia; TanStack Query tem modelo de invalidação/refetch mais direto para o padrão "realtime + ressincronização".
2. **Só Zustand para tudo** — rejeitada: reimplementaria à mão cache, refetch, stale-time e deduplicação que a Query já resolve.
3. **Estado 100% derivado de eventos (event sourcing no cliente)** — elegante, mas a ressincronização pós-reconexão (FA-90) já exige snapshot completo; manter snapshot como fonte primária é mais simples e mais robusto.

## Consequências

- Regra de ouro: **dado do servidor só existe no cache da Query**; qualquer cópia em store de UI é bug de revisão.
- Optimistic updates permitidos apenas onde o rollback é trivial (criar/editar item, distribuição); **proibidos no fechamento e em pagamentos** (política em `estrategia-estados.md`).
- Persistência do cache (offline L2) entra na FASE 12 sem mudar este modelo.
