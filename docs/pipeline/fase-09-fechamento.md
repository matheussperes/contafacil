# FASE 09 — Fechamento

## Contexto

FASES 00–08 aprovadas. A mesa tem itens distribuídos e o resumo por participante é consistente. Falta transformar isso em conta fechada com pagamentos gerados.

## Objetivo

Implementar **toda a máquina de estados** do fechamento, do gatilho à geração dos pagamentos, conforme `docs/produto/maquina-de-estados.md`.

## Fluxo

```
ABERTA
   ↓
Validar
   ↓
FECHANDO
   ↓
Motor Matemático
   ↓
Gerar Pagamentos
   ↓
FECHADA
```

## Entregáveis

1. **Validação de fechamento** — pré-condições checadas antes de sair de ABERTA (ex.: todos os itens distribuídos, ou tratamento explícito dos não distribuídos conforme FASE 00).
2. **Transição ABERTA → FECHANDO** — estado intermediário que congela a mesa: nenhuma edição de itens/consumo durante o fechamento.
3. **Execução do motor matemático** — cálculo final por participante, com arredondamento e compensação (FASE 03).
4. **Geração de pagamentos** — um pagamento por participante devedor, persistido via CRUD da FASE 04.
5. **Transição FECHANDO → FECHADA** — atômica: ou tudo (cálculo + pagamentos + estado) é confirmado, ou a mesa volta a ABERTA com erro claro.
6. **Interface de fechamento** — tela de confirmação com resumo, progresso do fechamento e tela da mesa FECHADA (somente leitura + pagamentos).
7. **Propagação realtime** — todos os participantes veem a mesa congelar e fechar (evento "Mesa fechada", FASE 05).
8. **Testes** — cobertura de todas as transições válidas e inválidas da máquina de estados, incluindo falha no meio do fechamento.

## Fora do escopo

- Pagamento em si / PIX (FASE 10) — aqui os pagamentos são gerados, não pagos.
- Reabertura de mesa, se não prevista na FASE 00 (em caso de dúvida: perguntar, não assumir).

## Critérios de aceite

- [ ] Nenhuma transição fora da máquina de estados é possível (UI, aplicação e banco todos rejeitam).
- [ ] Mesa em FECHANDO bloqueia toda edição para todos os participantes.
- [ ] Falha durante o fechamento não deixa estado parcial (testado).
- [ ] Soma dos pagamentos gerados = total da mesa.
- [ ] Build, testes e lint verdes.

## Dependências

- FASE 03 (motor), FASE 04 (CRUD pagamentos), FASE 05 (evento de fechamento), FASE 08 (distribuição completa) — todas aprovadas.
