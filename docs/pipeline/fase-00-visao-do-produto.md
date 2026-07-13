# FASE 00 — Visão do Produto

## Contexto

Repositório recém-criado. Não existe código nem documentação de negócio. Esta é a primeira fase do pipeline: o Claude deve entender **completamente o negócio antes de escrever código**.

## Objetivo

Produzir a documentação de negócio que servirá de fonte de verdade para todas as fases seguintes. Toda decisão de arquitetura, banco e interface derivará destes documentos.

## Entregáveis

Todos em `docs/produto/`:

1. **Documento de visão** (`visao.md`) — problema, público-alvo, proposta de valor, o que o produto é e o que não é.
2. **Regras de negócio** (`regras-de-negocio.md`) — regras numeradas (RN-001, RN-002, …), cada uma com enunciado, justificativa e exemplos.
3. **Fluxos do usuário** (`fluxos-do-usuario.md`) — jornadas completas: criar mesa, entrar em mesa, adicionar itens, distribuir consumo, fechar conta, pagar.
4. **Casos de uso** (`casos-de-uso.md`) — atores, pré-condições, fluxo principal, pós-condições.
5. **Fluxos alternativos** (`fluxos-alternativos.md`) — exceções e desvios de cada caso de uso (pessoa sai da mesa com consumo, item removido após distribuído, mesa fechada com pagamento pendente, etc.).
6. **Regras de domínio** (`regras-de-dominio.md`) — glossário de termos (Mesa, Participante, Item, Consumo, Pagamento, Distribuição…) e invariantes de cada entidade.
7. **Máquina de estados** (`maquina-de-estados.md`) — estados da Mesa (ao menos ABERTA, FECHANDO, FECHADA), do Pagamento e transições válidas, com diagramas.
8. **Critérios de aceite** (`criterios-de-aceite.md`) — cenários verificáveis (formato Dado/Quando/Então) para cada regra de negócio.

## Fora do escopo

- **Nada de código.** Nenhum arquivo de código-fonte, configuração de projeto ou dependência.
- Nada de escolha de stack, banco ou framework (isso é FASE 01).
- Nada de design visual ou telas.

## Critérios de aceite

- [ ] Os 8 documentos existem em `docs/produto/` e estão completos.
- [ ] Toda regra de negócio tem identificador único e exemplos concretos com valores.
- [ ] A máquina de estados cobre todas as transições citadas nos fluxos (nenhum fluxo referencia transição inexistente).
- [ ] Os critérios de aceite cobrem 100% das regras de negócio numeradas.
- [ ] Dúvidas de domínio foram registradas e respondidas (nenhuma suposição silenciosa).

## Dependências

Nenhuma.
