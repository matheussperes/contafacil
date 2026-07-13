# Estratégia de Logs — ContaFácil

## Formato e níveis

- **Logs estruturados** (objetos, não frases): `{ level, msg, tableId?, participantId?, code?, ...ctx }`, serializados em JSON fora do dev.
- Níveis: `debug` (só dev), `info` (marcos), `warn` (anomalia recuperada), `error` (falha com impacto).
- Logger único em `infrastructure/logging`, atrás de port (`Logger`) — `console.*` direto fora dele é lint error. Em dev: console legível; em produção: breadcrumbs + eventos Sentry (FASE 13).

## O que logar (pontos obrigatórios)

| Evento | Nível | Contexto |
|--------|-------|----------|
| Transição de estado da mesa (criada, FECHANDO, FECHADA, reversão) | `info` | tableId, from→to, participantId |
| Passos do fechamento (validação, cálculo, RPC, resultado) | `info` / `error` | tableId, nº pagamentos, duração |
| Migração de papel de criador (RN-008) | `info` | tableId, de → para |
| Reconexão realtime (queda, retomada, refetch) | `warn` | tableId, downtime |
| Evento realtime descartado por versão (FA-91) | `debug` | tabela, versões |
| Falha de parser NFC-e (FA-08/09) | `warn` | etapa, UF, motivo — **nunca a URL completa da nota** |
| Erro de RLS inesperado | `error` | operação, code |
| Asserções violadas (`CONSERVACAO_VIOLADA`…) | `error` | contexto completo + correlationId |

## O que **nunca** logar

- **Chaves PIX** (do recebedor ou do estabelecimento) — dado sensível nº 1 do produto.
- Payload BR Code completo (contém a chave).
- URL completa da NFC-e (identifica a nota fiscal; logar apenas UF + etapa da falha).
- Tokens/JWT da sessão anônima.
- Valores monetários associados a nomes em nível < `error` (minimização: em `info`, valores agregados sem pessoa).

Enforcement: o logger tem **redação automática** — campos nomeados `pixKey`, `brCode`, `accessToken` (e padrões de chave PIX no texto) são mascarados antes de sair do processo. Testado.

## Correlação

- `correlationId` gerado por operação de usuário (uma ação → um id) e propagado a todos os logs da operação, inclusive o RPC de fechamento (parâmetro registrado na função SQL).
- `tableId` presente em todo log de contexto de mesa — é a chave de investigação padrão ("o que houve na mesa X?").

## Ciclo de vida

- Dev: `debug`+, console.
- Produção (FASE 13): `info`+ para Sentry breadcrumbs; `warn`+ viram eventos; retenção e dashboards definidos lá.
- Logs não são analytics: métricas de produto (mesa criada, PIX copiado) são eventos de analytics (FASE 13), com pipeline separado.
