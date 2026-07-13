# FASE 05 — Realtime

## Contexto

FASES 00–04 aprovadas. Os CRUDs funcionam, mas cada cliente só vê o próprio estado. A mesa é colaborativa: todos os participantes precisam ver as mudanças em tempo real.

## Objetivo

Implementar a **sincronização completa** do estado da mesa entre todos os clientes conectados, conforme a estratégia Realtime definida na FASE 01.

## Entregáveis

Todos os eventos abaixo propagados **em tempo real** para todos os participantes da mesa:

```
Mesa criada
   ↓
Pessoa entrou
   ↓
Pessoa saiu
   ↓
Item criado
   ↓
Item editado
   ↓
Consumo atualizado
   ↓
Mesa fechada
   ↓
Pagamento atualizado
```

Implementação:

1. **Canal por mesa** — assinatura/desassinatura ligada ao ciclo de vida da participação.
2. **Camada de eventos tipada** — cada evento com payload definido; nenhum consumidor lida com payload cru do Supabase.
3. **Reconexão** — ao reconectar, o cliente ressincroniza o estado completo antes de voltar a aplicar eventos incrementais.
4. **Ordenação/idempotência** — eventos duplicados ou fora de ordem não corrompem o estado local.
5. **Testes** — unitários da camada de eventos e teste de integração com dois clientes simulados (ação de um aparece no outro).

## Fora do escopo

- Interface visual (indicadores de presença virão com as telas, FASE 07+).
- Suporte offline completo (FASE 12) — aqui apenas a ressincronização pós-reconexão.
- Novos CRUDs ou mudanças de schema.

## Critérios de aceite

- [ ] Os 8 eventos listados propagam para todos os clientes da mesa.
- [ ] Cliente que reconecta converge para o mesmo estado dos demais.
- [ ] Evento duplicado/fora de ordem não corrompe estado (teste cobrindo).
- [ ] Nenhum payload cru do provedor vaza para fora da camada de eventos.
- [ ] Build, testes e lint verdes; módulos aprovados intocados.

## Dependências

- FASE 01 aprovada (estratégia Realtime).
- FASE 04 aprovada (CRUDs que originam os eventos).
