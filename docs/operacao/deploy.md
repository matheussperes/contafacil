# Runbook — Deploy

Ambientes: **dev** (Supabase local/projeto de dev + `next dev`), **preview**
(Vercel por branch), **produção** (Vercel na branch principal + projeto
Supabase de produção). Stack conforme FASE 01; sem infra além disso.

## Pré-requisitos (uma vez)

1. **Supabase produção**: criar projeto, anotar `Project URL` e `anon key`.
2. **Vercel**: importar o repositório; framework detectado como Next.js.
3. **Variáveis de ambiente** (Vercel → Settings → Environment Variables),
   em Production e Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SENTRY_DSN` (opcional)
   Nunca commitar valores — só o `.env.example` fica no repo.

## Aplicar o banco

```bash
supabase link --project-ref <ref-do-projeto>
supabase db push          # aplica supabase/migrations/ em produção
```

Verificar depois:
- **RLS ligado em todas as tabelas** (Supabase → Auth → Policies).
- **Anonymous sign-in habilitado** (Auth → Providers → Anonymous).
- **Realtime**: as 6 tabelas na publicação `supabase_realtime` (a
  migration `..._realtime.sql` já faz; confirmar no painel).
- **Backups** diários habilitados.

### Job de reversão de fechamento preso (pg_cron)

`private.revert_stale_closing()` reverte mesas presas em `FECHANDO`
(FA-21). Em produção, agendar com pg_cron (extensão do Supabase):

```sql
create extension if not exists pg_cron;
select cron.schedule(
  'revert-stale-closing', '* * * * *',
  $$ select private.revert_stale_closing(); $$
);
```

> Não está nas migrations de propósito: pg_cron não existe no Postgres
> local/CI e quebraria `db push`/a suíte. É passo de produção.

## Deploy do app

- **Produção**: merge na branch principal → Vercel builda e publica.
- **Preview**: cada PR ganha uma URL de preview automática.
- Build roda `next build`; o client Supabase é preguiçoso, então o build
  não requer conexão.

## Domínio

Vercel → Settings → Domains → adicionar domínio; HTTPS é automático.

## Smoke test pós-deploy

1. Criar mesa (modo B), obter o código.
2. Entrar por outro dispositivo/aba; ver o participante em tempo real.
3. Adicionar item, distribuir, ver o resumo bater.
4. Fechar a conta; conferir pagamentos gerados (Σ = total).
5. Abrir um pagamento: PIX copia-e-cola + QR; marcar pago.
6. Forçar um erro de teste → aparece no Sentry; evento `mesa_criada`
   aparece no analytics.
