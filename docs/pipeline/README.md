# Pipeline de desenvolvimento — ContaFácil

O desenvolvimento é dividido em **14 fases independentes e verificáveis**. Nenhuma fase depende de código ainda não construído; cada uma consome apenas o que as fases anteriores já entregaram e aprovaram.

## Estrutura de cada documento de fase

Todos os documentos seguem o mesmo formato, para que cada fase possa ser usada diretamente como prompt de trabalho:

- **Contexto** — o que já existe quando a fase começa.
- **Objetivo** — o que a fase precisa alcançar.
- **Entregáveis** — a lista concreta do que será produzido.
- **Fora do escopo** — o que é proibido antecipar.
- **Critérios de aceite** — como validar que a fase terminou.
- **Dependências** — fases que precisam estar aprovadas antes.

## Fases

| # | Fase | Documento |
|---|------|-----------|
| 00 | Visão do Produto | [fase-00-visao-do-produto.md](fase-00-visao-do-produto.md) |
| 01 | Arquitetura | [fase-01-arquitetura.md](fase-01-arquitetura.md) |
| 02 | Banco de Dados | [fase-02-banco-de-dados.md](fase-02-banco-de-dados.md) |
| 03 | Motor Matemático | [fase-03-motor-matematico.md](fase-03-motor-matematico.md) |
| 04 | Backend | [fase-04-backend.md](fase-04-backend.md) |
| 05 | Realtime | [fase-05-realtime.md](fase-05-realtime.md) |
| 06 | Design System | [fase-06-design-system.md](fase-06-design-system.md) |
| 07 | Fluxo da Mesa | [fase-07-fluxo-da-mesa.md](fase-07-fluxo-da-mesa.md) |
| 08 | Distribuição | [fase-08-distribuicao.md](fase-08-distribuicao.md) |
| 09 | Fechamento | [fase-09-fechamento.md](fase-09-fechamento.md) |
| 10 | PIX | [fase-10-pix.md](fase-10-pix.md) |
| 11 | Scanner NFC-e | [fase-11-scanner-nfce.md](fase-11-scanner-nfce.md) |
| 12 | Polimento | [fase-12-polimento.md](fase-12-polimento.md) |
| 13 | Deploy | [fase-13-deploy.md](fase-13-deploy.md) |

O andamento é rastreado em [STATUS.md](STATUS.md).

## Como iniciar uma fase

1. Confirme em [STATUS.md](STATUS.md) que todas as fases anteriores estão `✅ Aprovada`.
2. Abra uma sessão com o Claude apontando para o documento da fase (ex.: "Implemente a FASE 03 conforme `docs/pipeline/fase-03-motor-matematico.md`").
3. O Claude segue o contrato de entrega definido em [`CLAUDE.md`](../../CLAUDE.md).
4. Valide os critérios de aceite, aprove a fase e atualize o STATUS.md.
