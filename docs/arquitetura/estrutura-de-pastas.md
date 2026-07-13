# Estrutura de Pastas — ContaFácil

Árvore-alvo do repositório. Cada diretório indica a fase que o cria. A regra de dependência entre camadas (ADR-004) é imposta por lint: **ui/app → application → domain**, com infrastructure implementando os ports da application.

```text
contafacil/
├── CLAUDE.md                      # regras do projeto
├── README.md
├── docs/
│   ├── pipeline/                  # fases e status
│   ├── produto/                   # FASE 00 (aprovada)
│   ├── arquitetura/               # FASE 01 (este documento)
│   ├── banco/                     # FASE 02 — ER, dicionário de dados, policies
│   └── operacao/                  # FASE 13 — runbooks
├── supabase/                      # FASE 02
│   ├── migrations/                # SQL versionado (tabelas, RLS, triggers, close_table)
│   ├── seed.sql
│   └── config.toml
├── public/                        # estáticos; ícones/manifest na FASE 12
├── src/
│   ├── domain/                    # ═══ DOMÍNIO (puro, zero imports externos) ═══
│   │   ├── money/                 # FASE 03 — Cents, BasisPoints, formatação de borda
│   │   ├── calculator/            # FASE 03 — allocate(), partes, taxa, compensação
│   │   ├── entities/              # FASE 03 — Table, Participant, Item, Assignment, Payment
│   │   │                          #           + máquinas de estados (uniões discriminadas)
│   │   ├── pix/                   # FASE 10 — payload BR Code EMV + CRC16 (puro)
│   │   └── errors/                # FASE 03 — DomainError + códigos (MESA_CONGELADA…)
│   ├── application/               # ═══ APLICAÇÃO (importa só domain) ═══
│   │   ├── ports/                 # FASE 04 — interfaces: TableRepository, EventBus,
│   │   │                          #           DeviceStorage, Clock…
│   │   ├── services/              # FASE 04 — casos de uso por agregado:
│   │   │   ├── table-service.ts   #           mesa (criar, entrar, sair, configurar)
│   │   │   ├── item-service.ts    #           itens (manual + inserção pós-NFC-e)
│   │   │   ├── assignment-service.ts
│   │   │   ├── closing-service.ts # FASE 09 — orquestra fechamento (via RPC port)
│   │   │   └── payment-service.ts
│   │   ├── validators/            # FASE 04 — validação de entrada (RN-007, RN-020…)
│   │   └── events/                # FASE 05 — tipos dos 8 eventos + reducer do cache
│   ├── infrastructure/            # ═══ INFRA (implementa ports) ═══
│   │   ├── supabase/
│   │   │   ├── client.ts          # FASE 04 — criação do client (único ponto)
│   │   │   ├── repositories/      # FASE 04 — *Repository → tabelas/RPC
│   │   │   ├── realtime/          # FASE 05 — adapter: postgres_changes → eventos tipados
│   │   │   └── mappers/           # FASE 04 — linha do banco ↔ entidade do domínio
│   │   ├── nfce/                  # FASE 11 — fetch + parser da SEFAZ → JSON normalizado
│   │   ├── storage/               # FASE 04 — DeviceStorage (localStorage)
│   │   └── logging/               # FASE 04 — logger estruturado (console/Sentry)
│   ├── ui/                        # ═══ UI (zero regra de negócio) ═══
│   │   ├── design-system/         # FASE 06 — tokens + componentes base + catálogo
│   │   ├── features/              # FASE 07+ — telas e composição por fluxo:
│   │   │   ├── home/              # FASE 07
│   │   │   ├── table/             # FASE 07 — criar/entrar/mesa viva
│   │   │   ├── distribution/      # FASE 08
│   │   │   ├── closing/           # FASE 09
│   │   │   ├── payment/           # FASE 10
│   │   │   └── scanner/           # FASE 11
│   │   └── hooks/                 # FASE 07 — useTable(), useRealtimeTable()…
│   └── app/                       # rotas Next.js — SÓ composição e metadados
│       ├── layout.tsx             # FASE 07
│       ├── page.tsx               # FASE 07 — Home
│       └── m/[joinCode]/          # FASE 07 — mesa + OG no servidor
├── tests/
│   ├── integration/               # FASES 02/04/05 — banco local, RLS, close_table
│   └── e2e/                       # FASE 07+ — Playwright, jornadas F1..F8
├── eslint.config.js               # FASE 03 — inclui fronteiras de camada
├── package.json                   # FASE 03 (primeiro código)
└── tsconfig.json                  # strict; paths @/*
```

## Regras de ocupação

1. **Cada fase só cria os diretórios marcados com ela.** Diretório de fase futura não nasce antes.
2. `src/domain` **não importa nada** de fora de `src/domain` (nem node_modules de runtime — exceções: nenhuma).
3. `src/app` contém rotas finas: busca de dados de servidor para OG e composição de features. Lógica ali é defeito de revisão.
4. Testes unitários ficam co-locados (`foo.ts` + `foo.test.ts`); só integração e E2E vivem em `tests/`.
5. Imports absolutos via `@/` (ex.: `@/domain/calculator`); imports relativos só dentro do mesmo módulo.
