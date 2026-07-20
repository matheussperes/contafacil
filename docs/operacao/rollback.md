# Runbook — Rollback

## App (Vercel)

Deploy ruim em produção:

1. Vercel → Deployments → localizar o último deploy bom (verde).
2. **Promote to Production** (ou "Rollback" no menu do deploy).
3. Rollback do app é instantâneo e **não** afeta o banco.

Alternativa por git: reverter o commit na branch principal e deixar o
Vercel rebuildar.

## Banco (Supabase)

Migrations são **forward-only**. Nunca edite uma migration já aplicada.

- **Correção**: crie uma nova migration que desfaz/ajusta o que a anterior
  fez, e aplique com `supabase db push`.
- **Incidente com perda de dados**: restaurar do backup diário
  (Supabase → Database → Backups → Restore). Restaurar banco **reverte
  dados**; combine com o rollback do app para a versão compatível.

## Regra de ouro

Rollback de app é seguro e reversível; rollback de banco não. Antes de
qualquer migration destrutiva em produção, confirme que há backup recente
e que o app consegue rodar tanto no schema antigo quanto no novo durante a
janela de transição.
