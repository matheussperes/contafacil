-- FASE 02 — Views de leitura
-- security_invoker: o RLS de quem consulta se aplica às tabelas-base.
--
-- ATENÇÃO (ADR-007/008): valores por participante ANTES do fechamento
-- exigem o motor matemático (maior resto) e são calculados no domínio.
-- As views entregam apenas agregados exatos por soma inteira: subtotal,
-- taxa/total da mesa (fórmula contratual) e cobertura de distribuição.

-- Resumo da mesa: totais e progresso de distribuição
create view public.v_table_summary
  with (security_invoker = true)
as
select
  t.id as table_id,
  t.join_code,
  t.name,
  t.status,
  t.settlement_mode,
  t.service_fee_bp,
  (select count(*) from public.participants p
    where p.table_id = t.id and p.status = 'ATIVO') as active_participants,
  (select count(*) from public.participants p
    where p.table_id = t.id) as total_participants,
  (select count(*) from public.items i
    where i.table_id = t.id) as items_count,
  s.subtotal_cents,
  -- contrato com o motor (close_table): half-up em basis points.
  -- Aritmética estritamente em bigint: sum() devolve numeric e a divisão
  -- deixaria de ser inteira — o cast no lateral garante o contrato.
  (s.subtotal_cents * t.service_fee_bp + 5000) / 10000 as service_fee_cents,
  s.subtotal_cents
    + (s.subtotal_cents * t.service_fee_bp + 5000) / 10000 as total_cents,
  t.closed_at,
  t.created_at
from public.tables t
cross join lateral (
  select coalesce(sum(i.total_cents), 0)::bigint as subtotal_cents
    from public.items i
   where i.table_id = t.id
) s;

-- Cobertura por item: quanto de cada item já tem dono (RN-025/032)
create view public.v_item_coverage
  with (security_invoker = true)
as
select
  i.id as item_id,
  i.table_id,
  i.description,
  i.quantity,
  i.total_cents,
  coalesce(sum(a.quantity), 0) as covered_quantity,
  i.quantity - coalesce(sum(a.quantity), 0) as uncovered_quantity,
  coalesce(sum(a.quantity), 0) >= i.quantity as is_fully_assigned
from public.items i
left join public.assignments a on a.item_id = i.id
group by i.id;

-- Pagamentos com contexto: nome do devedor e estado agregado da mesa
create view public.v_payment_overview
  with (security_invoker = true)
as
select
  pay.id as payment_id,
  pay.table_id,
  pay.participant_id,
  p.name as participant_name,
  pay.amount_cents,
  pay.status,
  pay.paid_declared_at,
  pay.confirmed_at,
  t.settlement_mode,
  t.payee_participant_id,
  (t.payee_participant_id is not null
   and exists (
     select 1 from public.participants px
     where px.id = t.payee_participant_id
   )) as has_payee,
  not exists (
    select 1 from public.payments p2
    where p2.table_id = pay.table_id and p2.status <> 'PAGO'
  ) as table_settled
from public.payments pay
join public.participants p on p.id = pay.participant_id
join public.tables t on t.id = pay.table_id;

grant select on public.v_table_summary,
                public.v_item_coverage,
                public.v_payment_overview
  to authenticated;
