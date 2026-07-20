# Runbook — Resposta a incidentes

## Observabilidade

- **Sentry** — erros de front e back, com release tracking. Alerta em pico
  de erros.
- **Analytics** — eventos de produto (`mesa_criada`, `mesa_entrou`,
  `mesa_fechada`, `pix_copiado`, `nfce_importada`). Sem valores por pessoa.
- **Logs** — estruturados, `info+` em produção (estrategia-logs.md);
  chave de investigação padrão: `tableId` / `correlationId`.
- **Healthcheck/uptime** — monitor externo batendo em `/` e alertando em
  indisponibilidade.

## Playbooks

### Pico de erros no Sentry
1. Identificar o `code` predominante (taxonomia da FASE 01).
2. `CONSERVACAO_VIOLADA` ou `TRANSICAO_INVALIDA` em massa = **bug de
   domínio**: são asserções, não fluxo. Rollback do app (runbook) e
   investigar com o `correlationId`.
3. `RLS_DENIED` em massa = policy quebrada por migration recente: revisar
   a última migration; corrigir com nova migration.

### Mesas presas em FECHANDO
- Sintoma: usuários relatam mesa "fechando" que não fecha.
- Verificar se o job `revert_stale_closing` (pg_cron) está ativo
  (`select * from cron.job;`). Se não, reagendar (runbook de deploy).
- Reversão manual pontual: `select private.revert_stale_closing();`.

### Realtime não propaga
- Confirmar publicação `supabase_realtime` e Realtime Authorization no
  painel. O cliente ressincroniza sozinho ao reconectar (FA-90); orientar
  recarregar em último caso.

### Indisponibilidade do Supabase
- Checar status.supabase.com. O app degrada para leitura do cache
  (estrategia-offline.md); escritas falham com mensagem clara. Sem ação de
  código — aguardar restabelecimento e comunicar.

## Comunicação

Registrar início, impacto, ações e resolução. Incidentes com dados
sensíveis (chave PIX) exigem verificação extra de que nada vazou em logs
(a redação é automática, mas confirmar).
