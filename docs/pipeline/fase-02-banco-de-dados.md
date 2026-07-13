# FASE 02 — Banco de Dados

## Contexto

FASES 00 e 01 aprovadas. As entidades, invariantes e a máquina de estados estão definidas em `docs/produto/`; a stack (Supabase/Postgres) e as convenções estão em `docs/arquitetura/`. Ainda não existe schema.

## Objetivo

Modelar e versionar **todo** o banco de dados, com segurança (RLS) e integridade garantidas no próprio banco — não apenas na aplicação.

## Entregáveis

Em `supabase/migrations/` (SQL versionado) e `docs/banco/` (documentação):

1. **Todas as migrations** — criação de tabelas para Mesa, Participante, Item, Consumo/Distribuição, Pagamento e demais entidades da FASE 00.
2. **ENUMs** — estados da Mesa, do Pagamento, tipos de distribuição, espelhando a máquina de estados aprovada.
3. **Constraints** — chaves, unicidade, checks que garantam as invariantes de domínio (ex.: valores não negativos, soma de distribuição consistente).
4. **Triggers** — automações de integridade (ex.: atualização de totais, carimbo de transição de estado).
5. **Índices** — para os padrões de acesso descritos nos fluxos (busca de mesa por código, consumo por participante, etc.).
6. **Policies + RLS** — Row Level Security habilitado em todas as tabelas, com policies que implementam quem pode ler/escrever o quê.
7. **Seed** (`supabase/seed.sql`) — dados de desenvolvimento realistas cobrindo os fluxos principais.
8. **Views** — visões de leitura para resumo da mesa, totais por participante e estado dos pagamentos.
9. **Funções SQL** — funções auxiliares necessárias a triggers, policies e views.

**Tudo documentado** em `docs/banco/`: diagrama ER, dicionário de dados (tabela a tabela, coluna a coluna) e justificativa de cada policy.

## Fora do escopo

- Código de aplicação (services, repositories — FASE 04).
- Lógica de cálculo financeiro em SQL (o motor matemático é a FASE 03, no domínio).
- Interface.

## Critérios de aceite

- [ ] `supabase db reset` aplica todas as migrations e o seed sem erro.
- [ ] Todas as tabelas têm RLS habilitado e policy explícita (nenhuma tabela aberta por omissão).
- [ ] Valores monetários armazenados conforme o ADR da FASE 01 (centavos inteiros).
- [ ] Toda invariante de domínio da FASE 00 tem constraint ou trigger correspondente (ou justificativa documentada de por que fica na aplicação).
- [ ] O dicionário de dados cobre 100% das tabelas e colunas.

## Dependências

- FASE 00 aprovada (entidades e invariantes).
- FASE 01 aprovada (stack, convenções, ADR monetário).
