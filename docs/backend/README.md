# Backend — Camada de Aplicação e Infraestrutura (FASE 04)

Liga o motor (FASE 03) ao banco (FASE 02) via Clean Architecture (ADR-004). A UI (FASE 07+) consome exclusivamente os **services**; nunca os repositories.

## Estrutura

```
src/application/
├── errors.ts                    ValidationError, InfrastructureError
├── ports/                       interfaces (o domínio da aplicação)
│   ├── table-gateway.ts         TableGateway, ItemRepository,
│   │                            AssignmentRepository, PaymentRepository
│   ├── device-storage.ts        DeviceStorage (sessão por mesa)
│   └── logger.ts                Logger estruturado
├── validators/inputs.ts         zod na borda: nome, código, dinheiro, taxa
└── services/                    casos de uso por agregado
    ├── table-service.ts         UC-01/02/07 + configuração
    ├── item-service.ts          UC-03/05 (+ addMany p/ NFC-e)
    ├── assignment-service.ts    UC-06 (todos/pessoa/grupo, snapshot RN-023)
    ├── payment-service.ts       UC-09/10 (transição decidida pelo domínio)
    └── closing-service.ts       UC-08 (esqueleto; FASE 09 completa)

src/infrastructure/
├── composition.ts               único ponto de injeção (buildServices)
├── supabase/
│   ├── client.ts                client singleton + sessão anônima (ADR-006)
│   ├── database-types.ts        linhas do banco (FASE 02)
│   ├── mappers.ts               linha ↔ entidade; numeric(12,3) ↔ mili
│   ├── errors.ts                erro Supabase → taxonomia do projeto
│   └── repositories/            4 implementações dos ports
├── storage/local-device-storage.ts   localStorage (fallback memória)
└── logging/                     console-logger + redação
```

## Decisões desta fase

1. **RPC para mutações de risco, escrita direta para o resto.** `TableGateway` mapeia 1:1 as funções da FASE 02 (`create_table`, `join_table`, `leave_table`, `close_table`…). Itens e distribuição usam escrita direta sob RLS; a atomicidade da distribuição vem da RPC `upsert_assignment`.
2. **A borda converte, o núcleo é inteiro.** Todo dinheiro/quantidade é convertido para centavos/mili-unidades nos validators (entrada do usuário) e nos mappers (`numeric(12,3)` textual do banco → inteiro), sem passar por float impreciso. `numericToMilli`/`milliToNumeric` são testados ida-e-volta.
3. **Erros traduzidos numa fronteira só.** `translateSupabaseError` reconhece os códigos de domínio que os triggers lançam (`MESA_CONGELADA`…), constraints nomeadas (`NOME_DUPLICADO`), RLS (`RLS_DENIED`, não-retryável) e rede (retryável). A UI nunca vê erro cru de Postgres.
4. **Transição de pagamento decidida pelo domínio.** `PaymentService` usa `availablePaymentActions` (FASE 03) para saber o que este participante pode fazer; o banco re-valida (defesa em profundidade). Nenhuma regra duplicada na aplicação.
5. **Redação de sensíveis por construção.** O logger mascara `pixKey`, `brCode`, tokens e URL de NFC-e em qualquer profundidade antes de emitir — testado.

## Testes (70 no total do projeto; 22 desta fase)

- `services.test.ts` — orquestração com fakes: criação/validação de mesa, parse de "15,90"→1590 e "0,5"→500, snapshot de "Todos" só com ativos, refinamento misto rejeitado, máquina de pagamento por papel, fechamento por modo com Σ shares = total.
- `infrastructure.test.ts` — redação, níveis de log, conversão numeric↔mili ida-e-volta, tradução de erros, DeviceStorage.

## Pendências de ambiente (honestidade)

Os **testes de integração contra banco local** (repositories reais + RLS + realtime), previstos no ADR-010, exigem Supabase rodando (Docker), indisponível neste ambiente. A camada equivalente já é exercida de duas formas:

- as **funções e policies** foram testadas diretamente em Postgres na FASE 02 (`supabase/tests/database.test.sql`);
- os **services** são testados aqui com dublês dos ports.

Ao ter Docker disponível, resta escrever os testes `tests/integration/*.test.ts` que instanciam os repositories Supabase contra o banco local — o contrato (ports) já está fixado.
