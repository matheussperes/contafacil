# Runbook — Gestão de segredos

## Onde os segredos vivem

| Segredo | Onde | Exposto ao browser? |
|---------|------|---------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel env | Sim (público por design) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel env | Sim (anon key é pública; a segurança é o RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **nunca no app** | Não — só em tarefas administrativas locais |
| `SENTRY_DSN` | Vercel env | Parcial (DSN de cliente é público) |

## Princípios

1. **Nada de segredo no repositório.** Só o `.env.example` (vazio) fica
   versionado. `.env`/`.env.local` estão no `.gitignore`.
2. **A anon key é pública** — e tudo bem: a autorização mora no RLS
   (ADR-003/006). O que **não** pode vazar é a `service_role` key, que
   ignora RLS; ela nunca entra no bundle do cliente nem em `NEXT_PUBLIC_*`.
3. **Chaves PIX** dos usuários são dado sensível de runtime, não segredo
   de deploy: nunca são logadas (redação automática, estrategia-logs.md).

## Rotação

- Supabase anon/service keys: painel do Supabase → Settings → API →
  "Reset". Atualizar a env na Vercel e redeployar.
- Após qualquer suspeita de vazamento da service key, rotacione
  imediatamente e audite acessos.

## Verificação

Antes de cada release, confirmar que `git grep` não encontra URLs de
projeto, chaves ou DSNs hardcoded fora de `.env.example`.
