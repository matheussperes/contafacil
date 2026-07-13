-- FASE 02 — Suíte de testes do banco (RLS + comportamento)
-- Roda via tests/run-local.sh (Postgres local) ou contra o Supabase
-- local (supabase db reset && psql ... -f este arquivo).
-- Cada policy tem caso "permite" e caso "nega" (ADR-010).

\set ON_ERROR_STOP on

-- ═══ Infra de teste ═════════════════════════════════════════════════
create schema tests;

create table tests.ctx (k text primary key, v text);

create function tests.get(p_k text) returns text
language sql stable as $$ select v from tests.ctx where k = p_k $$;

create function tests.login(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
                     jsonb_build_object('sub', p_uid)::text, true);
end;
$$;

create function tests.assert(p_cond boolean, p_msg text) returns void
language plpgsql as $$
begin
  if p_cond is distinct from true then
    raise exception 'FALHOU: %', p_msg;
  end if;
end;
$$;

create function tests.expect_error(p_sql text, p_expected text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm like '%' || p_expected || '%' then
      return;
    end if;
    raise exception 'FALHOU: erro % (esperava %)', sqlerrm, p_expected;
  end;
  raise exception 'FALHOU: esperava erro % mas passou: %', p_expected, p_sql;
end;
$$;

grant usage on schema tests to authenticated;
grant select, insert, update on tests.ctx to authenticated;
grant execute on all functions in schema tests to authenticated;

insert into auth.users (id, email) values
  ('90000000-0000-4000-8000-000000000001', 't-ana@example.com'),
  ('90000000-0000-4000-8000-000000000002', 't-bruno@example.com'),
  ('90000000-0000-4000-8000-000000000003', 't-caio@example.com'),
  ('90000000-0000-4000-8000-000000000009', 't-intruso@example.com');

-- ═══ T01 — RN-003: modo A sem chave PIX é rejeitado ═════════════════
\echo 'T01: modo A exige chave PIX (CA-003a)'
begin;
set local role authenticated;
select tests.login('90000000-0000-4000-8000-000000000001');
select tests.expect_error(
  $$select public.create_table('Ana', 'RECEBEDOR_FIXO')$$,
  'CHAVE_PIX_OBRIGATORIA');
rollback;

-- ═══ T02 — RN-001/002: criação, formato do código, papel ════════════
\echo 'T02: criação da mesa (CA-001)'
begin;
set local role authenticated;
select tests.login('90000000-0000-4000-8000-000000000001');
do $$
declare r jsonb;
begin
  r := public.create_table('Ana', 'RECEBEDOR_NO_FECHAMENTO', 'Mesa de teste');
  perform tests.assert((r ->> 'join_code') ~ '^[2-9A-HJ-NP-Z]{6}$',
                       'formato do join_code');
  insert into tests.ctx values
    ('table_id', r ->> 'table_id'),
    ('code', r ->> 'join_code'),
    ('ana', r ->> 'participant_id');
  perform tests.assert(
    (select role from public.participants
      where id = (r ->> 'participant_id')::uuid) = 'CRIADOR',
    'criador com papel CRIADOR');
end;
$$;
commit;

-- ═══ T03 — RN-007/FA-03/FA-05: entrada, nome duplicado ══════════════
\echo 'T03: entrada na mesa (CA-007)'
begin;
set local role authenticated;
select tests.login('90000000-0000-4000-8000-000000000002');
do $$
declare r jsonb;
begin
  r := public.join_table(tests.get('code'), 'Bruno');
  insert into tests.ctx values ('bruno', r ->> 'participant_id');
end;
$$;
commit;

begin;
set local role authenticated;
select tests.login('90000000-0000-4000-8000-000000000003');
select tests.expect_error(
  $$select public.join_table(tests.get('code'), '  bruno ')$$,
  'NOME_DUPLICADO');
select tests.expect_error(
  $$select public.join_table('ZZZZZZ', 'Zeca')$$,
  'MESA_NAO_ENCONTRADA');
do $$
declare r jsonb;
begin
  r := public.join_table(tests.get('code'), 'Caio');
  insert into tests.ctx values ('caio', r ->> 'participant_id');
end;
$$;
commit;

-- ═══ T04 — RLS: quem não é participante não vê nada ═════════════════
\echo 'T04: isolamento por RLS (nega)'
begin;
set local role authenticated;
select tests.login('90000000-0000-4000-8000-000000000009');
do $$
begin
  perform tests.assert((select count(*) from public.tables) = 0,
                       'RLS de tables vazou');
  perform tests.assert((select count(*) from public.participants) = 0,
                       'RLS de participants vazou');
  perform tests.assert((select count(*) from public.items) = 0,
                       'RLS de items vazou');
  perform tests.assert((select count(*) from public.payments) = 0,
                       'RLS de payments vazou');
end;
$$;
rollback;

-- ═══ T05 — RN-020: item com total calculado; inválido rejeitado ═════
\echo 'T05: itens (CA-020)'
begin;
set local role authenticated;
select tests.login('90000000-0000-4000-8000-000000000002');
do $$
declare v_id uuid; v_total bigint;
begin
  insert into public.items (table_id, description, quantity, unit_price_cents, created_by)
  values (tests.get('table_id')::uuid, 'Chopp 500ml', 4, 1590,
          tests.get('bruno')::uuid)
  returning id, total_cents into v_id, v_total;
  perform tests.assert(v_total = 6360, 'total = quantidade × unitário');
  insert into tests.ctx values ('item1', v_id::text);
end;
$$;
select tests.expect_error(
  $$insert into public.items (table_id, description, quantity, unit_price_cents)
    values (tests.get('table_id')::uuid, 'Inválido', 0, 100)$$,
  'items_quantity_positiva');
commit;

-- ═══ T06 — RN-022/024 + I-I2: distribuição e teto de quantidade ═════
\echo 'T06: distribuição (CA-022) e QUANTIDADE_EXCEDIDA (FA-14)'
begin;
set local role authenticated;
select tests.login('90000000-0000-4000-8000-000000000002');
select public.upsert_assignment(
  tests.get('item1')::uuid, 'TODOS', 4,
  jsonb_build_array(
    jsonb_build_object('participant_id', tests.get('ana'), 'weight', 1),
    jsonb_build_object('participant_id', tests.get('bruno'), 'weight', 1),
    jsonb_build_object('participant_id', tests.get('caio'), 'weight', 1)));
set constraints all immediate;
commit;

begin;
set local role authenticated;
select tests.login('90000000-0000-4000-8000-000000000002');
select tests.expect_error(
  $$
  do $x$
  begin
    perform public.upsert_assignment(
      tests.get('item1')::uuid, 'PESSOA', 1,
      jsonb_build_array(
        jsonb_build_object('participant_id', tests.get('caio'), 'quantity', 1)));
    execute 'set constraints all immediate';
  end
  $x$
  $$,
  'QUANTIDADE_EXCEDIDA');
rollback;

-- ═══ T07 — RN-008/009: saída do criador migra o papel ═══════════════
\echo 'T07: saída preserva consumo e migra papel (CA-008/009)'
begin;
set local role authenticated;
select tests.login('90000000-0000-4000-8000-000000000001');
select public.leave_table(tests.get('table_id')::uuid);
do $$
begin
  perform tests.assert(
    (select status from public.participants
      where id = tests.get('ana')::uuid) = 'SAIU', 'Ana saiu');
  perform tests.assert(
    (select role from public.participants
      where id = tests.get('bruno')::uuid) = 'CRIADOR',
    'papel migrou para o ativo mais antigo');
  perform tests.assert(
    (select count(*) from public.assignment_members
      where participant_id = tests.get('ana')::uuid) = 1,
    'consumo de quem saiu permanece');
end;
$$;
commit;

-- RN-010: quem saiu não recebe novas distribuições
begin;
set local role authenticated;
select tests.login('90000000-0000-4000-8000-000000000002');
do $$
declare v_id uuid;
begin
  insert into public.items (table_id, description, quantity, unit_price_cents)
  values (tests.get('table_id')::uuid, 'Água', 1, 600)
  returning id into v_id;
  insert into tests.ctx values ('item2', v_id::text);
end;
$$;
select tests.expect_error(
  $$select public.upsert_assignment(
      tests.get('item2')::uuid, 'PESSOA', 1,
      jsonb_build_array(
        jsonb_build_object('participant_id', tests.get('ana'), 'quantity', 1)))$$,
  'PARTICIPANTE_INATIVO');
rollback;

-- ═══ T08 — Fechamento (RN-030..036) ═════════════════════════════════
\echo 'T08: fechamento — autorização, congelamento, conservação (CA-031/033/034/035a/036)'
-- partes corretas: subtotal 6360 + taxa 636 = 6996 → 2332 cada (CA-041)
insert into tests.ctx values ('shares_ok', jsonb_build_array(
  jsonb_build_object('participant_id', tests.get('ana'), 'amount_cents', 2332),
  jsonb_build_object('participant_id', tests.get('bruno'), 'amount_cents', 2332),
  jsonb_build_object('participant_id', tests.get('caio'), 'amount_cents', 2332))::text);
insert into tests.ctx values ('shares_bad', jsonb_build_array(
  jsonb_build_object('participant_id', tests.get('ana'), 'amount_cents', 2332),
  jsonb_build_object('participant_id', tests.get('bruno'), 'amount_cents', 2332),
  jsonb_build_object('participant_id', tests.get('caio'), 'amount_cents', 2331))::text);

begin;
set local role authenticated;
-- MEMBRO não fecha (RN-031)
select tests.login('90000000-0000-4000-8000-000000000003');
select tests.expect_error(
  $$select public.start_closing(tests.get('table_id')::uuid)$$,
  'NAO_AUTORIZADO');
-- criador fecha
select tests.login('90000000-0000-4000-8000-000000000002');
select public.start_closing(tests.get('table_id')::uuid);
do $$
begin
  perform tests.assert(
    (select status from public.tables
      where id = tests.get('table_id')::uuid) = 'FECHANDO', 'mesa FECHANDO');
end;
$$;
-- congelamento (RN-033/CA-006)
select tests.login('90000000-0000-4000-8000-000000000003');
select tests.expect_error(
  $$insert into public.items (table_id, description, quantity, unit_price_cents)
    values (tests.get('table_id')::uuid, 'Tarde demais', 1, 100)$$,
  'MESA_CONGELADA');
-- conservação e recebedor (RN-036/RN-003)
select tests.login('90000000-0000-4000-8000-000000000002');
select tests.expect_error(
  $$select public.close_table(tests.get('table_id')::uuid,
      tests.get('shares_bad')::jsonb,
      tests.get('bruno')::uuid, 'bruno@pix.example.com')$$,
  'CONSERVACAO_VIOLADA');
select tests.expect_error(
  $$select public.close_table(tests.get('table_id')::uuid,
      tests.get('shares_ok')::jsonb)$$,
  'RECEBEDOR_OBRIGATORIO');
-- fechamento correto
select public.close_table(tests.get('table_id')::uuid,
  tests.get('shares_ok')::jsonb,
  tests.get('bruno')::uuid, 'bruno@pix.example.com');
do $$
begin
  perform tests.assert(
    (select status from public.tables
      where id = tests.get('table_id')::uuid) = 'FECHADA', 'mesa FECHADA');
  perform tests.assert(
    (select count(*) from public.payments
      where table_id = tests.get('table_id')::uuid) = 2,
    'recebedor não gera pagamento para si (RN-035)');
  perform tests.assert(
    (select coalesce(sum(amount_cents), 0) from public.payments
      where table_id = tests.get('table_id')::uuid) = 4664,
    'soma dos pagamentos = total − parte do recebedor (RN-036)');
end;
$$;
commit;

-- ═══ T09 — Pagamentos (RN-051/052) ══════════════════════════════════
\echo 'T09: máquina do pagamento (CA-051a/052) e imutabilidade'
begin;
set local role authenticated;
-- devedor informa (permite)
select tests.login('90000000-0000-4000-8000-000000000003');
do $$
declare n int;
begin
  update public.payments set status = 'INFORMADO'
   where participant_id = tests.get('caio')::uuid;
  get diagnostics n = row_count;
  perform tests.assert(n = 1, 'devedor marca INFORMADO');
end;
$$;
-- devedor não confirma (nega)
select tests.expect_error(
  $$update public.payments set status = 'PAGO'
     where participant_id = tests.get('caio')::uuid$$,
  'NAO_AUTORIZADO');
-- terceiro não toca no pagamento alheio (RLS filtra → 0 linhas)
select tests.login('90000000-0000-4000-8000-000000000001');
do $$
declare n int;
begin
  update public.payments set status = 'PAGO'
   where participant_id = tests.get('caio')::uuid;
  get diagnostics n = row_count;
  perform tests.assert(n = 0, 'RLS de payments vazou para terceiro');
end;
$$;
-- recebedor confirma (permite)
select tests.login('90000000-0000-4000-8000-000000000002');
do $$
declare n int;
begin
  update public.payments set status = 'PAGO'
   where participant_id = tests.get('caio')::uuid;
  get diagnostics n = row_count;
  perform tests.assert(n = 1, 'recebedor confirma PAGO');
  perform tests.assert(
    (select confirmed_at from public.payments
      where participant_id = tests.get('caio')::uuid) is not null,
    'confirmed_at carimbado');
end;
$$;
-- valor é imutável
select tests.expect_error(
  $$update public.payments set amount_cents = 1
     where participant_id = tests.get('ana')::uuid$$,
  'CAMPO_IMUTAVEL');
-- mesa FECHADA não aceita itens (RN-005/CA-005)
select tests.expect_error(
  $$insert into public.items (table_id, description, quantity, unit_price_cents)
    values (tests.get('table_id')::uuid, 'Depois de fechar', 1, 100)$$,
  'MESA_NAO_ABERTA');
commit;

-- ═══ T10 — Cancelamento do fechamento e entrada bloqueada ═══════════
\echo 'T10: cancel_closing (RN-034) e entrada em mesa não ABERTA (FA-04)'
begin;
set local role authenticated;
select tests.login('90000000-0000-4000-8000-000000000001');
do $$
declare r jsonb;
begin
  r := public.create_table('Ana', 'PAGAMENTO_DIRETO', 'Mesa 2');
  insert into tests.ctx values
    ('t2', r ->> 'table_id'), ('code2', r ->> 'join_code');
  insert into public.items (table_id, description, quantity, unit_price_cents)
  values ((r ->> 'table_id')::uuid, 'Café', 1, 500);
end;
$$;
select public.start_closing(tests.get('t2')::uuid);
select tests.login('90000000-0000-4000-8000-000000000009');
select tests.expect_error(
  $$select public.join_table(tests.get('code2'), 'Zeca')$$,
  'MESA_NAO_ABERTA');
select tests.login('90000000-0000-4000-8000-000000000001');
select public.cancel_closing(tests.get('t2')::uuid);
do $$
begin
  perform tests.assert(
    (select status from public.tables
      where id = tests.get('t2')::uuid) = 'ABERTA',
    'cancelamento volta a ABERTA');
end;
$$;
rollback;

-- ═══ T11 — Views (sobre o seed) ═════════════════════════════════════
\echo 'T11: views de resumo e cobertura'
do $$
begin
  perform tests.assert(
    (select total_cents from public.v_table_summary
      where table_id = '20000000-0000-4000-8000-000000000001') = 11000,
    'v_table_summary: total do seed (10.000 + 10%)');
  perform tests.assert(
    (select is_fully_assigned from public.v_item_coverage
      where item_id = '12000000-0000-4000-8000-000000000005') = false,
    'v_item_coverage: água sem dono (RN-025)');
  perform tests.assert(
    (select table_settled from public.v_payment_overview
      where table_id = '20000000-0000-4000-8000-000000000001' limit 1) = false,
    'v_payment_overview: mesa do seed não quitada');
end;
$$;

\echo ''
\echo '═══ TODOS OS TESTES PASSARAM ═══'
