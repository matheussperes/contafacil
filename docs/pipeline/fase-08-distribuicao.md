# FASE 08 — Distribuição

## Contexto

FASES 00–07 aprovadas. A mesa funciona: pessoas entram, itens existem. Falta o coração da experiência: dizer **quem consumiu o quê**.

## Objetivo

Implementar a interface de distribuição de itens entre participantes, cobrindo todos os modos de divisão definidos na FASE 00 e calculados pelo motor da FASE 03.

## Entregáveis

Modos de distribuição:

```
Todos
Pessoa
Grupo
```

Depois, refinamento:

```
Quantidade
   ↓
Proporção
   ↓
Resumo
```

Adicionar interações:

- **Drag & Drop** — arrastar item (ou parte) para participante/grupo.
- **Clique rápido** — atalho de um toque para os casos comuns (ex.: "todos").
- **Distribuição automática** — sugestão de divisão igualitária dos itens ainda não distribuídos.

Requisitos:

1. Todo cálculo exibido vem do motor matemático (FASE 03) — a UI **nunca** calcula.
2. Alterações de distribuição sincronizam em tempo real entre participantes (FASE 05).
3. **Resumo** mostra o total por participante, sempre consistente com o total da mesa.
4. Itens parcialmente distribuídos ficam visualmente evidentes.

## Fora do escopo

- Fechamento da mesa (FASE 09) — o resumo aqui é informativo, não gera pagamentos.
- PIX e scanner.
- Novos modos de divisão não previstos na FASE 00.

## Critérios de aceite

- [ ] Os 3 modos (Todos, Pessoa, Grupo) funcionam, com quantidade e proporção.
- [ ] Drag & drop, clique rápido e distribuição automática funcionam em mobile e desktop.
- [ ] Soma dos totais por participante = total da mesa, em qualquer combinação (verificado por teste).
- [ ] Distribuição refletida em tempo real para todos os participantes.
- [ ] Build, testes e lint verdes; motor matemático (FASE 03) não modificado.

## Dependências

- FASE 03 aprovada (cálculo), FASE 05 aprovada (realtime), FASE 07 aprovada (tela da Mesa).
