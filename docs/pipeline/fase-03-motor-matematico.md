# FASE 03 — Motor Matemático (Core Financeiro)

## Contexto

FASES 00–02 aprovadas. As regras financeiras estão numeradas em `docs/produto/regras-de-negocio.md` e a representação monetária está decidida (centavos inteiros). Este é o módulo mais crítico do produto.

## Objetivo

Implementar o núcleo de cálculo financeiro como módulo de domínio **puro** (sem I/O, sem banco, sem framework), com cobertura total de testes.

**Meta: 100% dos testes verdes. Sem interface.**

## Escopo

Somente:

```
calculator/
```

## Entregáveis

1. **Cálculo** — divisão de itens por modo (todos, por pessoa, por grupo), quantidade e proporção; totais por participante; taxa de serviço/gorjeta se prevista nas regras de negócio.
2. **Validações** — entradas inválidas rejeitadas com erros de domínio tipados (quantidade negativa, distribuição que não soma o item, participante inexistente…).
3. **Arredondamentos** — política de arredondamento explícita e determinística; a soma das partes **sempre** igual ao total (nenhum centavo criado ou perdido).
4. **Compensação** — distribuição das sobras de centavos entre participantes segundo regra determinística e documentada.
5. **Erros** — hierarquia de erros do domínio financeiro, conforme a estratégia de erros da FASE 01.
6. **Testes** — unitários para cada regra financeira (RN-XXX referenciada no nome/descrição do teste), casos de borda (1 participante, valores de 1 centavo, proporções que geram dízimas) e testes baseados em propriedade para a invariante "soma das partes = total".

## Fora do escopo

- Interface, telas, componentes.
- Persistência, banco, rede — o módulo não importa nada de infraestrutura.
- CRUDs (FASE 04).

## Critérios de aceite

- [ ] `calculator/` não tem nenhuma dependência de infraestrutura ou framework.
- [ ] 100% dos testes passam.
- [ ] Toda regra financeira da FASE 00 tem teste automatizado que a referencia.
- [ ] Propriedade "soma das partes = total do item/mesa" verificada por teste de propriedade.
- [ ] Nenhum uso de ponto flutuante para dinheiro.
- [ ] Build, testes e lint verdes.

## Dependências

- FASE 00 aprovada (regras financeiras).
- FASE 01 aprovada (estrutura de pastas, ADR monetário, estratégia de erros).
