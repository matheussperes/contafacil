-- FASE 02 — Row Level Security
-- Modelo (ADR-003/006): leitura restrita a participantes da mesa;
-- escrita direta apenas onde é segura (itens/distribuição, por
-- participante ATIVO); todo o resto passa por função SECURITY DEFINER.
-- Justificativa policy a policy em docs/banco/policies.md.

alter table public.tables enable row level security;
alter table public.participants enable row level security;
alter table public.items enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_members enable row level security;
alter table public.payments enable row level security;

-- ═══ tables ═════════════════════════════════════════════════════════
-- Leitura: só participantes (a descoberta pública é get_table_by_code,
-- que expõe campos mínimos). Sem policies de escrita: criação e
-- transições só via funções.
create policy tables_select on public.tables
  for select to authenticated
  using (private.is_participant(id));

-- ═══ participants ═══════════════════════════════════════════════════
-- Leitura: participantes da mesa. Escrita só via join_table/leave_table.
create policy participants_select on public.participants
  for select to authenticated
  using (private.is_participant(table_id));

-- ═══ items ══════════════════════════════════════════════════════════
-- RN-006: participante ATIVO cria/edita/remove com a mesa ABERTA
-- (o trigger assert_open garante a janela; a policy garante o quem).
create policy items_select on public.items
  for select to authenticated
  using (private.is_participant(table_id));

create policy items_insert on public.items
  for insert to authenticated
  with check (private.is_active_participant(table_id));

create policy items_update on public.items
  for update to authenticated
  using (private.is_active_participant(table_id))
  with check (private.is_active_participant(table_id));

create policy items_delete on public.items
  for delete to authenticated
  using (private.is_active_participant(table_id));

-- ═══ assignments ════════════════════════════════════════════════════
create policy assignments_select on public.assignments
  for select to authenticated
  using (private.is_participant(table_id));

create policy assignments_insert on public.assignments
  for insert to authenticated
  with check (private.is_active_participant(table_id));

create policy assignments_update on public.assignments
  for update to authenticated
  using (private.is_active_participant(table_id))
  with check (private.is_active_participant(table_id));

create policy assignments_delete on public.assignments
  for delete to authenticated
  using (private.is_active_participant(table_id));

-- Nota: o INSERT chega com table_id placeholder e o trigger BEFORE o
-- substitui pelo table_id real do item ANTES da checagem de RLS
-- (with check roda sobre a linha final) — a policy avalia o valor real.

-- ═══ assignment_members ═════════════════════════════════════════════
create policy assignment_members_select on public.assignment_members
  for select to authenticated
  using (private.is_participant(table_id));

create policy assignment_members_insert on public.assignment_members
  for insert to authenticated
  with check (private.is_active_participant(table_id));

create policy assignment_members_update on public.assignment_members
  for update to authenticated
  using (private.is_active_participant(table_id))
  with check (private.is_active_participant(table_id));

create policy assignment_members_delete on public.assignment_members
  for delete to authenticated
  using (private.is_active_participant(table_id));

-- ═══ payments ═══════════════════════════════════════════════════════
-- Leitura: participantes (inclusive quem saiu — verá sua dívida).
-- Update: devedor ou recebedor; transição exata validada pelo trigger
-- (RN-051/052). Insert/delete: nunca via API (só close_table, definer).
create policy payments_select on public.payments
  for select to authenticated
  using (private.is_participant(table_id));

create policy payments_update on public.payments
  for update to authenticated
  using (private.can_update_payment(id))
  with check (private.can_update_payment(id));

-- ═══ Grants de tabela ═══════════════════════════════════════════════
-- RLS filtra linhas; grants definem verbos. anon não acessa nada:
-- toda sessão do app é authenticated (anonymous sign-in, ADR-006).
revoke all on all tables in schema public from public, anon;

grant select on public.tables,
                public.participants,
                public.items,
                public.assignments,
                public.assignment_members,
                public.payments
  to authenticated;

grant insert, update, delete on public.items,
                                public.assignments,
                                public.assignment_members
  to authenticated;

grant update on public.payments to authenticated;
