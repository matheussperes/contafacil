# Estratégia de Erros — ContaFácil

Taxonomia, propagação e apresentação. Objetivo: todo erro tem **dono, código e destino** — nada de `catch` vazio nem stack trace na cara do usuário.

## Taxonomia

| Classe | Origem | Exemplos de código | Retry? |
|--------|--------|--------------------|--------|
| `DomainError` | regra de negócio violada (`src/domain`) | `MESA_NAO_ABERTA`, `MESA_CONGELADA`, `NOME_DUPLICADO`, `QUANTIDADE_EXCEDIDA`, `TRANSICAO_INVALIDA`, `CONSERVACAO_VIOLADA` | ❌ nunca — corrigir a ação |
| `ValidationError` | entrada malformada (`application/validators`) | `DESCRICAO_VAZIA`, `VALOR_INVALIDO`, `TAXA_FORA_DO_INTERVALO` | ❌ — corrigir o input |
| `InfrastructureError` | falha técnica (`infrastructure`) | `NETWORK_UNAVAILABLE`, `REALTIME_DISCONNECTED`, `NFCE_FETCH_FAILED`, `RLS_DENIED` | ✅ transitórios, com backoff |

Códigos de domínio em português SCREAMING_SNAKE (convenções) — são vocabulário do produto, aparecem em log e suporte. O catálogo completo nasce na FASE 03 (`domain/errors`) e cresce fase a fase; **código novo exige entrada no catálogo**.

## Regras de propagação

1. **Domínio lança, nunca trata.** Funções de domínio lançam `DomainError` tipado (ou retornam resultado válido). Sem try/catch dentro do domínio.
2. **Aplicação traduz.** Services capturam erros do banco (constraint, RLS) e os **mapeiam para o erro de domínio equivalente** — a UI nunca vê erro de Postgres. Ex.: unique violation em nome → `NOME_DUPLICADO`.
3. **Infra marca transitoriedade.** `InfrastructureError` carrega `retryable: boolean`; a camada de dados (Query/mutations) faz retry com backoff **apenas** nos retryable e idempotentes.
4. **UI apresenta, não decide.** Mapa código → mensagem pt-BR + severidade vive num módulo único da UI. Componentes exibem via padrões do design system:
   - `ValidationError` → erro no campo, inline;
   - `DomainError` → toast/dialog com ação clara ("a mesa está fechando — aguarde");
   - `InfrastructureError` → banner de conexão/estado de erro com retry.
5. **Fechamento tem tratamento próprio** (FA-21): qualquer erro exibe "nada foi alterado" + causa, mesa volta visivelmente a `ABERTA`.

## Erros que não podem acontecer (asserções)

`CONSERVACAO_VIOLADA` e `TRANSICAO_INVALIDA` sinalizam **bug**, não fluxo: são capturados no topo, logados como `error` com contexto completo, reportados (Sentry, FASE 13) e mostrados como falha genérica com id de correlação. Nunca têm "tratamento de negócio".

## Contrato com testes

- Toda RN que rejeita algo tem teste do **código de erro específico** (não só "lançou algo").
- Mapa UI de mensagens tem teste de completude: todo código do catálogo tem mensagem.
