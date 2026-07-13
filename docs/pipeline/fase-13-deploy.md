# FASE 13 — Deploy

## Contexto

FASES 00–12 aprovadas. O produto está pronto e polido. Falta colocá-lo em produção com observabilidade.

## Objetivo

Configurar produção de ponta a ponta e documentar a operação.

## Fluxo

```
Supabase
   ↓
Vercel
   ↓
Domínio
   ↓
Analytics
   ↓
Sentry
   ↓
Logs
   ↓
Monitoramento
```

## Entregáveis

1. **Supabase (produção)** — projeto de produção com todas as migrations aplicadas, RLS verificado e backups habilitados; ambientes de dev/prod separados.
2. **Vercel** — deploy do app com variáveis de ambiente configuradas, preview deployments por branch e produção a partir da branch principal.
3. **Domínio** — domínio configurado com HTTPS.
4. **Analytics** — analytics respeitando privacidade, com eventos-chave (mesa criada, mesa fechada, PIX copiado).
5. **Sentry** — captura de erros de front-end e back-end, com source maps e release tracking.
6. **Logs** — logs estruturados conforme estratégia da FASE 01, acessíveis em produção, sem dados sensíveis.
7. **Monitoramento** — uptime/healthcheck e alertas para erro em massa e indisponibilidade.

Documentação em `docs/operacao/`: runbook de deploy, rollback, gestão de segredos e resposta a incidentes.

## Fora do escopo

- Funcionalidades novas ou refactors.
- Infra além do stack decidido na FASE 01 (sem Kubernetes, sem multi-cloud).

## Critérios de aceite

- [ ] Produto acessível no domínio final, com HTTPS, servido pela Vercel.
- [ ] Fluxo completo (criar mesa → distribuir → fechar → PIX) validado em produção.
- [ ] Erro forçado de teste aparece no Sentry; evento de teste aparece no analytics.
- [ ] Nenhum segredo commitado no repositório (verificado).
- [ ] Runbook de deploy e rollback documentado e testado.

## Dependências

- FASES 00–12 aprovadas.
