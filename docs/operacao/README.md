# Operação — ContaFácil (FASE 13)

Configuração de produção e runbooks. Provisionamento real (criar projetos,
apontar domínio, ligar Sentry) exige credenciais e é executado por quem
tem acesso às contas — aqui está tudo o que o código e a automação
fornecem, mais os passos manuais documentados.

## O que está no repositório

- **`vercel.json`** — framework Next, região `gru1` (São Paulo), cabeçalhos
  de segurança (X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy com `camera=(self)` para o scanner) e cache correto de
  `sw.js`/manifest.
- **`.github/workflows/ci.yml`** — dois jobs:
  - `app`: `typecheck` + `lint` + `test` + `build`;
  - `database`: sobe Postgres 16, aplica shim + migrations + seed e roda a
    suíte SQL (`database.test.sql`). Mesma sequência validada localmente.
- **`.env.example`** — contrato das variáveis, sem valores.
- **`infrastructure/logging/analytics.ts`** — eventos de produto
  (no-op sem provider), sem valores por pessoa nem chave PIX.

## Runbooks

- [deploy.md](deploy.md) — Supabase + Vercel + domínio + smoke test; inclui
  o agendamento pg_cron de `revert_stale_closing` (passo de produção,
  fora das migrations).
- [rollback.md](rollback.md) — app (instantâneo) vs. banco (forward-only +
  backup).
- [segredos.md](segredos.md) — onde vivem, por que a anon key é pública, o
  que nunca pode vazar (service_role, chaves PIX).
- [incidentes.md](incidentes.md) — observabilidade e playbooks (pico de
  erros, mesas presas, realtime, indisponibilidade).

## Pendências que exigem credenciais/contas

Estas são as tarefas que **não** dá para executar sem acesso às contas —
todas com passo-a-passo nos runbooks:

1. Criar o projeto Supabase de produção e rodar `supabase db push`.
2. Habilitar Anonymous sign-in e conferir RLS/Realtime no painel.
3. Importar o repo na Vercel, definir as env vars e apontar o domínio.
4. Agendar `revert_stale_closing` via pg_cron.
5. Ligar Sentry (DSN) e o provider de analytics.
6. Rodar o smoke test pós-deploy e medir Lighthouse (meta ≥ 90).
