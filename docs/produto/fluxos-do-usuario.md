# Fluxos do Usuário — ContaFácil

Jornadas completas do produto, na perspectiva de quem usa. Os desvios e exceções de cada fluxo estão em `fluxos-alternativos.md`; a formalização com atores e pré/pós-condições está em `casos-de-uso.md`.

## F1 — Criar mesa

**Persona:** quem puxa a organização da conta (vira `CRIADOR`).

1. Abre o ContaFácil (Home) e toca em **Nova Mesa**.
2. Dá um nome à mesa (opcional, ex.: "Bar do Zé — sexta").
3. Escolhe o **modo de acerto** (RN-002):
   - **A — Recebedor fixo:** informa sua chave PIX agora (obrigatória, RN-003).
   - **B — Recebedor no fechamento:** nada a informar agora.
   - **C — Pagamento direto:** informa a chave PIX do estabelecimento (opcional).
4. Ajusta a **taxa de serviço** se quiser (padrão 10%, RN-004).
5. Informa seu nome de participante (RN-007).
6. Mesa criada `ABERTA` com código e link (RN-001). Tela da mesa exibe o código em destaque para compartilhar.

## F2 — Entrar em mesa

**Persona:** convidado (vira `MEMBRO`).

1. Recebe o link (`contafacil.app/m/7GXK2M`) ou o código falado na mesa.
2. Abre o link — ou abre a Home e toca em **Entrar em Mesa**, digitando o código.
3. Informa seu nome (único na mesa, RN-007).
4. Entra na tela da mesa; todos os presentes veem "Fulano entrou" em tempo real.

## F3 — Adicionar itens

**Persona:** qualquer participante ativo, mesa `ABERTA`.

**Manual:**
1. Na tela da mesa, toca em **Adicionar item**.
2. Preenche descrição, quantidade e valor unitário (RN-020).
3. Item aparece para todos em tempo real.

**Via NFC-e (RN-060):**
1. Toca em **Escanear nota**.
2. Aponta a câmera para o QR Code da NFC-e (ou cola a URL da nota).
3. Revê os itens extraídos — edita/exclui o que quiser.
4. Confirma; os itens entram na mesa como qualquer item.

## F4 — Distribuir consumo

**Persona:** qualquer participante ativo, mesa `ABERTA`.

1. Toca em um item (ou arrasta-o sobre um participante).
2. Escolhe o modo: **Todos** (um toque, snapshot dos ativos — RN-023), **Pessoa** ou **Grupo** (seleciona os participantes).
3. Refina se necessário: **quantidade** (ex.: 3 fatias para Ana) ou **proporção** (pesos) — RN-024.
4. O resumo por participante atualiza para todos em tempo real; itens parcialmente distribuídos ficam sinalizados (RN-025).

## F5 — Sair da mesa

**Persona:** participante ativo que vai embora antes do fechamento.

1. Toca em **Sair da mesa** e confirma, vendo sua parte atual (ex.: "Você deve R$ 38,50 até agora").
2. Passa a `SAIU`: consumo e dívida permanecem (RN-009); não recebe novas distribuições (RN-010).
3. Se era o criador, o papel migra automaticamente (RN-008).
4. Mantém acesso de leitura à mesa pelo link — verá seu pagamento após o fechamento.

## F6 — Fechar a conta

**Persona:** `CRIADOR`, mesa `ABERTA`.

1. Toca em **Fechar conta**.
2. **Validação (RN-030/032):** se há itens sem dono, o app pergunta — *dividir entre todos* ou *voltar e distribuir*.
3. No modo **B**, seleciona quem pagou o estabelecimento (recebedor) e a chave PIX dele (RN-003).
4. Confirma o resumo (consumo + taxa por participante). Mesa entra em `FECHANDO`: congela para todos (RN-033).
5. Motor matemático calcula as partes finais com arredondamento e compensação (RN-040..044).
6. Pagamentos são gerados (RN-035) e a mesa vira `FECHADA` — atômico (RN-034).
7. Todos veem a tela de mesa fechada: parte de cada um e status dos pagamentos.

## F7 — Pagar

**Persona:** participante com pagamento `PENDENTE`, mesa `FECHADA`.

**Modos A/B:**
1. Abre seu pagamento: valor exato + PIX **copia e cola** + **QR Code** (RN-050).
2. Paga no app do banco e toca em **Já paguei** → `INFORMADO` (RN-051).
3. O recebedor vê a informação e toca em **Recebi** → `PAGO` (ou **Não recebi** → volta a `PENDENTE`).
4. Status muda em tempo real para todos (RN-052).

**Modo C:**
1. Abre sua parte: valor exato; se houver chave do estabelecimento, PIX copia e cola + QR Code; senão, apenas o valor (RN-053).
2. Paga ao estabelecimento — PIX, **cartão** ou outro meio — e toca em **Já paguei** → `PAGO` (RN-051).

## F8 — Acompanhar a mesa fechada

**Persona:** qualquer participante (inclusive quem saiu).

1. Acessa a mesa pelo link a qualquer momento.
2. Vê, somente leitura: itens, distribuição, parte de cada um, status de cada pagamento (RN-005/052).
3. A mesa está quitada quando todos os pagamentos estão `PAGO`.

## Mapa geral

```text
Home ──► Nova Mesa (F1) ──► Mesa ABERTA ◄── Entrar Mesa (F2) ◄── link/código
                              │
              Adicionar itens (F3: manual/NFC-e)
                              │
              Distribuir consumo (F4: todos/pessoa/grupo)
                              │        ▲
                       Sair (F5) ──────┘ (consumo permanece)
                              │
                     Fechar conta (F6)
                              │
                       Mesa FECHADA
                              │
                        Pagar (F7: PIX/cartão)
                              │
                    Acompanhar até quitar (F8)
```
