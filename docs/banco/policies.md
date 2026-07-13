# Policies de RLS — justificativas

Modelo de acesso (ADR-003/006): **toda a segurança mora no banco**. O cliente fala direto com o Supabase; o que a policy não permitir, não acontece — não existe camada de API para compensar. Por isso cada policy tem teste "permite" e "nega" (`supabase/tests/database.test.sql`, T04/T06/T08/T09).

## Princípios

1. **Sem acesso anônimo cru**: todos os grants são para `authenticated` (o app usa Anonymous Sign-in — o usuário é "anônimo" para o produto, mas autenticado para o banco). `anon` não tem grant algum.
2. **Leitura = ser participante da mesa.** Inclusive quem saiu (`SAIU`): continua vendo a mesa e a própria dívida (RN-010/F8).
3. **Escrita direta apenas em itens e distribuição**, e somente por participante **ativo** — o restante muda por função `SECURITY DEFINER` com validação explícita.
4. **Policy decide *quem*; trigger decide *quando/como*.** Ex.: a policy permite `UPDATE` em `payments` ao devedor/recebedor; o trigger valida a transição exata da máquina e o momento (mesa `FECHADA`). Defesa em profundidade: as duas camadas precisariam falhar juntas.

## Por tabela

### `tables`
| Policy | Regra | Justificativa |
|--------|-------|---------------|
| `tables_select` | `is_participant(id)` | Só quem está na mesa vê a mesa (valores, chaves PIX). A descoberta pública para entrar é a função `get_table_by_code`, que expõe apenas id/nome/status/nº de participantes — nunca itens, valores ou chaves. |
| *(sem insert/update/delete)* | — | Criação (`create_table`), configuração (`update_table_config`, só criador) e transições (`start_closing`/`cancel_closing`/`close_table`) são funções com autorização própria. Mesa nunca é apagada pela API. |

### `participants`
| Policy | Regra | Justificativa |
|--------|-------|---------------|
| `participants_select` | `is_participant(table_id)` | A lista de participantes é da mesa. |
| *(sem escrita direta)* | — | Entrar (`join_table`) resolve unicidade de nome, reentrada idempotente e herança de mesa órfã; sair (`leave_table`) migra o papel de criador **na mesma transação** (RN-008) — nada disso é seguro como UPDATE direto do cliente. |

### `items`
| Policy | Regra | Justificativa |
|--------|-------|---------------|
| `items_select` | `is_participant` | Consumo é visível a toda a mesa. |
| `items_insert/update/delete` | `is_active_participant` | RN-006: qualquer participante **ativo** mantém itens (modelo colaborativo da FASE 00); quem saiu não edita mais (RN-010). O trigger `assert_open` garante a janela (`ABERTA`), inclusive contra o congelamento do fechamento (RN-033). |

### `assignments` / `assignment_members`
Idênticas às de `items` e pela mesma razão: distribuição é a atividade colaborativa central. O `table_id` desnormalizado que a policy avalia é **imposto por trigger** a partir do item/atribuição — o cliente não consegue apontar para outra mesa. As invariantes de consistência (I-I2, membros, refinamento) são constraint triggers diferidos, não policies: são regras de *validade*, não de *acesso*.

### `payments`
| Policy | Regra | Justificativa |
|--------|-------|---------------|
| `payments_select` | `is_participant` | Transparência do acerto: todos veem quem já pagou (F8). |
| `payments_update` | `can_update_payment(id)` = devedor ou recebedor | RN-051: são os únicos papéis que agem sobre um pagamento. O trigger restringe ao par exato (devedor marca `INFORMADO`/`PAGO` no modo C; recebedor confirma/rejeita), garante mesa `FECHADA` (RN-052) e imutabilidade do valor. |
| *(sem insert/delete)* | — | Pagamentos nascem exclusivamente dentro da transação `close_table` (I-G1) e nunca são apagados. |

## Funções e o RLS

- **`SECURITY DEFINER`** (`create_table`, `join_table`, `leave_table`, `update_table_config`, `start_closing`, `cancel_closing`, `close_table`, `get_table_by_code`, helpers `is_*`): executam como dono e **ignoram RLS de propósito** — cada uma valida autorização explicitamente (`assert_owner`, vínculo `auth.uid()`), tem `search_path` fixo e `EXECUTE` revogado de `public`/`anon` (concedido só a `authenticated`).
- **`SECURITY INVOKER`** (`upsert_assignment`): roda **sob o RLS do chamador** — é só conveniência de atomicidade, sem privilégio extra.
- Helpers `private.*` vivem em schema não exposto pelo PostgREST; `authenticated` tem `EXECUTE` apenas nos usados por policies/triggers.

## Realtime

`postgres_changes` respeita RLS: cada cliente recebe apenas mudanças de linhas que a policy `select` da tabela lhe permitiria ler — ou seja, apenas das mesas onde é participante. Nenhuma configuração extra de canal é necessária para isolamento entre mesas.

## Riscos aceitos (registrados)

1. **Qualquer pessoa com o código entra na mesa aberta** (FA-92) — é o modelo de confiança do produto (mesa física). Mitigação: código de 32⁶ ≈ 1,07 bi de combinações, sem enumeração via API (`get_table_by_code` exige o código exato).
2. **Participante ativo pode editar itens de outros** — decisão da FASE 00 (mesa colaborativa); o realtime torna qualquer edição visível de imediato.
3. **`get_table_by_code` é oráculo de existência de código** — expõe metadados mínimos por design (tela de entrada, FA-04).
