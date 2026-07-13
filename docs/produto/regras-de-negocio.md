# Regras de Negócio — ContaFácil

Regras numeradas por grupo (dezenas). Cada regra tem enunciado, justificativa e exemplo. Estas regras são a fonte de verdade para o motor matemático (FASE 03), o schema (FASE 02) e as validações (FASE 04).

## Decisões de domínio registradas

Decisões tomadas com o responsável pelo produto em 13/07/2026:

| # | Decisão |
|---|---------|
| D1 | Os **três modos de acerto** (recebedor fixo, recebedor no fechamento, pagamento direto ao estabelecimento) estão disponíveis. No modo direto, o pagamento pode ser por PIX **ou cartão/outro meio** — o app entrega o valor exato. |
| D2 | Taxa de serviço **configurável por mesa** (padrão 10%, pode ser 0%), rateada proporcionalmente ao consumo. |
| D3 | Participante pode sair da mesa com consumo atribuído: ele fica marcado como "saiu" e **seu consumo e dívida permanecem** no fechamento. |
| D4 | Itens sem dono no fechamento: a validação **pergunta** — dividir entre todos ou voltar e distribuir. Nada fecha com item órfão silencioso. |

Decisões assumidas como padrão, **a ratificar na aprovação desta fase** (marcadas ⚠️ nas regras):

| # | Decisão assumida | Regra |
|---|------------------|-------|
| P1 | Apenas o criador (ou quem herdar o papel) inicia o fechamento e altera configurações da mesa. | RN-031 |
| P2 | Se o criador sair, o papel passa ao participante ativo mais antigo. | RN-008 |
| P3 | Distribuição "Todos" é um retrato (snapshot) dos ativos no momento da atribuição — quem entra depois não é incluído automaticamente. | RN-023 |
| P4 | Mesa FECHADA não pode ser reaberta no MVP. | RN-005 |

---

## Grupo 00 — Mesa

**RN-001 — Criação.** Toda mesa nasce no estado `ABERTA`, com código de entrada único, curto e legível (6 caracteres alfanuméricos, sem ambíguos como `0/O`, `1/I`) e link de convite equivalente.
*Justificativa:* entrada sem cadastro exige um identificador falável em voz alta num bar.
*Exemplo:* mesa criada gera código `7GXK2M` e link `contafacil.app/m/7GXK2M`.

**RN-002 — Modo de acerto.** A mesa tem exatamente um modo de acerto — `RECEBEDOR_FIXO` (A), `RECEBEDOR_NO_FECHAMENTO` (B) ou `PAGAMENTO_DIRETO` (C) — escolhido na criação e alterável pelo criador enquanto `ABERTA`.
*Justificativa:* decisão D1; o modo determina como os pagamentos são gerados no fechamento.
*Exemplo:* mesa criada no modo A pode virar modo C antes do fechamento; depois de `FECHANDO`, não.

**RN-003 — Chave PIX por modo.** No modo A, a chave PIX do recebedor é obrigatória na criação. No modo B, é exigida da pessoa que se declarar recebedora no fechamento. No modo C, a chave do estabelecimento é opcional — sem ela, o app exibe apenas o valor exato a pagar (cartão/outro meio).
*Exemplo:* modo C sem chave → tela de pagamento mostra "Sua parte: R$ 47,38" sem QR Code.

**RN-004 — Taxa de serviço.** A mesa tem taxa de serviço percentual configurável pelo criador enquanto `ABERTA`: padrão **10%**, mínimo 0%, máximo 100%, com até 2 casas decimais.
*Justificativa:* decisão D2; 10% é o costume brasileiro, mas há casas sem taxa ou com taxa embutida.
*Exemplo:* consumo R$ 200,00 com taxa 10% → total da mesa R$ 220,00.

**RN-005 — Estados da mesa.** ⚠️(P4) A mesa segue a máquina de estados `ABERTA → FECHANDO → FECHADA` (ver `maquina-de-estados.md`). `FECHADA` é terminal: somente leitura, exceto atualização de status de pagamentos (RN-052). Não há reabertura no MVP.
*Exemplo:* tentar adicionar item em mesa `FECHADA` → erro de domínio `MESA_NAO_ABERTA`.

**RN-006 — Janela de edição.** Entrada de participantes, criação/edição/remoção de itens e alterações de distribuição só são aceitas com a mesa `ABERTA`.
*Exemplo:* mesa em `FECHANDO` → botão de adicionar item desabilitado e operação rejeitada no servidor.

## Grupo 01 — Participantes

**RN-007 — Entrada.** Para entrar, a pessoa informa um nome (1 a 30 caracteres, não vazio após trim), único entre os participantes da mesa (comparação sem diferenciar maiúsculas). Nome repetido → pedir outro.
*Exemplo:* já existe "Ana"; segunda "ana" é rejeitada com sugestão ("Ana C.?").

**RN-008 — Papéis.** ⚠️(P2) Todo participante é `CRIADOR` ou `MEMBRO`. Há sempre exatamente um criador ativo por mesa aberta: se o criador sair, o papel passa automaticamente ao participante **ativo** há mais tempo na mesa.
*Justificativa:* alguém precisa poder fechar a mesa e ajustar configurações.
*Exemplo:* criador sai às 22h; "Bruno", primeiro a ter entrado depois dele, vira criador.

**RN-009 — Saída com consumo.** Participante pode sair a qualquer momento com a mesa `ABERTA`. Ele passa ao estado `SAIU`; seu consumo já atribuído e a dívida correspondente **permanecem** e entram no fechamento.
*Justificativa:* decisão D3; quem consumiu deve, mesmo indo embora mais cedo.
*Exemplo:* Carla consumiu R$ 35,00 e sai; no fechamento é gerado pagamento de R$ 38,50 (com taxa 10%) em nome dela.

**RN-010 — Participante que saiu.** Participante `SAIU` não recebe **novas** distribuições, não aparece nas opções "Todos"/"Grupo" e não pode agir na mesa — mas continua listado (marcado como "saiu") e visível no resumo.
*Exemplo:* item adicionado após a saída de Carla no modo "Todos" não inclui Carla.

## Grupo 02 — Itens e distribuição

**RN-020 — Item.** Todo item tem descrição (1 a 100 caracteres), quantidade > 0 (até 3 casas decimais, para itens por peso), valor unitário em **centavos inteiros** ≥ 1 e total = quantidade × valor unitário, arredondado conforme RN-041.
*Exemplo:* `Chopp 500ml`, quantidade 4, unitário 1.590 centavos → total 6.360 centavos (R$ 63,60).

**RN-021 — Origem do item.** Item nasce de entrada `MANUAL` ou de importação `NFCE`. Após criado, a origem é apenas informativa: itens importados são indistinguíveis dos manuais para distribuição, cálculo e fechamento.
*Exemplo:* item vindo da NFC-e pode ser editado ou removido como qualquer outro.

**RN-022 — Modos de distribuição.** Cada parte de um item é atribuída em um de três modos: `TODOS` (participantes ativos, em partes iguais), `PESSOA` (um participante) ou `GRUPO` (subconjunto de participantes, em partes iguais ou ponderadas).
*Exemplo:* "Tábua de frios" → GRUPO {Ana, Bruno, Caio} em partes iguais.

**RN-023 — "Todos" é snapshot.** ⚠️(P3) A distribuição `TODOS` captura os participantes **ativos no momento da atribuição**. Quem entra depois não é incluído automaticamente; reatribuir é uma ação explícita (um toque).
*Justificativa:* rodadas pedidas antes de alguém chegar não são dessa pessoa.
*Exemplo:* 1ª rodada às 20h (4 pessoas) fica com 4; Dani chega 20h30 e só entra nas rodadas seguintes.

**RN-024 — Quantidade e proporção.** O refinamento da distribuição aceita **quantidade** (unidades do item, inclusive fracionárias: 0,5 porção) ou **proporção** (pesos relativos). A soma das quantidades atribuídas não pode exceder a quantidade do item; proporções são normalizadas sobre a parte que cobrem.
*Exemplo:* pizza (8 fatias): Ana 3, Bruno 3, Caio 2. Vinho por proporção: Ana peso 2, Bruno peso 1 → Ana paga 2/3.

**RN-025 — Distribuição parcial.** Enquanto a mesa está `ABERTA`, um item pode estar total, parcial ou não distribuído. A parte não atribuída fica visualmente evidente e é resolvida na validação do fechamento (RN-032).
*Exemplo:* item de R$ 90,00 com R$ 60,00 atribuídos → badge "R$ 30,00 sem dono".

**RN-026 — Efeitos de edição.** Remover um item remove suas distribuições. Alterar valor/quantidade de um item recalcula as partes mantendo as atribuições existentes (mesmas pessoas, mesmas quantidades/pesos); se a quantidade nova for menor que a soma atribuída, a distribuição é invalidada e volta para "sem dono" no excedente.
*Exemplo:* chopp de 4 → 3 unidades, com 4 atribuídas: sobram 3 válidas pela ordem de atribuição e o app sinaliza o ajuste.

## Grupo 03 — Fechamento

**RN-030 — Pré-condição.** O fechamento só pode ser iniciado com a mesa `ABERTA` e com pelo menos 1 participante e 1 item.
*Exemplo:* mesa vazia → botão "Fechar conta" desabilitado.

**RN-031 — Quem fecha.** ⚠️(P1) Apenas o participante com papel `CRIADOR` inicia o fechamento, altera taxa de serviço e modo de acerto.
*Exemplo:* membro vê o resumo, mas o botão "Fechar conta" só age para o criador.

**RN-032 — Validação de itens sem dono.** Ao iniciar o fechamento, itens não (ou parcialmente) distribuídos são listados e o criador escolhe: **dividir a parte sem dono igualmente entre todos os participantes com consumo** ou **cancelar e voltar** para distribuir manualmente. Nada fecha com valor órfão silencioso.
*Justificativa:* decisão D4.
*Exemplo:* "2 itens sem dono (R$ 43,00). Dividir entre todos ou voltar?"

**RN-033 — Congelamento.** Em `FECHANDO`, a mesa fica congelada para **todos**: nenhuma entrada de participante, item ou distribuição. Só há dois caminhos: concluir (`FECHADA`) ou falhar e reverter (`ABERTA`).
*Exemplo:* durante o fechamento, outro participante tenta editar item → rejeitado com `MESA_CONGELADA`.

**RN-034 — Atomicidade.** A transição `FECHANDO → FECHADA` é atômica: cálculo final, geração de todos os pagamentos e mudança de estado são confirmados juntos, ou nada é persistido e a mesa volta a `ABERTA` com erro claro.
*Exemplo:* falha ao gravar o 3º pagamento → nenhum pagamento existe e a mesa reabre.

**RN-035 — Geração de pagamentos.** Ao fechar, é gerado no máximo um pagamento por participante com consumo > 0, conforme o modo: **A/B** — um pagamento por devedor em favor do recebedor (o recebedor não gera pagamento para si; sua parte considera-se quitada ao pagar o estabelecimento); **C** — um pagamento por participante, referente à sua parte, devido ao estabelecimento.
*Exemplo (modo B):* total R$ 220,00; recebedor Ana deve R$ 60,00 → pagamentos: Bruno R$ 90,00 e Caio R$ 70,00 para Ana.

**RN-036 — Conservação no fechamento.** Invariante: `soma das partes individuais = total da mesa` (consumo + taxa). Nos modos A/B, `soma dos pagamentos = total − parte do recebedor`; no modo C, `soma dos pagamentos = total`.
*Exemplo:* nunca existe fechamento em que os pagamentos somados divirjam do total em 1 centavo sequer.

## Grupo 04 — Cálculo financeiro

**RN-040 — Centavos inteiros.** Todo valor monetário é representado, armazenado e calculado em centavos inteiros. Ponto flutuante é proibido em qualquer cálculo financeiro.
*Exemplo:* R$ 63,60 = `6360`; nunca `63.60`.

**RN-041 — Arredondamento determinístico.** Toda divisão usa o **método do maior resto**: divide-se em partes inteiras (piso) e os centavos restantes são distribuídos, um a um, às maiores partes fracionárias.
*Exemplo:* 100 centavos ÷ 3 → partes 33/33/33, sobram 1 → 34/33/33.

**RN-042 — Desempate.** Empate nas partes fracionárias é resolvido pela **ordem de entrada na mesa** (quem entrou antes absorve o centavo primeiro). O resultado é 100% determinístico: mesmo input → mesmo output, em qualquer dispositivo.
*Exemplo:* 100 ÷ 3 entre Ana (1ª), Bruno (2º), Caio (3º), frações iguais → Ana 34, Bruno 33, Caio 33.

**RN-043 — Conservação por item.** A soma das partes atribuídas de um item é exatamente igual ao valor coberto por essas atribuições; a soma de todas as partes de todos os itens é igual ao subtotal de consumo da mesa. Nenhum centavo é criado ou perdido.
*Exemplo:* item 1.000 centavos ÷ 3 → 334+333+333 = 1.000.

**RN-044 — Taxa proporcional.** A taxa de serviço é calculada sobre o consumo de cada participante (mesma regra de arredondamento e compensação), de modo que a soma das taxas individuais = taxa total da mesa.
*Justificativa:* decisão D2 — quem consumiu mais paga mais taxa.
*Exemplo:* taxa 10%, consumos 6.000/3.000/1.000 → taxas 600/300/100.

## Grupo 05 — Pagamentos e PIX

**RN-050 — PIX estático.** O PIX gerado é sempre estático (BR Code padrão EMV do Banco Central), com chave do recebedor, valor exato do pagamento e identificador da mesa. Sem integração bancária, sem PIX dinâmico, sem webhook.
*Exemplo:* pagamento de R$ 38,50 gera BR Code com `transactionAmount = 38.50` e txid derivado da mesa.

**RN-051 — Estados do pagamento.** Modos A/B: `PENDENTE → INFORMADO → PAGO` — o devedor marca "paguei" (`INFORMADO`) e o recebedor confirma "recebi" (`PAGO`). Modo C: `PENDENTE → PAGO` — autodeclarado pelo próprio participante (não há recebedor no app para confirmar).
*Exemplo:* Bruno paga o PIX e marca "paguei"; Ana vê "Bruno informou pagamento" e confirma.

**RN-052 — Pagamento pós-fechamento.** Atualização de status de pagamento é a **única** escrita permitida em mesa `FECHADA`, e propaga em tempo real para todos.
*Exemplo:* mesa fechada há 1h; Caio marca "paguei" e todos veem o status mudar.

**RN-053 — Modo C sem chave.** No modo C sem chave PIX do estabelecimento, não há BR Code: a tela exibe o valor exato do participante para pagamento por cartão/outro meio, e a marcação manual de pago (RN-051) funciona igualmente.
*Justificativa:* decisão D1.
*Exemplo:* "Sua parte: R$ 47,38 — pague no caixa e marque como pago."

## Grupo 06 — NFC-e

**RN-060 — Importação.** A leitura do QR Code da NFC-e extrai os itens (descrição, quantidade, valor unitário) para uma tela de **revisão obrigatória**; só itens confirmados entram na mesa, como origem `NFCE` (RN-021).
*Exemplo:* nota com 12 itens → usuário exclui "couvert" duplicado e confirma 11.

**RN-061 — Fallback garantido.** Falha em qualquer etapa (QR ilegível, SEFAZ indisponível, formato desconhecido) leva à entrada manual com mensagem clara. Não existe beco sem saída.
*Exemplo:* SEFAZ fora do ar → "Não conseguimos ler a nota. Adicione os itens manualmente."
