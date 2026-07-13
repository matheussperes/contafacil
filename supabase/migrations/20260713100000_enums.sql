-- FASE 02 — ENUMs do domínio
-- Estados e modos espelham o vocabulário consolidado na FASE 00
-- (docs/produto/regras-de-dominio.md): idênticos em código e banco.

create type public.table_status as enum ('ABERTA', 'FECHANDO', 'FECHADA');

create type public.settlement_mode as enum (
  'RECEBEDOR_FIXO',          -- modo A: criador cadastra chave PIX na criação
  'RECEBEDOR_NO_FECHAMENTO', -- modo B: recebedor definido ao fechar
  'PAGAMENTO_DIRETO'         -- modo C: cada um paga o estabelecimento (PIX/cartão)
);

create type public.participant_status as enum ('ATIVO', 'SAIU');

create type public.participant_role as enum ('CRIADOR', 'MEMBRO');

create type public.item_source as enum ('MANUAL', 'NFCE');

create type public.assignment_mode as enum ('TODOS', 'PESSOA', 'GRUPO');

create type public.payment_status as enum ('PENDENTE', 'INFORMADO', 'PAGO');
