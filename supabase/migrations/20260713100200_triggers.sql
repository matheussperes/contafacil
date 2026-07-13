-- FASE 02 — Triggers de integridade
-- Invariantes dinâmicas do domínio: janela de edição (RN-006/033),
-- transições da mesa (I-M1), total do item (RN-020), consistência de
-- distribuição (I-I2, I-D1..D3) e máquina do pagamento (RN-051/052).
--
-- Convenção de erro: raise exception com message = código de domínio
-- (docs/arquitetura/estrategia-erros.md). A aplicação mapeia o código.

create schema if not exists private;

-- ═══ updated_at + version em toda escrita ═══════════════════════════
create or replace function private.touch_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger touch before update on public.tables
  for each row execute function private.touch_row();
create trigger touch before update on public.participants
  for each row execute function private.touch_row();
create trigger touch before update on public.items
  for each row execute function private.touch_row();
create trigger touch before update on public.assignments
  for each row execute function private.touch_row();
create trigger touch before update on public.assignment_members
  for each row execute function private.touch_row();
create trigger touch before update on public.payments
  for each row execute function private.touch_row();

-- ═══ Mesa: máquina de estados e janela de configuração ══════════════
create or replace function private.tables_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- imutáveis
  if new.join_code <> old.join_code or new.created_at <> old.created_at then
    raise exception 'CAMPO_IMUTAVEL';
  end if;

  if new.status <> old.status then
    -- I-M1: só ABERTA→FECHANDO, FECHANDO→FECHADA, FECHANDO→ABERTA
    if not (
      (old.status = 'ABERTA' and new.status = 'FECHANDO')
      or (old.status = 'FECHANDO' and new.status in ('FECHADA', 'ABERTA'))
    ) then
      raise exception 'TRANSICAO_INVALIDA';
    end if;
    if new.status = 'FECHANDO' then
      new.closing_started_at := now();
    elsif new.status = 'FECHADA' then
      new.closed_at := now();
    elsif new.status = 'ABERTA' then
      new.closing_started_at := null; -- reversão (RN-034/FA-21)
    end if;
  else
    if old.status = 'FECHADA' then
      raise exception 'MESA_NAO_ABERTA'; -- RN-005: FECHADA é somente leitura
    end if;
    -- RN-002/004: configuração só com mesa ABERTA
    if (new.name, new.settlement_mode, new.service_fee_bp,
        new.establishment_pix_key)
       is distinct from
       (old.name, old.settlement_mode, old.service_fee_bp,
        old.establishment_pix_key)
       and old.status <> 'ABERTA' then
      raise exception 'MESA_CONGELADA';
    end if;
    -- Recebedor: definível com mesa ABERTA (modo A) ou FECHANDO (modo B)
    if (new.payee_participant_id, new.payee_pix_key)
       is distinct from (old.payee_participant_id, old.payee_pix_key)
       and old.status not in ('ABERTA', 'FECHANDO') then
      raise exception 'MESA_NAO_ABERTA';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_transitions before update on public.tables
  for each row execute function private.tables_guard();

-- ═══ Janela de edição: mesa precisa estar ABERTA (RN-006/033) ═══════
create or replace function private.assert_table_open()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_table_id uuid;
  v_status public.table_status;
begin
  v_table_id := coalesce(new.table_id, old.table_id);
  select status into v_status from public.tables where id = v_table_id;
  if v_status = 'FECHANDO' then
    raise exception 'MESA_CONGELADA';
  elsif v_status <> 'ABERTA' then
    raise exception 'MESA_NAO_ABERTA';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger assert_open before insert or update or delete on public.items
  for each row execute function private.assert_table_open();
create trigger assert_open before insert or update or delete on public.assignments
  for each row execute function private.assert_table_open();
create trigger assert_open before insert or update or delete on public.assignment_members
  for each row execute function private.assert_table_open();
create trigger assert_open before insert or update on public.participants
  for each row execute function private.assert_table_open();

-- ═══ Item: total = quantidade × unitário (RN-020) ═══════════════════
create or replace function private.items_compute_total()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.total_cents := round(new.quantity * new.unit_price_cents)::bigint;
  -- created_by deve pertencer à mesma mesa
  if new.created_by is not null and not exists (
    select 1 from public.participants p
    where p.id = new.created_by and p.table_id = new.table_id
  ) then
    raise exception 'PARTICIPANTE_INVALIDO';
  end if;
  return new;
end;
$$;

create trigger compute_total before insert or update on public.items
  for each row execute function private.items_compute_total();

-- ═══ Distribuição: coerência estrutural imediata ════════════════════
-- table_id desnormalizado sempre coerente; membro precisa estar ATIVO
-- no momento da atribuição (I-D1 / RN-010).
create or replace function private.assignments_before()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_item_table uuid;
begin
  select table_id into v_item_table from public.items where id = new.item_id;
  if v_item_table is null then
    raise exception 'ITEM_NAO_ENCONTRADO';
  end if;
  new.table_id := v_item_table;
  return new;
end;
$$;

create trigger before_write before insert or update on public.assignments
  for each row execute function private.assignments_before();

create or replace function private.assignment_members_before()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_assignment_table uuid;
  v_participant record;
begin
  select table_id into v_assignment_table
    from public.assignments where id = new.assignment_id;
  if v_assignment_table is null then
    raise exception 'DISTRIBUICAO_NAO_ENCONTRADA';
  end if;
  new.table_id := v_assignment_table;

  select table_id, status into v_participant
    from public.participants where id = new.participant_id;
  if v_participant.table_id is distinct from v_assignment_table then
    raise exception 'PARTICIPANTE_INVALIDO';
  end if;
  if tg_op = 'INSERT' and v_participant.status <> 'ATIVO' then
    raise exception 'PARTICIPANTE_INATIVO'; -- I-D1: sem novas distribuições p/ quem saiu
  end if;
  return new;
end;
$$;

create trigger before_write before insert or update on public.assignment_members
  for each row execute function private.assignment_members_before();

-- ═══ Distribuição: validação diferida (fim da transação) ════════════
-- Uma distribuição é válida quando: tem membros; todos com o mesmo tipo
-- de refinamento; soma das quantidades dos membros = quantidade da
-- atribuição; PESSOA tem exatamente 1 membro; e a soma das atribuições
-- do item não excede a quantidade do item (I-I2).
create or replace function private.validate_assignment(p_assignment_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  a record;
  v_members int;
  v_with_qty int;
  v_with_weight int;
  v_member_qty numeric;
  v_item_qty numeric;
  v_covered numeric;
begin
  select * into a from public.assignments where id = p_assignment_id;
  if not found then
    return; -- atribuição removida na mesma transação
  end if;

  select count(*),
         count(*) filter (where quantity is not null),
         count(*) filter (where weight is not null),
         coalesce(sum(quantity), 0)
    into v_members, v_with_qty, v_with_weight, v_member_qty
    from public.assignment_members
   where assignment_id = p_assignment_id;

  if v_members = 0 then
    raise exception 'DISTRIBUICAO_SEM_MEMBROS';
  end if;
  if v_with_qty > 0 and v_with_weight > 0 then
    raise exception 'REFINAMENTO_MISTO';
  end if;
  if a.mode = 'PESSOA' and v_members <> 1 then
    raise exception 'DISTRIBUICAO_INVALIDA';
  end if;
  if v_with_qty > 0 and v_member_qty <> a.quantity then
    raise exception 'QUANTIDADE_INCONSISTENTE';
  end if;

  select i.quantity into v_item_qty from public.items i where i.id = a.item_id;
  select coalesce(sum(s.quantity), 0) into v_covered
    from public.assignments s where s.item_id = a.item_id;
  if v_covered > v_item_qty then
    raise exception 'QUANTIDADE_EXCEDIDA'; -- I-I2
  end if;
end;
$$;

create or replace function private.validate_assignment_tg()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.validate_assignment(coalesce(new.id, old.id));
  return null;
end;
$$;

create or replace function private.validate_assignment_member_tg()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.validate_assignment(coalesce(new.assignment_id, old.assignment_id));
  return null;
end;
$$;

create constraint trigger validate_deferred
  after insert or update on public.assignments
  deferrable initially deferred
  for each row execute function private.validate_assignment_tg();

create constraint trigger validate_deferred
  after insert or update or delete on public.assignment_members
  deferrable initially deferred
  for each row execute function private.validate_assignment_member_tg();

-- Redução da quantidade do item não pode ficar abaixo do já atribuído
create or replace function private.validate_item_coverage_tg()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_covered numeric;
begin
  select coalesce(sum(quantity), 0) into v_covered
    from public.assignments where item_id = new.id;
  if v_covered > new.quantity then
    raise exception 'QUANTIDADE_EXCEDIDA';
  end if;
  return null;
end;
$$;

create constraint trigger validate_coverage_deferred
  after update on public.items
  deferrable initially deferred
  for each row execute function private.validate_item_coverage_tg();

-- ═══ Pagamento: máquina de estados + autorização (RN-051/052) ═══════
-- Contexto de serviço (auth.uid() null — seed, jobs, close_table) valida
-- apenas a transição; contexto de usuário valida transição E papel.
create or replace function private.payments_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_table record;
  v_uid uuid;
  v_is_debtor boolean;
  v_is_payee boolean;
  v_direct boolean;
begin
  select t.status, t.settlement_mode, t.payee_participant_id
    into v_table
    from public.tables t
   where t.id = coalesce(new.table_id, old.table_id);

  if tg_op = 'DELETE' then
    -- pagamentos nunca são apagados individualmente; só via cascade
    -- da mesa (que a API não permite apagar)
    if v_table.status is not null then
      raise exception 'OPERACAO_INVALIDA';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    -- I-G1: pagamentos nascem na transação de fechamento
    if v_table.status <> 'FECHANDO' then
      raise exception 'TRANSICAO_INVALIDA';
    end if;
    if new.status <> 'PENDENTE' then
      raise exception 'TRANSICAO_INVALIDA';
    end if;
    if not exists (
      select 1 from public.participants p
      where p.id = new.participant_id and p.table_id = new.table_id
    ) then
      raise exception 'PARTICIPANTE_INVALIDO';
    end if;
    return new;
  end if;

  -- UPDATE: única escrita permitida pós-fechamento (RN-052)
  if v_table.status <> 'FECHADA' then
    raise exception 'MESA_NAO_ABERTA';
  end if;
  if (new.table_id, new.participant_id, new.amount_cents)
     is distinct from (old.table_id, old.participant_id, old.amount_cents) then
    raise exception 'CAMPO_IMUTAVEL';
  end if;
  if new.status = old.status then
    return new; -- toque sem transição (idempotente)
  end if;

  v_direct := v_table.settlement_mode = 'PAGAMENTO_DIRETO';

  -- máquina: A/B = PENDENTE→INFORMADO→PAGO (payee pode rejeitar);
  --          C   = PENDENTE→PAGO
  if v_direct then
    if not (old.status = 'PENDENTE' and new.status = 'PAGO') then
      raise exception 'TRANSICAO_INVALIDA';
    end if;
  else
    if not (
      (old.status = 'PENDENTE' and new.status = 'INFORMADO')
      or (old.status = 'INFORMADO' and new.status in ('PAGO', 'PENDENTE'))
    ) then
      raise exception 'TRANSICAO_INVALIDA';
    end if;
  end if;

  -- autorização por papel (RN-051)
  v_uid := auth.uid();
  if v_uid is not null then
    select exists (
      select 1 from public.participants p
      where p.id = old.participant_id and p.auth_user_id = v_uid
    ) into v_is_debtor;
    select exists (
      select 1 from public.participants p
      where p.id = v_table.payee_participant_id and p.auth_user_id = v_uid
    ) into v_is_payee;

    if v_direct then
      if not v_is_debtor then raise exception 'NAO_AUTORIZADO'; end if;
    elsif new.status = 'INFORMADO' then
      if not v_is_debtor then raise exception 'NAO_AUTORIZADO'; end if;
    else -- INFORMADO → PAGO ou INFORMADO → PENDENTE: só o recebedor
      if not v_is_payee then raise exception 'NAO_AUTORIZADO'; end if;
    end if;
  end if;

  -- carimbos
  if new.status = 'INFORMADO' then
    new.paid_declared_at := now();
  elsif new.status = 'PAGO' then
    new.paid_declared_at := coalesce(new.paid_declared_at, now());
    new.confirmed_at := now();
  elsif new.status = 'PENDENTE' then
    new.paid_declared_at := null;
    new.confirmed_at := null;
  end if;
  return new;
end;
$$;

create trigger guard before insert or update or delete on public.payments
  for each row execute function private.payments_guard();
