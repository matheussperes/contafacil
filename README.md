# ContaFácil

Aplicação web (PWA) para dividir a conta de bares e restaurantes entre os participantes de uma mesa, em tempo real — com distribuição de itens, fechamento com compensação de pagamentos, PIX estático (copia e cola + QR Code) e importação de itens via scanner de NFC-e.

## Como este projeto é desenvolvido

O desenvolvimento **não** parte de um único prompt gigante. Ele é dividido em **14 fases independentes e verificáveis**, onde nenhuma fase depende de código ainda não construído. Cada fase tem contexto, objetivo, entregáveis, critérios de aceite e restrições bem definidos, documentados em [`docs/pipeline/`](docs/pipeline/).

As regras permanentes do projeto e o contrato de entrega de cada fase estão em [`CLAUDE.md`](CLAUDE.md).

## Pipeline completo

| Fase | Nome | Entrega | Documento |
|------|------|---------|-----------|
| 00 | Visão do Produto | Documentação de negócio (sem código) | [fase-00](docs/pipeline/fase-00-visao-do-produto.md) |
| 01 | Arquitetura | ADRs, stack, convenções, estratégias (sem implementação) | [fase-01](docs/pipeline/fase-01-arquitetura.md) |
| 02 | Banco de Dados | Migrations, RLS, triggers, seed, views | [fase-02](docs/pipeline/fase-02-banco-de-dados.md) |
| 03 | Motor Matemático | `calculator/` com 100% dos testes verdes | [fase-03](docs/pipeline/fase-03-motor-matematico.md) |
| 04 | Backend | Services, repositories, validators, CRUDs | [fase-04](docs/pipeline/fase-04-backend.md) |
| 05 | Realtime | Sincronização completa de eventos da mesa | [fase-05](docs/pipeline/fase-05-realtime.md) |
| 06 | Design System | Componentes base (sem telas) | [fase-06](docs/pipeline/fase-06-design-system.md) |
| 07 | Fluxo da Mesa | Home → Nova Mesa → Entrar → Nome → Mesa | [fase-07](docs/pipeline/fase-07-fluxo-da-mesa.md) |
| 08 | Distribuição | Todos / Pessoa / Grupo, quantidade, proporção | [fase-08](docs/pipeline/fase-08-distribuicao.md) |
| 09 | Fechamento | Máquina de estados ABERTA → FECHANDO → FECHADA | [fase-09](docs/pipeline/fase-09-fechamento.md) |
| 10 | PIX | Payload estático, copia e cola, QR Code, status | [fase-10](docs/pipeline/fase-10-pix.md) |
| 11 | Scanner NFC-e | QR Code → parser → itens na mesa (fallback manual) | [fase-11](docs/pipeline/fase-11-scanner-nfce.md) |
| 12 | Polimento | Animações, acessibilidade, PWA, offline, performance | [fase-12](docs/pipeline/fase-12-polimento.md) |
| 13 | Deploy | Supabase, Vercel, domínio, analytics, monitoramento | [fase-13](docs/pipeline/fase-13-deploy.md) |

```text
FASE 00  Visão do Produto
   ↓
FASE 01  Arquitetura
   ↓
FASE 02  Banco de Dados
   ↓
FASE 03  Motor Matemático
   ↓
FASE 04  Backend
   ↓
FASE 05  Realtime
   ↓
FASE 06  Design System
   ↓
FASE 07  Fluxo da Mesa
   ↓
FASE 08  Distribuição
   ↓
FASE 09  Fechamento
   ↓
FASE 10  PIX
   ↓
FASE 11  Scanner NFC-e
   ↓
FASE 12  Polimento
   ↓
FASE 13  Deploy
```

## Estado atual

Todas as 14 fases (00–13) foram entregues. O projeto tem:

- **Domínio puro e testado** (`src/domain`): motor de divisão por maior resto, taxa proporcional, máquinas de estados, payload PIX (BR Code EMV + CRC16) — com testes de propriedade (`fast-check`) provando conservação e determinismo.
- **Banco Postgres/Supabase** (`supabase/`): 6 tabelas, RLS em todas, triggers de integridade, `close_table` atômico, seed e uma suíte SQL executável.
- **Aplicação e infraestrutura** (`src/application`, `src/infrastructure`): services, repositories Supabase, realtime idempotente, logging com redação, parser NFC-e.
- **Interface** (`src/ui`, `src/app`): design system, fluxo da mesa, distribuição, fechamento, PIX e scanner — PWA instalável com offline.
- **Operação** (`.github/`, `vercel.json`, `docs/operacao/`): CI (app + banco), config de deploy e runbooks.

### Rodar localmente

```bash
pnpm install
pnpm test         # ~119 testes (domínio, aplicação, infra, componentes)
pnpm typecheck && pnpm lint && pnpm build

# banco, sem Docker (Postgres local ≥ 15):
supabase/tests/run-local.sh

# app (precisa das envs do Supabase — ver .env.example):
pnpm dev
```

## Regra de ouro

Uma fase só começa depois que a anterior foi **entregue, validada (build + testes + lint) e aprovada**. Nenhuma fase cria funcionalidade fora do seu escopo.
