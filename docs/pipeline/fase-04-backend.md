# FASE 04 — Backend

## Contexto

FASES 00–03 aprovadas. O schema existe no Supabase (FASE 02) e o motor matemático está pronto e testado (FASE 03). Ainda não há camada de aplicação ligando os dois.

## Objetivo

Implementar a camada de aplicação e infraestrutura de dados: services, repositories e validators, expondo os CRUDs que as fases de interface e realtime consumirão.

## Escopo

```
services/
repositories/
validators/
```

## Entregáveis

CRUDs completos, **com validações**:

1. **CRUD Mesa** — criar, buscar (por id e por código de entrada), atualizar, transições de estado válidas apenas.
2. **CRUD Itens** — criar, editar, remover itens da mesa; bloqueado conforme estado da mesa.
3. **CRUD Participantes** — entrar na mesa, sair, renomear; regras para saída com consumo pendente.
4. **CRUD Consumo** — atribuir/editar/remover distribuição de itens a participantes e grupos.
5. **CRUD Pagamentos** — criar pagamentos no fechamento, atualizar status.

Além disso:

- **Repositories** isolam todo o acesso ao Supabase (nenhum service fala com o banco diretamente).
- **Validators** aplicam as regras de entrada antes do domínio; erros seguem a taxonomia da FASE 01.
- **Testes** de services com repositories dublados (mock/fake) e testes de integração dos repositories contra banco local.

## Fora do escopo

- Realtime/subscriptions (FASE 05).
- Interface e componentes.
- Fechamento completo da mesa e geração de pagamentos orquestrada (FASE 09) — aqui apenas o CRUD básico de pagamentos.
- PIX e NFC-e.

## Critérios de aceite

- [ ] Todos os 5 CRUDs implementados com validações e erros tipados.
- [ ] Nenhuma regra de negócio duplicada: services orquestram, o domínio (FASE 03 + entidades) decide.
- [ ] Transições de estado inválidas da Mesa são rejeitadas na aplicação (além do banco).
- [ ] Testes de services e de integração passam contra o banco local com seed.
- [ ] Build, testes e lint verdes; módulos das fases anteriores intocados.

## Dependências

- FASE 02 aprovada (schema e RLS).
- FASE 03 aprovada (motor matemático).
