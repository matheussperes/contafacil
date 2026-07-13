-- FASE 02 — Funções SQL
-- Helpers de autorização (usados pelas policies) e API de operações que
-- exigem atomicidade/contexto (ADR-003/007). Toda mutação de mesa e
-- participante passa por função; itens e distribuição usam RLS direto.
--
-- SECURITY DEFINER: executa como dono (postgres), ignora RLS — cada
-- função valida autorização explicitamente. search_path fixo vazio.

-- ═══ Helpers de autorização ═════════════════════════════════════════
create or replace function private.is_participant(p_table_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.participants p
    where p.table_id = p_table_id and p.auth_user_id = auth.uid()
  );
$$;

create or replace function private.is_active_participant(p_table_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.participants p
    where p.table_id = p_table_id
      and p.auth_user_id = auth.uid()
      and p.status = 'ATIVO'
  );
$$;

create or replace function private.can_update_payment(p_payment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- devedor ou recebedor; a transição exata é validada pelo trigger
  select auth.uid() is not null and exists (
    select 1
      from public.payments pay
      join public.tables t on t.id = pay.table_id
      left join public.participants debtor on debtor.id = pay.participant_id
      left join public.participants payee on payee.id = t.payee_participant_id
     where pay.id = p_payment_id
       and (debtor.auth_user_id = auth.uid() or payee.auth_user_id = auth.uid())
  );
$$;

-- Levanta NAO_AUTORIZADO se o chamador não for o CRIADOR ativo.
-- Contexto de serviço (auth.uid() null) passa — RLS já não se aplica a ele.
create or replace function private.assert_owner(p_table_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if not exists (
    select 1 from public.participants p
    where p.table_id = p_table_id
      and p.auth_user_id = auth.uid()
      and p.role = 'CRIADOR'
      and p.status = 'ATIVO'
  ) then
    raise exception 'NAO_AUTORIZADO';
  end if;
end;
$$;

-- ═══ Geração de código de entrada (RN-001) ══════════════════════════
-- Alfabeto sem 0/O/1/I: 32 símbolos, 6 posições ≈ 1,07 bi de códigos.
create or replace function private.generate_join_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
    substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ',
           1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 6);
$$;

-- ═══ API: criação e entrada (UC-01/UC-02) ═══════════════════════════
create or replace function public.create_table(
  p_creator_name text,
  p_settlement_mode public.settlement_mode,
  p_name text default null,
  p_service_fee_bp integer default 1000,
  p_payee_pix_key text default null,
  p_establishment_pix_key text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_table_id uuid;
  v_participant_id uuid;
  v_code text;
  v_attempts int := 0;
begin
  if v_uid is null then
    raise exception 'NAO_AUTENTICADO';
  end if;
  -- RN-003: modo A exige chave PIX na criação
  if p_settlement_mode = 'RECEBEDOR_FIXO' and p_payee_pix_key is null then
    raise exception 'CHAVE_PIX_OBRIGATORIA';
  end if;

  loop
    v_code := private.generate_join_code();
    begin
      insert into public.tables
        (join_code, name, settlement_mode, service_fee_bp,
         payee_pix_key, establishment_pix_key)
      values
        (v_code, nullif(btrim(coalesce(p_name, '')), ''), p_settlement_mode,
         p_service_fee_bp, p_payee_pix_key, p_establishment_pix_key)
      returning id into v_table_id;
      exit;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts >= 5 then
        raise exception 'CODIGO_INDISPONIVEL';
      end if;
    end;
  end loop;

  insert into public.participants (table_id, auth_user_id, name, role)
  values (v_table_id, v_uid, btrim(p_creator_name), 'CRIADOR')
  returning id into v_participant_id;

  -- Modo A: o criador é o recebedor (RN-002/003)
  if p_settlement_mode = 'RECEBEDOR_FIXO' then
    update public.tables
       set payee_participant_id = v_participant_id
     where id = v_table_id;
  end if;

  return jsonb_build_object(
    'table_id', v_table_id,
    'join_code', v_code,
    'participant_id', v_participant_id
  );
end;
$$;

-- Consulta pública limitada para a tela de entrada (FA-03/04):
-- não expõe itens nem valores — apenas o necessário para entrar.
create or replace function public.get_table_by_code(p_join_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'status', t.status,
    'participants_count',
      (select count(*) from public.participants p
        where p.table_id = t.id and p.status = 'ATIVO')
  )
  from public.tables t
  where t.join_code = upper(btrim(p_join_code));
$$;

create or replace function public.join_table(p_join_code text, p_name text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_table record;
  v_participant_id uuid;
  v_role public.participant_role := 'MEMBRO';
begin
  if v_uid is null then
    raise exception 'NAO_AUTENTICADO';
  end if;

  select id, status into v_table
    from public.tables
   where join_code = upper(btrim(p_join_code))
   for update;
  if not found then
    raise exception 'MESA_NAO_ENCONTRADA';
  end if;
  if v_table.status <> 'ABERTA' then
    raise exception 'MESA_NAO_ABERTA'; -- FA-04
  end if;

  -- reentrada do mesmo dispositivo é idempotente (ADR-006)
  select id into v_participant_id
    from public.participants
   where table_id = v_table.id and auth_user_id = v_uid and status = 'ATIVO';
  if found then
    return jsonb_build_object(
      'table_id', v_table.id, 'participant_id', v_participant_id,
      'rejoined', true
    );
  end if;

  -- FA-17: mesa sem ativos → quem entra vira criador
  if not exists (
    select 1 from public.participants
     where table_id = v_table.id and status = 'ATIVO'
  ) then
    v_role := 'CRIADOR';
  end if;

  begin
    insert into public.participants (table_id, auth_user_id, name, role)
    values (v_table.id, v_uid, btrim(p_name), v_role)
    returning id into v_participant_id;
  exception when unique_violation then
    raise exception 'NOME_DUPLICADO'; -- RN-007/FA-05
  end;

  return jsonb_build_object(
    'table_id', v_table.id, 'participant_id', v_participant_id,
    'rejoined', false
  );
end;
$$;

-- ═══ API: saída com migração de papel (UC-07, RN-008/009) ═══════════
create or replace function public.leave_table(p_table_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_me record;
  v_heir uuid;
begin
  if v_uid is null then
    raise exception 'NAO_AUTENTICADO';
  end if;

  select id, role into v_me
    from public.participants
   where table_id = p_table_id and auth_user_id = v_uid and status = 'ATIVO'
   for update;
  if not found then
    raise exception 'PARTICIPANTE_NAO_ENCONTRADO';
  end if;

  -- consumo permanece (RN-009); o trigger assert_open garante mesa ABERTA
  update public.participants
     set status = 'SAIU', left_at = now()
   where id = v_me.id;

  -- RN-008: papel migra ao ativo mais antigo, na mesma transação
  if v_me.role = 'CRIADOR' then
    select id into v_heir
      from public.participants
     where table_id = p_table_id and status = 'ATIVO'
     order by join_order
     limit 1
     for update;
    if v_heir is not null then
      update public.participants set role = 'CRIADOR' where id = v_heir;
    end if;
  end if;
end;
$$;

-- ═══ API: configuração da mesa (RN-002/004, só o criador) ═══════════
-- Parâmetro null = manter valor atual.
create or replace function public.update_table_config(
  p_table_id uuid,
  p_name text default null,
  p_settlement_mode public.settlement_mode default null,
  p_service_fee_bp integer default null,
  p_payee_pix_key text default null,
  p_establishment_pix_key text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform private.assert_owner(p_table_id);
  update public.tables
     set name = coalesce(nullif(btrim(coalesce(p_name, '')), ''), name),
         settlement_mode = coalesce(p_settlement_mode, settlement_mode),
         service_fee_bp = coalesce(p_service_fee_bp, service_fee_bp),
         payee_pix_key = coalesce(p_payee_pix_key, payee_pix_key),
         establishment_pix_key =
           coalesce(p_establishment_pix_key, establishment_pix_key)
   where id = p_table_id;
  if not found then
    raise exception 'MESA_NAO_ENCONTRADA';
  end if;
end;
$$;

-- ═══ API: distribuição atômica (UC-06) ══════════════════════════════
-- SECURITY INVOKER: RLS do chamador se aplica às escritas; as validações
-- diferidas rodam no commit desta transação única.
-- p_members: [{"participant_id": uuid, "quantity"?: num, "weight"?: int}]
create or replace function public.upsert_assignment(
  p_item_id uuid,
  p_mode public.assignment_mode,
  p_quantity numeric,
  p_members jsonb,
  p_assignment_id uuid default null
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_assignment_id is null then
    insert into public.assignments (table_id, item_id, mode, quantity)
    values ('00000000-0000-0000-0000-000000000000', p_item_id, p_mode, p_quantity)
    returning id into v_id; -- table_id real definido pelo trigger before_write
  else
    v_id := p_assignment_id;
    update public.assignments
       set mode = p_mode, quantity = p_quantity
     where id = v_id and item_id = p_item_id;
    if not found then
      raise exception 'DISTRIBUICAO_NAO_ENCONTRADA';
    end if;
    delete from public.assignment_members where assignment_id = v_id;
  end if;

  insert into public.assignment_members
    (assignment_id, table_id, participant_id, quantity, weight)
  select v_id,
         '00000000-0000-0000-0000-000000000000', -- definido pelo trigger
         (m ->> 'participant_id')::uuid,
         (m ->> 'quantity')::numeric,
         (m ->> 'weight')::integer
  from jsonb_array_elements(p_members) m;

  return v_id;
end;
$$;

-- ═══ API: fechamento (UC-08, ADR-007) ═══════════════════════════════
create or replace function public.start_closing(p_table_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_status public.table_status;
begin
  perform private.assert_owner(p_table_id);
  select status into v_status
    from public.tables where id = p_table_id for update;
  if not found then
    raise exception 'MESA_NAO_ENCONTRADA';
  end if;
  if v_status <> 'ABERTA' then
    raise exception 'TRANSICAO_INVALIDA';
  end if;
  -- RN-030: pré-condições
  if not exists (select 1 from public.items where table_id = p_table_id) then
    raise exception 'MESA_SEM_ITENS';
  end if;
  if not exists (
    select 1 from public.participants where table_id = p_table_id
  ) then
    raise exception 'MESA_SEM_PARTICIPANTES';
  end if;
  update public.tables set status = 'FECHANDO' where id = p_table_id;
end;
$$;

create or replace function public.cancel_closing(p_table_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_status public.table_status;
begin
  perform private.assert_owner(p_table_id);
  select status into v_status
    from public.tables where id = p_table_id for update;
  if v_status is distinct from 'FECHANDO' then
    raise exception 'TRANSICAO_INVALIDA';
  end if;
  update public.tables set status = 'ABERTA' where id = p_table_id;
end;
$$;

-- Fechamento atômico (RN-034/035/036). O cálculo por participante vem do
-- motor (domínio, FASE 03); aqui re-verificamos as SOMAS sobre os dados
-- do banco e persistimos tudo-ou-nada (ADR-007).
--
-- p_shares: [{"participant_id": uuid, "amount_cents": int}] — a parte de
-- TODO participante com consumo > 0, incluindo o recebedor (modos A/B).
-- Pagamentos são gerados para todos exceto o recebedor (A/B) ou para
-- todos (C). Taxa total: half-up sobre o subtotal (contrato com FASE 03):
--   fee = (subtotal * service_fee_bp + 5000) / 10000  [divisão inteira]
create or replace function public.close_table(
  p_table_id uuid,
  p_shares jsonb,
  p_payee_participant_id uuid default null,
  p_payee_pix_key text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_table record;
  v_payee uuid;
  v_subtotal bigint;
  v_fee bigint;
  v_total bigint;
  v_shares_sum bigint;
  v_invalid int;
begin
  perform private.assert_owner(p_table_id);

  select * into v_table from public.tables where id = p_table_id for update;
  if not found then
    raise exception 'MESA_NAO_ENCONTRADA';
  end if;
  if v_table.status <> 'FECHANDO' then
    raise exception 'TRANSICAO_INVALIDA';
  end if;

  -- Recebedor por modo (RN-003/035)
  if v_table.settlement_mode = 'RECEBEDOR_FIXO' then
    v_payee := v_table.payee_participant_id;
  elsif v_table.settlement_mode = 'RECEBEDOR_NO_FECHAMENTO' then
    if p_payee_participant_id is null or p_payee_pix_key is null then
      raise exception 'RECEBEDOR_OBRIGATORIO';
    end if;
    update public.tables
       set payee_participant_id = p_payee_participant_id,
           payee_pix_key = p_payee_pix_key
     where id = p_table_id;
    v_payee := p_payee_participant_id;
  else
    v_payee := null; -- PAGAMENTO_DIRETO
  end if;

  -- Totais sobre os dados do banco (não confia no cliente)
  select coalesce(sum(total_cents), 0) into v_subtotal
    from public.items where table_id = p_table_id;
  if v_subtotal < 1 then
    raise exception 'MESA_SEM_CONSUMO';
  end if;
  v_fee := (v_subtotal * v_table.service_fee_bp + 5000) / 10000;
  v_total := v_subtotal + v_fee;

  -- RN-036: conservação — Σ partes = total da mesa
  select coalesce(sum((s ->> 'amount_cents')::bigint), 0)
    into v_shares_sum
    from jsonb_array_elements(p_shares) s;
  if v_shares_sum <> v_total then
    raise exception 'CONSERVACAO_VIOLADA';
  end if;

  -- partes referenciam participantes da mesa, sem duplicatas
  select count(*) into v_invalid
    from jsonb_array_elements(p_shares) s
    left join public.participants p
      on p.id = (s ->> 'participant_id')::uuid and p.table_id = p_table_id
   where p.id is null;
  if v_invalid > 0 then
    raise exception 'PARTICIPANTE_INVALIDO';
  end if;

  -- Pagamentos: todos exceto o recebedor (A/B) ou todos (C) — RN-035.
  -- unique(table_id, participant_id) barra duplicatas no p_shares.
  insert into public.payments (table_id, participant_id, amount_cents)
  select p_table_id,
         (s ->> 'participant_id')::uuid,
         (s ->> 'amount_cents')::bigint
    from jsonb_array_elements(p_shares) s
   where (s ->> 'amount_cents')::bigint >= 1
     and (v_payee is null or (s ->> 'participant_id')::uuid <> v_payee);

  update public.tables set status = 'FECHADA' where id = p_table_id;
end;
$$;

-- Rede de segurança: mesas presas em FECHANDO voltam a ABERTA (FA-21).
-- Produção: agendada via pg_cron (FASE 13); também pode ser chamada
-- por job da aplicação.
create or replace function private.revert_stale_closing()
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.tables
     set status = 'ABERTA'
   where status = 'FECHANDO'
     and closing_started_at < now() - interval '2 minutes';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ═══ Grants ═════════════════════════════════════════════════════════
-- SECURITY DEFINER nasce executável por PUBLIC — revogar e conceder
-- apenas a authenticated (anônimo autenticado incluso, ADR-006).
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon, authenticated;

grant execute on function public.create_table to authenticated;
grant execute on function public.get_table_by_code to authenticated;
grant execute on function public.join_table to authenticated;
grant execute on function public.leave_table to authenticated;
grant execute on function public.update_table_config to authenticated;
grant execute on function public.upsert_assignment to authenticated;
grant execute on function public.start_closing to authenticated;
grant execute on function public.cancel_closing to authenticated;
grant execute on function public.close_table to authenticated;

-- Helpers usados nas expressões de policy precisam de execute
-- (o schema private não é exposto pelo PostgREST).
grant usage on schema private to authenticated;
grant execute on function private.is_participant to authenticated;
grant execute on function private.is_active_participant to authenticated;
grant execute on function private.can_update_payment to authenticated;

-- Os triggers diferidos de distribuição chamam esta validação no commit
-- da transação do usuário — o papel precisa poder executá-la.
grant execute on function private.validate_assignment to authenticated;
