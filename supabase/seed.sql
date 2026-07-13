-- FASE 02 — Seed de desenvolvimento
-- Dois cenários: mesa ABERTA no meio da noite (com item sem dono, RN-025)
-- e mesa FECHADA via close_table (com pagamento em andamento).
-- Transação única: as validações diferidas de distribuição rodam no commit.

begin;

-- ═══ Usuários anônimos (dispositivos) ═══════════════════════════════
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'dev-ana@example.com'),
  ('00000000-0000-4000-8000-000000000002', 'dev-bruno@example.com'),
  ('00000000-0000-4000-8000-000000000003', 'dev-caio@example.com'),
  ('00000000-0000-4000-8000-000000000004', 'dev-dani@example.com'),
  ('00000000-0000-4000-8000-000000000005', 'dev-marina@example.com'),
  ('00000000-0000-4000-8000-000000000006', 'dev-pedro@example.com')
on conflict (id) do nothing;

-- ═══ Mesa 1 — "Bar do Zé" (ABERTA, modo B, taxa 10%) ════════════════
insert into public.tables (id, join_code, name, settlement_mode, service_fee_bp)
values ('10000000-0000-4000-8000-000000000001', 'BARZE2', 'Bar do Zé — sexta',
        'RECEBEDOR_NO_FECHAMENTO', 1000);

insert into public.participants (id, table_id, auth_user_id, name, role) values
  ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000001', 'Ana', 'CRIADOR'),
  ('11000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000002', 'Bruno', 'MEMBRO'),
  ('11000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000003', 'Caio', 'MEMBRO'),
  ('11000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000004', 'Dani', 'MEMBRO');

-- Itens (total_cents calculado por trigger, RN-020)
insert into public.items (id, table_id, description, quantity, unit_price_cents, source, created_by, total_cents) values
  ('12000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   'Chopp 500ml', 4, 1590, 'MANUAL', '11000000-0000-4000-8000-000000000001', 1),
  ('12000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
   'Batata frita grande', 1, 3490, 'MANUAL', '11000000-0000-4000-8000-000000000002', 1),
  ('12000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
   'Pizza grande (8 fatias)', 8, 1200, 'NFCE', '11000000-0000-4000-8000-000000000001', 1),
  ('12000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001',
   'Refrigerante lata', 1, 800, 'MANUAL', '11000000-0000-4000-8000-000000000003', 1),
  ('12000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001',
   'Água com gás', 1, 600, 'MANUAL', '11000000-0000-4000-8000-000000000002', 1);
  -- (Água com gás fica SEM DONO de propósito — demo RN-025/032)

-- Chopp: TODOS (snapshot com Dani ainda ativa — RN-023), partes iguais
insert into public.assignments (id, item_id, mode, quantity, table_id) values
  ('13000000-0000-4000-8000-000000000001',
   '12000000-0000-4000-8000-000000000001', 'TODOS', 4,
   '10000000-0000-4000-8000-000000000001');
insert into public.assignment_members (assignment_id, participant_id, weight, table_id) values
  ('13000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 1, '10000000-0000-4000-8000-000000000001'),
  ('13000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', 1, '10000000-0000-4000-8000-000000000001'),
  ('13000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003', 1, '10000000-0000-4000-8000-000000000001'),
  ('13000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000004', 1, '10000000-0000-4000-8000-000000000001');

-- Batata: GRUPO {Ana, Bruno} em partes iguais
insert into public.assignments (id, item_id, mode, quantity, table_id) values
  ('13000000-0000-4000-8000-000000000002',
   '12000000-0000-4000-8000-000000000002', 'GRUPO', 1,
   '10000000-0000-4000-8000-000000000001');
insert into public.assignment_members (assignment_id, participant_id, weight, table_id) values
  ('13000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', 1, '10000000-0000-4000-8000-000000000001'),
  ('13000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 1, '10000000-0000-4000-8000-000000000001');

-- Pizza: por QUANTIDADE — Ana 3, Bruno 3, Caio 2 fatias (RN-024/CA-024)
insert into public.assignments (id, item_id, mode, quantity, table_id) values
  ('13000000-0000-4000-8000-000000000003',
   '12000000-0000-4000-8000-000000000003', 'GRUPO', 8,
   '10000000-0000-4000-8000-000000000001');
insert into public.assignment_members (assignment_id, participant_id, quantity, table_id) values
  ('13000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001', 3, '10000000-0000-4000-8000-000000000001'),
  ('13000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000002', 3, '10000000-0000-4000-8000-000000000001'),
  ('13000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000003', 2, '10000000-0000-4000-8000-000000000001');

-- Refrigerante: PESSOA (Caio)
insert into public.assignments (id, item_id, mode, quantity, table_id) values
  ('13000000-0000-4000-8000-000000000004',
   '12000000-0000-4000-8000-000000000004', 'PESSOA', 1,
   '10000000-0000-4000-8000-000000000001');
insert into public.assignment_members (assignment_id, participant_id, quantity, table_id) values
  ('13000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000003', 1, '10000000-0000-4000-8000-000000000001');

-- Dani foi embora depois das distribuições (RN-009/010: consumo permanece)
update public.participants
   set status = 'SAIU', left_at = now()
 where id = '11000000-0000-4000-8000-000000000004';

-- ═══ Mesa 2 — "Churrasco da firma" (FECHADA via close_table, modo A) ═
-- Subtotal 10.000 + taxa 10% (1.000) = total 11.000 centavos.
-- Partes: Marina 5.500 (recebedora) e Pedro 5.500 → 1 pagamento (RN-035).
insert into public.tables (id, join_code, name, settlement_mode, service_fee_bp, payee_pix_key)
values ('20000000-0000-4000-8000-000000000001', 'CHURAS', 'Churrasco da firma',
        'RECEBEDOR_FIXO', 1000, 'marina@pix.example.com');

insert into public.participants (id, table_id, auth_user_id, name, role) values
  ('21000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000005', 'Marina', 'CRIADOR'),
  ('21000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000006', 'Pedro', 'MEMBRO');

update public.tables
   set payee_participant_id = '21000000-0000-4000-8000-000000000001'
 where id = '20000000-0000-4000-8000-000000000001';

insert into public.items (id, table_id, description, quantity, unit_price_cents, created_by, total_cents) values
  ('22000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   'Espeto misto', 2, 3000, '21000000-0000-4000-8000-000000000001', 1),
  ('22000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
   'Cerveja lata', 4, 1000, '21000000-0000-4000-8000-000000000002', 1);

insert into public.assignments (id, item_id, mode, quantity, table_id) values
  ('23000000-0000-4000-8000-000000000001',
   '22000000-0000-4000-8000-000000000001', 'TODOS', 2,
   '20000000-0000-4000-8000-000000000001'),
  ('23000000-0000-4000-8000-000000000002',
   '22000000-0000-4000-8000-000000000002', 'TODOS', 4,
   '20000000-0000-4000-8000-000000000001');
insert into public.assignment_members (assignment_id, participant_id, weight, table_id) values
  ('23000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 1, '20000000-0000-4000-8000-000000000001'),
  ('23000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002', 1, '20000000-0000-4000-8000-000000000001'),
  ('23000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', 1, '20000000-0000-4000-8000-000000000001'),
  ('23000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', 1, '20000000-0000-4000-8000-000000000001');

-- Fechamento real: FECHANDO → close_table (valida conservação, RN-036)
update public.tables set status = 'FECHANDO'
 where id = '20000000-0000-4000-8000-000000000001';

select public.close_table(
  '20000000-0000-4000-8000-000000000001',
  '[{"participant_id": "21000000-0000-4000-8000-000000000001", "amount_cents": 5500},
    {"participant_id": "21000000-0000-4000-8000-000000000002", "amount_cents": 5500}]'::jsonb
);

-- Pedro já informou o pagamento (demo do ciclo A/B, RN-051)
update public.payments set status = 'INFORMADO'
 where table_id = '20000000-0000-4000-8000-000000000001'
   and participant_id = '21000000-0000-4000-8000-000000000002';

commit;
