# Critérios de Aceite — ContaFácil

Cenários verificáveis no formato **Dado / Quando / Então**, cobrindo 100% das regras de negócio numeradas (`regras-de-negocio.md`). Identificador: `CA-<RN>` (+ sufixo quando há mais de um cenário para a mesma regra). Estes cenários alimentarão os testes automatizados das fases de implementação.

## Mesa

**CA-001 — Criação da mesa**
Dado que um visitante confirma a criação de uma mesa válida,
Quando o sistema a cria,
Então a mesa está `ABERTA`, com código único de 6 caracteres sem `0/O/1/I` e link de convite equivalente.

**CA-002 — Troca de modo de acerto**
Dado uma mesa `ABERTA` no modo A,
Quando o criador troca para o modo C,
Então a mudança é aceita; e Quando a mesa está `FECHANDO` ou `FECHADA`, Então qualquer troca de modo é rejeitada.

**CA-003a — Modo A exige chave**
Dado um visitante criando mesa no modo A sem informar chave PIX,
Quando confirma,
Então a criação é bloqueada com erro indicando a chave obrigatória.

**CA-003b — Modo C sem chave é válido**
Dado uma mesa em modo C sem chave do estabelecimento,
Quando um pagamento é exibido após o fechamento,
Então aparece apenas o valor exato, sem QR Code, com marcação manual de pago disponível.

**CA-004 — Taxa configurável**
Dado uma mesa `ABERTA` com taxa padrão de 10%,
Quando o criador define 0% (ou 12,5%),
Então a taxa é aceita; e valores fora de [0%, 100%] ou com mais de 2 casas decimais são rejeitados.

**CA-005 — Mesa fechada é somente leitura**
Dado uma mesa `FECHADA`,
Quando qualquer participante tenta adicionar item, distribuir consumo ou entrar como novo participante,
Então a operação é rejeitada com `MESA_NAO_ABERTA`, e não existe operação de reabertura.

**CA-006 — Janela de edição**
Dado uma mesa em `FECHANDO`,
Quando alguém tenta entrar, criar/editar item ou alterar distribuição,
Então a operação é rejeitada com `MESA_CONGELADA`.

## Participantes

**CA-007 — Nome obrigatório e único**
Dado uma mesa com participante "Ana",
Quando alguém tenta entrar como "ana" (ou com nome vazio/31+ caracteres),
Então a entrada é rejeitada com pedido de outro nome.

**CA-008 — Migração do papel de criador**
Dado uma mesa com criador Ana (1ª a entrar) e membros Bruno (2º) e Caio (3º),
Quando Ana sai,
Então Bruno passa a ser o criador, na mesma operação da saída.

**CA-009 — Saída preserva consumo**
Dado que Carla tem R$ 35,00 de consumo atribuído,
Quando Carla sai da mesa e a mesa é fechada com taxa de 10%,
Então existe pagamento de R$ 38,50 em nome de Carla.

**CA-010 — Quem saiu não recebe novas distribuições**
Dado que Carla está `SAIU`,
Quando um item é distribuído no modo `TODOS` ou alguém tenta atribuir-lhe consumo,
Então Carla não é incluída e a atribuição direta é rejeitada.

## Itens e distribuição

**CA-020 — Validação de item**
Dado um formulário de item,
Quando é submetido com quantidade 0, valor unitário 0 centavos ou descrição vazia,
Então cada caso é rejeitado; e com quantidade 4 × unitário 1.590,
Então o total é 6.360 centavos.

**CA-021 — Origem informativa**
Dado um item importado da NFC-e,
Quando ele é distribuído, editado ou removido,
Então o comportamento é idêntico ao de um item manual.

**CA-022 — Três modos de distribuição**
Dado um item e participantes ativos {Ana, Bruno, Caio},
Quando distribuído em `TODOS`, `PESSOA` (Ana) e `GRUPO` ({Ana, Bruno}),
Então as partes são, respectivamente: divididas entre os três; 100% de Ana; divididas entre Ana e Bruno.

**CA-023 — Snapshot do "Todos"**
Dado um item distribuído em `TODOS` quando havia 4 ativos,
Quando Dani entra na mesa depois,
Então o item permanece dividido entre os 4 originais até reatribuição explícita.

**CA-024 — Quantidade e proporção**
Dado uma pizza de 8 fatias (item quantidade 8),
Quando Ana recebe 3, Bruno 3 e Caio 2,
Então as partes respeitam 3/8, 3/8 e 2/8 do total; e uma atribuição por proporção com pesos 2:1 divide na razão 2/3 e 1/3.

**CA-025 — Item parcialmente distribuído**
Dado um item de R$ 90,00 com R$ 60,00 atribuídos,
Quando a mesa é exibida,
Então o item aparece sinalizado com "R$ 30,00 sem dono".

**CA-026a — Remoção remove distribuições**
Dado um item distribuído entre 3 pessoas,
Quando o item é removido (com confirmação),
Então as partes das 3 pessoas são recalculadas sem o item.

**CA-026b — Redução abaixo do atribuído**
Dado um item de 4 unidades com as 4 atribuídas,
Quando a quantidade é editada para 3,
Então permanecem 3 unidades atribuídas pela ordem de atribuição e o excedente volta a "sem dono".

## Fechamento

**CA-030 — Pré-condições do fechamento**
Dado uma mesa sem itens ou sem participantes com consumo,
Quando o criador tenta fechar,
Então o fechamento é bloqueado.

**CA-031 — Só o criador fecha**
Dado um participante `MEMBRO`,
Quando ele tenta iniciar o fechamento ou alterar a taxa,
Então a operação é rejeitada.

**CA-032 — Itens sem dono no fechamento**
Dado uma mesa com R$ 43,00 não distribuídos,
Quando o criador inicia o fechamento,
Então o sistema lista os itens sem dono e exige a escolha: dividir igualmente entre os participantes com consumo, ou cancelar e voltar — não existe terceiro caminho.

**CA-033 — Congelamento em FECHANDO**
Dado uma mesa que entrou em `FECHANDO`,
Quando qualquer participante tenta qualquer edição,
Então é rejeitada com `MESA_CONGELADA` e todos os clientes exibem o estado "fechando".

**CA-034 — Atomicidade**
Dado um fechamento em que a gravação do 3º de 5 pagamentos falha,
Quando a transação termina,
Então nenhum pagamento existe, a mesa está `ABERTA` e um novo fechamento pode ser executado com sucesso.

**CA-035a — Pagamentos nos modos A/B**
Dado mesa modo B com total R$ 220,00, recebedor Ana (parte R$ 60,00), Bruno (R$ 90,00) e Caio (R$ 70,00),
Quando a mesa fecha,
Então existem exatamente 2 pagamentos — Bruno R$ 90,00 e Caio R$ 70,00, ambos para Ana — e nenhum para Ana.

**CA-035b — Pagamentos no modo C**
Dado a mesma mesa em modo C,
Quando fecha,
Então existem 3 pagamentos (Ana R$ 60,00, Bruno R$ 90,00, Caio R$ 70,00) devidos ao estabelecimento.

**CA-036 — Conservação no fechamento**
Dado qualquer mesa fechada,
Quando se somam as partes individuais,
Então o resultado é exatamente o total da mesa; e a soma dos pagamentos é `total − parte do recebedor` (A/B) ou `total` (C).

## Cálculo financeiro

**CA-040 — Centavos inteiros**
Dado qualquer valor monetário no sistema,
Quando ele é armazenado, transmitido ou calculado,
Então é um inteiro em centavos — nenhuma operação financeira usa ponto flutuante.

**CA-041 — Maior resto**
Dado 100 centavos divididos igualmente entre 3 participantes,
Quando o motor calcula,
Então as partes são {34, 33, 33} e somam exatamente 100.

**CA-042 — Desempate determinístico**
Dado o cenário do CA-041 com Ana (1ª), Bruno (2º) e Caio (3º) empatados na fração,
Quando o motor calcula (quantas vezes for),
Então Ana recebe 34 — sempre, em qualquer dispositivo.

**CA-043 — Conservação por item**
Dado um item de 1.000 centavos dividido entre 3,
Quando o motor calcula,
Então as partes somam 1.000; e para qualquer conjunto de itens e distribuições (teste de propriedade), a soma das partes é igual ao subtotal da mesa.

**CA-044 — Taxa proporcional**
Dado taxa de 10% e consumos de 6.000, 3.000 e 1.000 centavos,
Quando o motor calcula,
Então as taxas individuais são 600, 300 e 100, e a soma das taxas é igual à taxa total da mesa.

## Pagamentos e PIX

**CA-050 — BR Code válido**
Dado um pagamento de R$ 38,50 para chave conhecida,
Quando o payload é gerado,
Então é um BR Code EMV estático com valor 38.50 e CRC16 correto, validado contra vetores conhecidos do padrão e aceito por app bancário real.

**CA-051a — Ciclo A/B**
Dado um pagamento `PENDENTE` no modo B,
Quando o devedor marca "paguei" e o recebedor marca "recebi",
Então o pagamento passa por `INFORMADO` e termina `PAGO`; e somente o devedor pode informar, somente o recebedor pode confirmar ou rejeitar (rejeição → `PENDENTE`).

**CA-051b — Ciclo C**
Dado um pagamento `PENDENTE` no modo C,
Quando o participante marca "paguei",
Então o pagamento vai direto a `PAGO`.

**CA-052 — Única escrita pós-fechamento**
Dado uma mesa `FECHADA`,
Quando um status de pagamento muda,
Então a mudança é aceita e propagada em tempo real a todos os clientes; qualquer outra escrita é rejeitada.

**CA-053 — Modo C por cartão**
Dado mesa modo C sem chave PIX do estabelecimento,
Quando o participante abre sua parte,
Então vê o valor exato para pagar por cartão/outro meio e consegue marcá-lo como pago.

## NFC-e

**CA-060 — Importação com revisão**
Dado um QR Code de NFC-e válida com 12 itens,
Quando o participante escaneia, exclui 1 item na revisão e confirma,
Então exatamente 11 itens entram na mesa com origem `NFCE`.

**CA-061 — Fallback garantido**
Dado cada falha possível (QR ilegível, URL que não é nota, SEFAZ indisponível, layout desconhecido),
Quando ela ocorre,
Então o usuário recebe mensagem clara e chega à entrada manual funcional — nenhum estado travado.

---

## Rastreabilidade

| Grupo de RN | Cenários |
|-------------|----------|
| RN-001..006 (Mesa) | CA-001, CA-002, CA-003a/b, CA-004, CA-005, CA-006 |
| RN-007..010 (Participantes) | CA-007, CA-008, CA-009, CA-010 |
| RN-020..026 (Itens/distribuição) | CA-020..CA-025, CA-026a/b |
| RN-030..036 (Fechamento) | CA-030..CA-034, CA-035a/b, CA-036 |
| RN-040..044 (Cálculo) | CA-040..CA-044 |
| RN-050..053 (Pagamentos/PIX) | CA-050, CA-051a/b, CA-052, CA-053 |
| RN-060..061 (NFC-e) | CA-060, CA-061 |

Cobertura: **35/35 regras de negócio** com pelo menos um cenário.
