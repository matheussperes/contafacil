# Fluxos Alternativos e Exceções — ContaFácil

Desvios de cada caso de uso (`casos-de-uso.md`). Cada fluxo alternativo indica o caso de uso de origem, o gatilho e o comportamento esperado.

## UC-01 — Criar mesa

**FA-01 — Modo A sem chave PIX.** Criador escolhe recebedor fixo e não informa chave. → Criação bloqueada com mensagem clara (RN-003). Pode trocar para modo B/C ou informar a chave.

**FA-02 — Abandono no meio da criação.** Visitante fecha o app antes de confirmar. → Nada é persistido; não existem mesas "fantasma".

## UC-02 — Entrar em mesa

**FA-03 — Código inexistente.** Código digitado não corresponde a mesa alguma. → Erro "mesa não encontrada", campo mantido para correção.

**FA-04 — Mesa não aberta.** Mesa existe mas está `FECHANDO` ou `FECHADA`. → Entrada recusada (RN-006); se `FECHADA`, oferece o modo leitura (UC-11) em vez de entrar como participante.

**FA-05 — Nome duplicado.** Nome já usado na mesa (inclusive por quem saiu — o nome segue reservado no resumo). → Sistema rejeita e sugere variação (RN-007).

## UC-03 — Adicionar item manual

**FA-06 — Dados inválidos.** Quantidade ≤ 0, valor unitário < 1 centavo ou descrição vazia/longa. → Validação bloqueia com erro por campo (RN-020).

**FA-07 — Mesa congelou durante a digitação.** Fechamento começou enquanto o formulário estava aberto. → Envio rejeitado com `MESA_CONGELADA` (RN-033); item não criado; usuário informado.

## UC-04 — Importar itens via NFC-e

**FA-08 — QR Code ilegível ou não é NFC-e.** Câmera não lê, ou o QR não aponta para nota. → Mensagem clara + opções: tentar de novo, colar URL, ou **entrada manual** (RN-061).

**FA-09 — SEFAZ indisponível ou formato desconhecido.** A página da nota não responde ou o layout não é reconhecido pelo parser. → Mesmo tratamento do FA-08: nunca beco sem saída (RN-061).

**FA-10 — Revisão esvaziada.** Usuário exclui todos os itens extraídos na revisão. → Nada é inserido na mesa; retorna à tela da mesa.

## UC-05 — Editar ou remover item

**FA-11 — Remoção de item distribuído.** Item já tinha partes atribuídas. → Confirmação explícita ("isso remove o consumo de N pessoas"); ao confirmar, item e distribuições somem e o resumo recalcula (RN-026).

**FA-12 — Redução de quantidade abaixo do atribuído.** Nova quantidade < soma das quantidades distribuídas. → Distribuições mantidas até o limite pela ordem de atribuição; excedente volta a "sem dono" e o app sinaliza o ajuste (RN-026).

## UC-06 — Distribuir consumo

**FA-13 — Atribuição a participante que saiu.** Alvo está `SAIU`. → Rejeitada (RN-010); a UI nem oferece participantes `SAIU` como alvo.

**FA-14 — Quantidade excede o item.** Soma das quantidades atribuídas ultrapassaria a quantidade do item. → Rejeitada com erro indicando o disponível (I-I2).

**FA-15 — Conflito simultâneo.** Dois participantes editam a distribuição do mesmo item ao mesmo tempo. → Vence a última escrita confirmada pelo servidor; todos convergem via realtime; nenhuma combinação viola a conservação (I-S1).

## UC-07 — Sair da mesa

**FA-16 — Criador sai.** Participante que sai é o criador. → Papel migra atomicamente ao ativo mais antigo (RN-008); todos notificados. Se ele era também o recebedor fixo (modo A) e há dúvida sobre manter a chave: a chave permanece — quem saiu continua sendo o recebedor (sua dívida/crédito não se apaga, RN-009).

**FA-17 — Último participante ativo sai.** Mesa `ABERTA` ficaria sem ativos. → Permitido; a mesa permanece `ABERTA` e acessível pelo link/código; quem entrar depois torna-se criador.

## UC-08 — Fechar a conta

**FA-18 — Sem consumo.** Nenhum participante tem parte atribuída e não há itens. → Fechamento bloqueado (RN-030).

**FA-19 — Itens sem dono.** Validação encontra valor não distribuído. → Pergunta obrigatória: *dividir igualmente entre todos os participantes com consumo* ou *cancelar e voltar* (RN-032). Escolhendo dividir, o rateio usa o motor (RN-041/042).

**FA-20 — Modo B sem recebedor.** Criador tenta confirmar sem indicar quem pagou o estabelecimento. → Bloqueado até indicar recebedor e chave PIX (RN-003).

**FA-21 — Falha durante FECHANDO.** Erro ao calcular ou gravar pagamentos (ex.: queda de conexão do servidor). → Transação revertida: nenhum pagamento persiste, mesa volta a `ABERTA`, erro exibido ao criador (RN-034). Reexecutar o fechamento é seguro (idempotente do zero).

**FA-22 — Edição durante FECHANDO.** Qualquer participante tenta editar itens/distribuição com a mesa congelada. → Rejeitada com `MESA_CONGELADA` (RN-033); UI mostra estado "fechando…" para todos.

## UC-09 — Pagar (modos A/B)

**FA-23 — Recebedor rejeita.** Devedor marcou "paguei", recebedor não identificou o PIX. → Recebedor marca "não recebi": pagamento volta a `PENDENTE` e o devedor é notificado (máquina do pagamento).

**FA-24 — App do banco não lê o QR.** → O copia e cola está sempre disponível como alternativa equivalente (RN-050); valor também exibido por extenso para transferência manual.

## UC-10 — Pagar (modo C)

**FA-25 — Sem chave do estabelecimento.** Mesa em modo C sem chave PIX cadastrada. → Tela mostra apenas o valor exato ("pague no caixa — PIX, cartão ou outro meio") e o botão "Já paguei" (RN-053).

## UC-11 — Acompanhar mesa fechada

**FA-26 — Tentativa de escrita em mesa fechada.** Qualquer operação além de status de pagamento (RN-052). → Rejeitada com `MESA_NAO_ABERTA` (RN-005); UI em modo somente leitura não oferece essas ações.

## Exceções transversais (valem para todos os casos)

**FA-90 — Perda de conexão do cliente.** Ações locais falham ou ficam pendentes conforme estratégia offline (FASE 01); ao reconectar, o cliente **ressincroniza o estado completo** antes de retomar eventos incrementais.

**FA-91 — Evento duplicado/fora de ordem.** A camada realtime é idempotente: aplicar duas vezes ou em ordem trocada não corrompe o estado local (FASE 05).

**FA-92 — Link compartilhado com estranhos.** Qualquer pessoa com o código/link entra na mesa aberta (modelo de confiança da mesa física). Mitigação no MVP: código não sequencial e mesa fechada não aceita novos participantes (FA-04).
