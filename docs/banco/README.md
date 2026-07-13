# Banco de Dados — ContaFácil (FASE 02)

Schema Postgres/Supabase versionado em `supabase/migrations/`, com RLS em todas as tabelas e a transação de fechamento como função SQL (ADR-003/007).

## Conteúdo

- [Diagrama ER](diagrama-er.md) — entidades e relacionamentos
- [Dicionário de dados](dicionario-de-dados.md) — tabela a tabela, coluna a coluna
- [Policies de RLS](policies.md) — justificativa de cada policy e do modelo de acesso

## Migrations

| Arquivo | Conteúdo |
|---------|----------|
| `20260713100000_enums.sql` | 7 ENUMs do domínio (estados e modos da FASE 00) |
| `20260713100100_tables.sql` | 6 tabelas, constraints, índices, replica identity |
| `20260713100200_triggers.sql` | janela de edição, transições, total do item, validação diferida de distribuição, máquina do pagamento |
| `20260713100300_functions.sql` | helpers de autorização + API: `create_table`, `join_table`, `leave_table`, `update_table_config`, `upsert_assignment`, `start_closing`, `cancel_closing`, `close_table`, `revert_stale_closing` |
| `20260713100400_rls.sql` | RLS habilitado + policies + grants |
| `20260713100500_views.sql` | `v_table_summary`, `v_item_coverage`, `v_payment_overview` |
| `20260713100600_realtime.sql` | publicação `supabase_realtime` das 6 tabelas |

## Decisões de modelagem

1. **Escrita direta só onde é segura.** Itens e distribuição são CRUD direto sob RLS (participante ativo + mesa `ABERTA`). Mesa, participantes, fechamento e geração de pagamentos passam por funções `SECURITY DEFINER` que validam autorização e executam atomicamente (RN-008, RN-034).
2. **Distribuição em duas tabelas.** `assignments` (o quê/modo/quantas unidades cobre) e `assignment_members` (quem, com refinamento por quantidade OU peso — `num_nonnulls = 1`). Validações de consistência (I-I2, soma dos membros, PESSOA com 1 membro) são **constraint triggers diferidos**: rodam no commit, permitindo escrever atribuição + membros na mesma transação (`upsert_assignment`).
3. **`table_id` desnormalizado** em `assignments`/`assignment_members`: policies de RLS e filtros realtime baratos, coerência garantida por trigger (não confia no cliente).
4. **Contrato numérico com o motor (FASE 03):** dinheiro `bigint` em centavos; taxa em basis points; taxa total = `(subtotal × bp + 5000) / 10000` em divisão **inteira** (half-up). `close_table` re-verifica `Σ partes = total` e rejeita com `CONSERVACAO_VIOLADA` (RN-036).
5. **Erros como códigos de domínio** na mensagem (`MESA_CONGELADA`, `NOME_DUPLICADO`…), mapeados pela aplicação (estratégia de erros da FASE 01).
6. **`ABERTA → FECHANDO → FECHADA` no banco:** trigger rejeita qualquer outra transição; mesas presas em `FECHANDO` são revertidas por `revert_stale_closing()` (agendar via pg_cron na FASE 13).

## Como validar

**Com Supabase CLI (Docker):**

```bash
supabase db reset          # aplica migrations + seed
psql "$SUPABASE_DB_URL" -f supabase/tests/database.test.sql
```

**Sem Docker (Postgres local ≥ 15):**

```bash
supabase/tests/run-local.sh
```

O runner sobe um cluster efêmero, aplica `tests/auth-shim.sql` (emulação local de `auth.users`/`auth.uid()` — nunca aplicado no Supabase real), todas as migrations, o seed e a suíte `tests/database.test.sql` (11 blocos: criação, entrada, RLS permite/nega, itens, distribuição, saída com migração de papel, fechamento com conservação, máquina do pagamento, cancelamento e views).

## Seed

Dois cenários em `supabase/seed.sql`:

- **"Bar do Zé"** (`BARZE2`): mesa `ABERTA`, modo B, 4 participantes (1 saiu com consumo preservado — RN-009), 5 itens cobrindo os 3 modos de distribuição + refinamento por quantidade, e um item **sem dono** (RN-025).
- **"Churrasco da firma"** (`CHURAS`): mesa `FECHADA` **via `close_table` real** (valida conservação no próprio seed), modo A, pagamento em estado `INFORMADO`.
