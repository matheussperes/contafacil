# ADR-007 — Fechamento atômico via função SQL (RPC), cálculo no domínio

**Status:** Aceito · **Data:** 13/07/2026 · **Regras relacionadas:** RN-033..036

## Contexto

O fechamento é uma transação multi-tabela: mudar estado da mesa, gravar N pagamentos, verificar invariantes — tudo ou nada (RN-034). O cliente falando direto com o Supabase (ADR-003) não tem transação entre múltiplos requests. Ao mesmo tempo, a regra 4 do projeto exige a lógica de negócio no **domínio TS** — o motor matemático não pode ser reimplementado em SQL.

## Decisão

Dividir responsabilidades em duas metades com um contrato verificável entre elas:

1. **Cálculo no domínio (cliente):** o motor (`domain/calculator`, FASE 03) computa as partes finais e os pagamentos a gerar — puro, testado, determinístico (RN-042 garante mesmo resultado em qualquer dispositivo).
2. **Persistência atômica no banco:** uma função SQL `close_table(table_id, payments[])`, chamada via RPC, executa em uma transação:
   - guarda: mesa está `FECHANDO` e o chamador é o criador (RN-031/033);
   - **re-verifica as invariantes** RN-036 sobre os dados do banco (Σ pagamentos vs. total, cobertura das distribuições) — o banco não confia cegamente no cliente;
   - grava os pagamentos, transita para `FECHADA`, ou aborta tudo (`FECHANDO → ABERTA`).

A função SQL **não calcula divisão nem arredondamento** — apenas confere somas (aritmética inteira trivial) e persiste. A transição `ABERTA → FECHANDO` é um update guardado comum; um `timeout` (trigger/job) reverte mesas presas em `FECHANDO`.

## Alternativas consideradas

1. **Motor matemático em PL/pgSQL** — atomicidade perfeita, mas viola a regra 4, duplica a lógica mais crítica do produto fora do alcance dos testes de domínio; rejeitada.
2. **Edge Function que importa o domínio TS** — manteria o cálculo em TS no servidor; adiciona um deploy e uma latência a mais sendo que a verificação por somas na função SQL já dá a mesma garantia; fica como evolução se surgir necessidade de esconder o cálculo do cliente.
3. **Sequência de writes do cliente sem transação** — viola RN-034 (FA-21); rejeitada de pronto.

## Consequências

- A invariante de conservação é garantida **duas vezes**: por construção no motor (testes, FASE 03) e por verificação na transação (FASE 02).
- Cliente malicioso não fecha mesa com somas erradas: a função rejeita.
- A FASE 02 entrega `close_table` + testes; a FASE 09 apenas orquestra.
