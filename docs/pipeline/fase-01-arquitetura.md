# FASE 01 — Arquitetura

## Contexto

A FASE 00 está aprovada: visão, regras de negócio, fluxos e máquina de estados estão documentados em `docs/produto/`. Ainda não existe código.

## Objetivo

Projetar **toda** a arquitetura do sistema antes de qualquer implementação, registrando cada decisão relevante como ADR (Architecture Decision Record).

## Entregáveis

Todos em `docs/arquitetura/`:

1. **ADRs** (`adr/adr-001-*.md`, …) — uma decisão por arquivo: contexto, decisão, alternativas consideradas, consequências.
2. **Estrutura de pastas** (`estrutura-de-pastas.md`) — árvore completa do repositório com a responsabilidade de cada diretório, refletindo Clean Architecture (domínio / aplicação / infraestrutura / interface).
3. **Convenções** (`convencoes.md`) — nomenclatura, organização de módulos, padrões de import, estilo de commits.
4. **Stack** (`stack.md`) — linguagem, framework, banco (Supabase/Postgres), hospedagem (Vercel), ferramentas de teste e lint, com justificativa.
5. **Dependências** (`dependencias.md`) — lista de bibliotecas permitidas, versões e critério de inclusão de novas dependências.
6. **Estratégia de estados** (`estrategia-estados.md`) — gerenciamento de estado no cliente (local, servidor, cache) e como a máquina de estados da Mesa é representada.
7. **Estratégia Realtime** (`estrategia-realtime.md`) — canais, eventos, reconexão, ordenação e resolução de conflitos.
8. **Estratégia Offline** (`estrategia-offline.md`) — o que funciona offline, fila de sincronização, resolução de conflitos ao reconectar.
9. **Estratégia de erros** (`estrategia-erros.md`) — taxonomia de erros (domínio, aplicação, infraestrutura), propagação e apresentação ao usuário.
10. **Estratégia de logs** (`estrategia-logs.md`) — níveis, estrutura, o que nunca logar (dados sensíveis), correlação de eventos.

Deve incluir também a decisão sobre **representação de dinheiro** (inteiros em centavos — nunca ponto flutuante), que a FASE 03 consumirá.

## Fora do escopo

- **Nada de implementação.** Nenhum código, nenhum `package.json`, nenhuma migration.
- Nada de design visual.

## Critérios de aceite

- [ ] Todos os 10 entregáveis existem e estão completos.
- [ ] Cada decisão estrutural relevante tem um ADR com alternativas consideradas.
- [ ] A estrutura de pastas separa domínio, aplicação e infraestrutura, e mostra onde cada fase futura (calculator, services, realtime, UI) vai morar.
- [ ] As estratégias de Realtime e Offline cobrem os fluxos da FASE 00 (nenhum fluxo fica sem resposta arquitetural).
- [ ] Existe ADR definindo a representação monetária.

## Dependências

- FASE 00 aprovada.
