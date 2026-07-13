# CLAUDE.md — Regras do projeto ContaFácil

Este arquivo rege **todas** as sessões de desenvolvimento deste repositório. Leia-o antes de qualquer implementação.

## O que é o projeto

ContaFácil é um PWA para dividir a conta de bares/restaurantes entre os participantes de uma mesa, em tempo real, com fechamento matemático, PIX estático e importação de itens via NFC-e.

## Como o desenvolvimento funciona

O projeto é construído em **14 fases sequenciais** (FASE 00 a FASE 13), documentadas em `docs/pipeline/`. Cada sessão de trabalho atua em **uma única fase**. Antes de escrever qualquer coisa:

1. Identifique a fase atual (a primeira com status diferente de `✅ Aprovada` em `docs/pipeline/STATUS.md`).
2. Leia o documento da fase em `docs/pipeline/fase-XX-*.md`.
3. Leia os documentos das fases já aprovadas que a fase atual declara como dependência.

## Contrato de entrega (vale para todas as fases)

```text
1. Entender o objetivo.
   ↓
2. Explicar rapidamente a estratégia.
   ↓
3. Planejar os arquivos que serão criados.
   ↓
4. Implementar.
   ↓
5. Executar testes.
   ↓
6. Corrigir problemas encontrados.
   ↓
7. Atualizar documentação (incluindo docs/pipeline/STATUS.md).
   ↓
8. Esperar aprovação antes da próxima fase.
```

## Regras permanentes

Estas regras valem durante toda a implementação, em todas as fases:

1. **Nunca modificar módulos já aprovados sem necessidade.** Se uma mudança em módulo aprovado for inevitável, explicite o motivo antes de alterá-lo.
2. **Não criar funcionalidades fora do escopo da fase atual.** Cada documento de fase lista explicitamente o que está fora do escopo.
3. **Priorizar Clean Architecture**: separação clara entre domínio, aplicação e infraestrutura.
4. **Centralizar toda a lógica de negócio no domínio.** A interface apenas consome essa lógica — nenhuma regra de negócio em componentes de UI.
5. **Toda regra financeira deve ser coberta por testes automatizados.** Sem exceção: cálculo, arredondamento, compensação e validação são código crítico.
6. **Todo código novo deve manter compatibilidade com os módulos existentes.** Quebrou algo aprovado? Corrija antes de prosseguir.
7. **Ao final de cada fase, validar compilação, testes e lint antes de avançar.** Uma fase não está entregue com build quebrado, teste vermelho ou lint falhando.
8. **Em caso de dúvida de domínio, interromper e perguntar.** Nunca assumir comportamento de regra de negócio — solicitar esclarecimento vale mais que retrabalho.

## Convenções gerais

- Idioma da documentação e das mensagens de commit: **português (pt-BR)**.
- Idioma do código (identificadores, nomes de arquivos de código): **inglês**, salvo termos de domínio consolidados na FASE 00.
- Valores monetários **nunca** em ponto flutuante: usar inteiros em centavos (ou decimal apropriado), conforme definido na FASE 01/03.
- Commits pequenos e descritivos, um assunto por commit.

## Status do pipeline

O andamento das fases é rastreado em `docs/pipeline/STATUS.md`. Atualize-o ao concluir qualquer fase e **aguarde aprovação explícita** antes de marcar uma fase como aprovada ou iniciar a próxima.
