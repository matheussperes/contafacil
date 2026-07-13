# Casos de Uso — ContaFácil

Formalização dos fluxos (`fluxos-do-usuario.md`). Atores: **Visitante** (ainda não está na mesa), **Participante** (ativo na mesa), **Criador** (participante com papel `CRIADOR`), **Recebedor** (modos A/B, após definido), **Sistema**.

Fluxos alternativos e exceções de cada caso estão em `fluxos-alternativos.md` (referências FA-XX).

---

## UC-01 — Criar mesa

- **Ator:** Visitante
- **Pré-condições:** nenhuma.
- **Fluxo principal:**
  1. Visitante escolhe "Nova Mesa".
  2. Informa nome da mesa (opcional), modo de acerto, taxa de serviço (padrão 10%) e, se modo A, sua chave PIX; se modo C, a chave do estabelecimento (opcional).
  3. Informa seu nome de participante.
  4. Sistema cria a mesa `ABERTA`, gera `joinCode` e link, registra o visitante como participante `ATIVO`/`CRIADOR`.
- **Pós-condições:** mesa `ABERTA` com 1 participante (criador); código/link exibidos.
- **Regras:** RN-001, RN-002, RN-003, RN-004, RN-007.
- **Alternativos:** FA-01, FA-02.

## UC-02 — Entrar em mesa

- **Ator:** Visitante
- **Pré-condições:** mesa existe e está `ABERTA`.
- **Fluxo principal:**
  1. Visitante acessa o link ou digita o código.
  2. Sistema localiza a mesa e solicita o nome.
  3. Visitante informa nome único na mesa.
  4. Sistema registra participante `ATIVO`/`MEMBRO` e propaga "Pessoa entrou" em tempo real.
- **Pós-condições:** participante na mesa; presente na lista de todos os clientes conectados.
- **Regras:** RN-006, RN-007.
- **Alternativos:** FA-03, FA-04, FA-05.

## UC-03 — Adicionar item manual

- **Ator:** Participante
- **Pré-condições:** mesa `ABERTA`.
- **Fluxo principal:**
  1. Participante abre "Adicionar item" e informa descrição, quantidade e valor unitário.
  2. Sistema valida (RN-020), cria o item (origem `MANUAL`) e propaga "Item criado".
- **Pós-condições:** item na mesa, sem distribuição ("sem dono").
- **Regras:** RN-006, RN-020, RN-021.
- **Alternativos:** FA-06, FA-07.

## UC-04 — Importar itens via NFC-e

- **Ator:** Participante
- **Pré-condições:** mesa `ABERTA`; dispositivo com câmera ou URL da nota.
- **Fluxo principal:**
  1. Participante escaneia o QR Code da NFC-e (ou cola a URL).
  2. Sistema obtém e interpreta a nota, monta a lista normalizada de itens.
  3. Participante revisa: edita/exclui itens extraídos.
  4. Participante confirma; sistema cria os itens (origem `NFCE`) e propaga.
- **Pós-condições:** itens confirmados na mesa, indistinguíveis dos manuais.
- **Regras:** RN-020, RN-021, RN-060, RN-061.
- **Alternativos:** FA-08, FA-09, FA-10.

## UC-05 — Editar ou remover item

- **Ator:** Participante
- **Pré-condições:** mesa `ABERTA`; item existe.
- **Fluxo principal:**
  1. Participante altera descrição/quantidade/valor, ou remove o item.
  2. Sistema aplica os efeitos sobre distribuições (RN-026) e propaga "Item editado".
- **Pós-condições:** item atualizado/removido; distribuições consistentes; resumo recalculado.
- **Regras:** RN-006, RN-020, RN-026.
- **Alternativos:** FA-11, FA-12.

## UC-06 — Distribuir consumo

- **Ator:** Participante
- **Pré-condições:** mesa `ABERTA`; item existe.
- **Fluxo principal:**
  1. Participante seleciona o item (toque, drag & drop ou clique rápido).
  2. Escolhe modo `TODOS` / `PESSOA` / `GRUPO` e, se necessário, refina por quantidade ou proporção.
  3. Sistema valida (I-I2, I-D1), grava a distribuição e propaga "Consumo atualizado".
  4. Resumo por participante recalculado pelo motor (RN-041..043).
- **Pós-condições:** partes atualizadas; conservação garantida (I-S1).
- **Regras:** RN-022, RN-023, RN-024, RN-025, RN-010.
- **Alternativos:** FA-13, FA-14, FA-15.

## UC-07 — Sair da mesa

- **Ator:** Participante
- **Pré-condições:** mesa `ABERTA`; participante `ATIVO`.
- **Fluxo principal:**
  1. Participante toca "Sair da mesa"; sistema mostra sua parte atual.
  2. Participante confirma.
  3. Sistema marca `SAIU` (preservando consumo), migra o papel de criador se preciso, e propaga "Pessoa saiu".
- **Pós-condições:** participante `SAIU`; consumo/dívida intactos; mesa segue com um criador ativo.
- **Regras:** RN-008, RN-009, RN-010.
- **Alternativos:** FA-16, FA-17.

## UC-08 — Fechar a conta

- **Ator:** Criador
- **Pré-condições:** mesa `ABERTA`; ≥1 participante com consumo; ≥1 item.
- **Fluxo principal:**
  1. Criador toca "Fechar conta".
  2. Sistema valida itens sem dono; se houver, criador escolhe *dividir entre todos* (RN-032).
  3. No modo B, criador indica o recebedor e a chave PIX dele.
  4. Criador confirma o resumo; sistema transita `ABERTA → FECHANDO` (congela a mesa) e propaga.
  5. Motor matemático calcula as partes finais (consumo + taxa, RN-040..044).
  6. Sistema gera os pagamentos (RN-035) e transita `FECHANDO → FECHADA` atomicamente (RN-034), propagando "Mesa fechada".
- **Pós-condições:** mesa `FECHADA`; pagamentos `PENDENTE` criados; invariantes RN-036 válidas.
- **Regras:** RN-030..036, RN-003.
- **Alternativos:** FA-18..FA-22.

## UC-09 — Pagar (modos A/B)

- **Atores:** Participante devedor; Recebedor
- **Pré-condições:** mesa `FECHADA`; pagamento `PENDENTE` do devedor.
- **Fluxo principal:**
  1. Devedor abre o pagamento: valor, PIX copia e cola e QR Code (RN-050).
  2. Devedor paga no banco e marca "Já paguei" → `INFORMADO`.
  3. Recebedor confirma "Recebi" → `PAGO`.
  4. Cada mudança propaga em tempo real (RN-052).
- **Pós-condições:** pagamento `PAGO`.
- **Regras:** RN-050, RN-051, RN-052.
- **Alternativos:** FA-23, FA-24.

## UC-10 — Pagar (modo C)

- **Ator:** Participante
- **Pré-condições:** mesa `FECHADA` em modo C; pagamento `PENDENTE` do participante.
- **Fluxo principal:**
  1. Participante abre sua parte: valor exato; PIX do estabelecimento se houver chave (RN-053).
  2. Paga ao estabelecimento (PIX, cartão ou outro meio).
  3. Marca "Já paguei" → `PAGO`; propaga em tempo real.
- **Pós-condições:** pagamento `PAGO`.
- **Regras:** RN-050, RN-051, RN-052, RN-053.
- **Alternativos:** FA-25.

## UC-11 — Acompanhar mesa fechada

- **Ator:** Participante (inclusive `SAIU`)
- **Pré-condições:** mesa `FECHADA`; ator tem o link.
- **Fluxo principal:**
  1. Ator acessa a mesa e vê, somente leitura: itens, distribuição, partes e status dos pagamentos.
- **Pós-condições:** nenhuma mudança de estado.
- **Regras:** RN-005, RN-052.
- **Alternativos:** FA-26.
