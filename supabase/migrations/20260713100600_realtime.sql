-- FASE 02 — Publicação realtime
-- As 6 tabelas entram na publicação supabase_realtime: são a origem dos
-- 8 eventos do produto (docs/arquitetura/estrategia-realtime.md).
-- postgres_changes respeita RLS: cada cliente só recebe mudanças de
-- mesas onde é participante.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

alter publication supabase_realtime add table
  public.tables,
  public.participants,
  public.items,
  public.assignments,
  public.assignment_members,
  public.payments;
