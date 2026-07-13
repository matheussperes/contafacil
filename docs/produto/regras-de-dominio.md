# Regras de Domínio — Glossário e Invariantes

Termos consolidados do domínio. Estes nomes (coluna "Código") são os identificadores em inglês permitidos no código, conforme convenção do projeto.

## Glossário

| Termo | Código | Definição |
|-------|--------|-----------|
| **Mesa** | `Table` | Sessão compartilhada de divisão de conta. Tem código de entrada, modo de acerto, taxa de serviço e estado (`ABERTA`, `FECHANDO`, `FECHADA`). |
| **Código de entrada** | `joinCode` | Identificador curto e legível (6 caracteres, sem ambíguos) que dá acesso à mesa. |
| **Participante** | `Participant` | Pessoa na mesa, identificada apenas pelo nome escolhido ao entrar. Estado: `ATIVO` ou `SAIU`. Papel: `CRIADOR` ou `MEMBRO`. |
| **Criador** | `owner` | Participante que administra a mesa: configura taxa/modo e inicia o fechamento. Sempre exatamente um ativo por mesa aberta. |
| **Item** | `Item` | Linha de consumo: descrição, quantidade, valor unitário (centavos), total. Origem `MANUAL` ou `NFCE`. |
| **Distribuição** | `Assignment` | Atribuição de (parte de) um item a participantes, num modo (`TODOS`, `PESSOA`, `GRUPO`) com refinamento por quantidade ou proporção. |
| **Grupo** | `Group` | Subconjunto de participantes usado em uma distribuição. |
| **Consumo** | `consumption` | Total, em centavos, das partes de itens atribuídas a um participante. |
| **Taxa de serviço** | `serviceFee` | Percentual da mesa (padrão 10%) rateado proporcionalmente ao consumo. |
| **Parte** | `share` | Valor em centavos que cabe a um participante: consumo + taxa proporcional. |
| **Fechamento** | `closing` | Transação que valida a mesa, congela edições, executa o motor matemático e gera os pagamentos. |
| **Modo de acerto** | `settlementMode` | Como a conta é acertada: `RECEBEDOR_FIXO` (A), `RECEBEDOR_NO_FECHAMENTO` (B), `PAGAMENTO_DIRETO` (C). |
| **Recebedor** | `payee` | Nos modos A/B, participante que pagou o estabelecimento e recebe os reembolsos via PIX. Inexistente no modo C. |
| **Pagamento** | `Payment` | Obrigação gerada no fechamento: devedor, valor, favorecido (recebedor ou estabelecimento) e estado (`PENDENTE`, `INFORMADO`, `PAGO`). |
| **BR Code** | `brCode` | Payload PIX estático no padrão EMV-MPM do Banco Central (copia e cola / QR Code). |
| **Compensação** | `remainderDistribution` | Distribuição determinística das sobras de centavos pelo método do maior resto (desempate: ordem de entrada). |
| **NFC-e** | `nfce` | Nota Fiscal de Consumidor Eletrônica; fonte de importação de itens via QR Code. |

## Invariantes por entidade

### Mesa
- I-M1. Tem exatamente um estado, seguindo a máquina `ABERTA → FECHANDO → FECHADA` (sem saltos, sem volta de `FECHADA`).
- I-M2. `joinCode` é único no sistema entre mesas não fechadas.
- I-M3. Taxa de serviço ∈ [0%, 100%], com até 2 casas decimais.
- I-M4. Tem exatamente um modo de acerto; no modo A, chave PIX do recebedor presente desde a criação.
- I-M5. Mesa aberta tem exatamente um participante ativo com papel `CRIADOR`.

### Participante
- I-P1. Nome não vazio (1–30 caracteres após trim), único na mesa (case-insensitive).
- I-P2. Estado `SAIU` é irreversível dentro da mesma participação (voltar = nova entrada, novo participante).
- I-P3. Participante `SAIU` preserva consumo e dívida; não recebe novas distribuições.

### Item
- I-I1. Quantidade > 0; valor unitário ≥ 1 centavo; total = quantidade × unitário (arredondado por RN-041).
- I-I2. Soma das quantidades atribuídas ≤ quantidade do item.
- I-I3. Item só é criado/editado/removido com a mesa `ABERTA`.

### Distribuição
- I-D1. Referencia apenas participantes existentes da mesa; novas distribuições apenas para participantes `ATIVO`.
- I-D2. Modo `TODOS` materializa (snapshot) os ativos do momento da atribuição.
- I-D3. Soma das partes de uma distribuição = valor coberto por ela (conservação, RN-043).

### Pagamento
- I-G1. Só existe pagamento em mesa `FECHADA` (ou em transação de fechamento).
- I-G2. Valor ≥ 1 centavo; no máximo um pagamento por participante por mesa.
- I-G3. Estados seguem a máquina do pagamento (`maquina-de-estados.md`); nenhuma outra escrita é válida após `FECHADA`.
- I-G4. Modos A/B: Σ pagamentos = total da mesa − parte do recebedor. Modo C: Σ pagamentos = total da mesa.

### Sistema (invariante central)
- **I-S1. Conservação do dinheiro:** em qualquer estado, Σ partes dos participantes = subtotal de consumo + taxa de serviço = total da mesa. Nenhuma operação cria ou destrói centavos.
