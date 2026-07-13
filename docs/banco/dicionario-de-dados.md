# Dicionário de Dados — ContaFácil

Colunas comuns a todas as tabelas (omitidas das tabelas abaixo):

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `created_at` | `timestamptz` | Criação da linha (default `now()`) |
| `updated_at` | `timestamptz` | Última escrita — mantida pelo trigger `touch` |
| `version` | `bigint` | Contador incremental por linha (trigger `touch`); base da idempotência do realtime (FA-91) |

## ENUMs

| Tipo | Valores | Origem |
|------|---------|--------|
| `table_status` | `ABERTA`, `FECHANDO`, `FECHADA` | máquina de estados da mesa |
| `settlement_mode` | `RECEBEDOR_FIXO`, `RECEBEDOR_NO_FECHAMENTO`, `PAGAMENTO_DIRETO` | RN-002/D1 |
| `participant_status` | `ATIVO`, `SAIU` | máquina do participante |
| `participant_role` | `CRIADOR`, `MEMBRO` | RN-008 |
| `item_source` | `MANUAL`, `NFCE` | RN-021 |
| `assignment_mode` | `TODOS`, `PESSOA`, `GRUPO` | RN-022 |
| `payment_status` | `PENDENTE`, `INFORMADO`, `PAGO` | máquina do pagamento (RN-051) |

## `tables` — a mesa

| Coluna | Tipo | Nulo? | Descrição / regra |
|--------|------|-------|-------------------|
| `id` | `uuid` PK | não | |
| `join_code` | `text` | não | Código de entrada, único, `^[2-9A-HJ-NP-Z]{6}$` (RN-001; sem 0/O/1/I) |
| `name` | `text` | sim | Nome da mesa, 1–60 caracteres após trim |
| `status` | `table_status` | não | Transições só via trigger-guard (I-M1) |
| `settlement_mode` | `settlement_mode` | não | Alterável só com mesa `ABERTA` (RN-002) |
| `service_fee_bp` | `integer` | não | Taxa de serviço em basis points, 0–10000, default 1000 = 10% (RN-004) |
| `payee_participant_id` | `uuid` FK→participants | sim | Recebedor (modos A/B); definível em `ABERTA`/`FECHANDO` |
| `payee_pix_key` | `text` | sim | Chave PIX do recebedor — **obrigatória no modo A** (constraint); dado sensível, nunca logar |
| `establishment_pix_key` | `text` | sim | Chave PIX do estabelecimento (modo C, opcional — RN-053) |
| `closing_started_at` | `timestamptz` | sim | Preenchida pelo guard ao entrar em `FECHANDO`; base do `revert_stale_closing` |
| `closed_at` | `timestamptz` | sim | Preenchida ao virar `FECHADA` (constraint exige) |

Índices: `tables_join_code_unico`.

## `participants` — quem está na mesa

| Coluna | Tipo | Nulo? | Descrição / regra |
|--------|------|-------|-------------------|
| `id` | `uuid` PK | não | |
| `table_id` | `uuid` FK→tables (cascade) | não | |
| `auth_user_id` | `uuid` FK→auth.users | não | Dispositivo anônimo (ADR-006) |
| `name` | `text` | não | 1–30 caracteres após trim; único na mesa case-insensitive, inclusive de quem saiu (RN-007/FA-05) |
| `status` | `participant_status` | não | `SAIU` preserva consumo (RN-009); irreversível (I-P2) |
| `role` | `participant_role` | não | Um `CRIADOR` `ATIVO` por mesa (índice parcial, I-M5); migra na saída (RN-008) |
| `join_order` | `bigint` identity | não | Ordem de entrada — desempate do maior resto (RN-042) e herança de papel |
| `left_at` | `timestamptz` | sim | Obrigatória quando `SAIU` (constraint) |

Índices: `participants_nome_unico (table_id, lower(btrim(name)))`, `participants_um_criador_ativo` (parcial), `participants_uma_participacao_ativa (table_id, auth_user_id)` (parcial), `participants_table_idx`, `participants_auth_idx`.

## `items` — linhas de consumo

| Coluna | Tipo | Nulo? | Descrição / regra |
|--------|------|-------|-------------------|
| `id` | `uuid` PK | não | |
| `table_id` | `uuid` FK→tables (cascade) | não | |
| `description` | `text` | não | 1–100 caracteres após trim (RN-020) |
| `quantity` | `numeric(12,3)` | não | > 0; 3 casas para itens por peso (RN-020) |
| `unit_price_cents` | `bigint` | não | ≥ 1 — centavos inteiros (ADR-001) |
| `total_cents` | `bigint` | não | Calculado por trigger: `round(quantity × unit_price_cents)` — nunca vem do cliente |
| `source` | `item_source` | não | Informativa após a criação (RN-021) |
| `created_by` | `uuid` FK→participants | sim | Autor; trigger valida que pertence à mesa |

Índices: `items_table_idx`. Escritas só com mesa `ABERTA` (trigger `assert_open`).

## `assignments` — atribuição de (parte de) um item

| Coluna | Tipo | Nulo? | Descrição / regra |
|--------|------|-------|-------------------|
| `id` | `uuid` PK | não | |
| `table_id` | `uuid` FK→tables (cascade) | não | Desnormalizado; sobrescrito por trigger com o `table_id` do item |
| `item_id` | `uuid` FK→items (cascade) | não | |
| `mode` | `assignment_mode` | não | `TODOS` materializa snapshot dos ativos (RN-023) — a materialização são os members |
| `quantity` | `numeric(12,3)` | não | Unidades do item cobertas; Σ por item ≤ `items.quantity` (I-I2, trigger diferido) |

Índices: `assignments_table_idx`, `assignments_item_idx`.

## `assignment_members` — quem participa da atribuição

| Coluna | Tipo | Nulo? | Descrição / regra |
|--------|------|-------|-------------------|
| `id` | `uuid` PK | não | |
| `assignment_id` | `uuid` FK→assignments (cascade) | não | |
| `table_id` | `uuid` FK→tables (cascade) | não | Desnormalizado; sobrescrito por trigger |
| `participant_id` | `uuid` FK→participants | não | Precisa estar `ATIVO` no INSERT (I-D1/RN-010); único por assignment |
| `quantity` | `numeric(12,3)` | sim | Refinamento por unidades (RN-024) — XOR com `weight` (`num_nonnulls = 1`) |
| `weight` | `integer` | sim | Refinamento por peso ≥ 1 (proporção) — XOR com `quantity` |

Validação diferida (commit): ≥1 membro; refinamento homogêneo; se por quantidade, Σ membros = `assignments.quantity`; `PESSOA` tem exatamente 1 membro.

## `payments` — obrigações geradas no fechamento

| Coluna | Tipo | Nulo? | Descrição / regra |
|--------|------|-------|-------------------|
| `id` | `uuid` PK | não | |
| `table_id` | `uuid` FK→tables (cascade) | não | |
| `participant_id` | `uuid` FK→participants | não | Devedor; único por mesa (I-G2); trigger valida mesma mesa |
| `amount_cents` | `bigint` | não | ≥ 1; **imutável** após criação (trigger `CAMPO_IMUTAVEL`) |
| `status` | `payment_status` | não | Máquina por modo: A/B `PENDENTE→INFORMADO→PAGO` (recebedor pode rejeitar de volta); C `PENDENTE→PAGO` (RN-051) |
| `paid_declared_at` | `timestamptz` | sim | Carimbo do "paguei" (trigger) |
| `confirmed_at` | `timestamptz` | sim | Carimbo do "recebi"/pago (trigger) |

INSERT só durante `FECHANDO` (via `close_table`); UPDATE só de `status` com mesa `FECHADA` (RN-052).

## Views

| View | Conteúdo | Observação |
|------|----------|------------|
| `v_table_summary` | subtotal, taxa e total da mesa (fórmula contratual half-up em bigint), contagens | valores **por participante** antes do fechamento são do motor (FASE 03) — nunca desta view |
| `v_item_coverage` | quantidade coberta / sem dono por item | alimenta RN-025/032 |
| `v_payment_overview` | pagamentos com nome do devedor + `table_settled` | tudo `PAGO` ⇒ mesa quitada |

Todas com `security_invoker = true`: o RLS de quem consulta se aplica.

## Funções expostas (RPC)

| Função | Autorização | Papel no domínio |
|--------|-------------|------------------|
| `create_table(...)` | autenticado | UC-01; gera código; cria criador; modo A exige chave (RN-003) |
| `get_table_by_code(code)` | autenticado | FA-03/04; campos mínimos, sem valores |
| `join_table(code, name)` | autenticado | UC-02; idempotente por dispositivo; herda criação em mesa órfã (FA-17) |
| `leave_table(table_id)` | participante ativo | UC-07; migra papel atomicamente (RN-008) |
| `update_table_config(...)` | criador | RN-002/004 |
| `upsert_assignment(...)` | participante ativo (RLS, invoker) | UC-06; atribuição + membros numa transação |
| `start_closing(table_id)` | criador | RN-030/031 |
| `cancel_closing(table_id)` | criador | RN-034/FA-21 |
| `close_table(table_id, shares, payee?, pix?)` | criador | ADR-007; re-verifica conservação (RN-036); gera pagamentos (RN-035) |

Interna (não exposta): `private.revert_stale_closing()` — reverte mesas presas em `FECHANDO` há mais de 2 minutos (agendar na FASE 13).
