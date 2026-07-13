# Documento de Visão — ContaFácil

## O problema

Dividir a conta em bares e restaurantes é um ritual desconfortável: alguém fotografa a comanda, outro abre a calculadora, discute-se quem tomou quantas cervejas, a taxa de serviço é rateada "no olho" e sempre sobra ou falta dinheiro. O resultado é lento, impreciso e socialmente constrangedor — especialmente em mesas grandes, com pessoas chegando e saindo ao longo da noite.

## O público-alvo

Grupos de amigos, colegas de trabalho e famílias que frequentam bares e restaurantes no Brasil e dividem a conta ao final. O usuário típico:

- está no celular, com conexão instável (bar cheio, 4G ruim);
- não quer instalar app nem criar cadastro para uma única noite;
- quer saber **exatamente** quanto deve e pagar em segundos via PIX ou cartão.

## A proposta de valor

**Uma mesa virtual compartilhada, em tempo real, que fecha a conta sem sobrar nem faltar um centavo.**

1. **Zero atrito** — criar uma mesa e convidar por link/código, sem cadastro.
2. **Tempo real** — todos veem os mesmos itens, participantes e valores, ao vivo.
3. **Matemática honesta** — divisão por item (todos, pessoa ou grupo), quantidade ou proporção, com arredondamento determinístico e compensação de centavos: a soma das partes é **sempre** igual ao total.
4. **Fechamento sem discussão** — a mesa fecha em uma transação: valida, calcula, gera os pagamentos.
5. **Pagamento em segundos** — PIX estático (copia e cola + QR Code) conforme o modo de acerto da mesa; no pagamento direto ao estabelecimento, o app entrega o valor exato para pagar por PIX **ou cartão**.
6. **Conta importada, não digitada** — scanner do QR Code da NFC-e traz os itens da nota; se falhar, entrada manual sempre disponível.

## Os três modos de acerto

O ContaFácil suporta três formas de acertar a conta, escolhidas na criação da mesa:

| Modo | Nome | Como funciona |
|------|------|----------------|
| A | **Recebedor fixo** | Quem cria a mesa cadastra sua chave PIX. Ele paga a conta inteira ao estabelecimento e os demais o reembolsam via PIX. |
| B | **Recebedor no fechamento** | Qualquer participante pode se declarar "quem pagou o restaurante" na hora do fechamento; os pagamentos são gerados em favor dele. |
| C | **Pagamento direto** | Cada participante paga sua parte diretamente ao estabelecimento — via PIX (se a chave do estabelecimento for informada) ou **cartão de crédito/outro meio**. O papel do app é entregar o valor exato de cada um; o pagamento é marcado manualmente como pago. |

## O que o produto É

- Um **PWA** (funciona no navegador, instalável, tolerante a conexão ruim).
- Uma ferramenta de **divisão e acerto** entre pessoas de uma mesa.
- Colaborativo e em **tempo real** por natureza.
- **Anônimo por sessão**: identidade = nome escolhido ao entrar na mesa.

## O que o produto NÃO é

- **Não é meio de pagamento**: não processa transações, não tem integração bancária, não usa PIX dinâmico. O PIX é estático; a confirmação de pagamento é declaração manual.
- **Não é comanda eletrônica do estabelecimento**: o restaurante não é usuário do sistema.
- **Não é rede social**: sem perfis, sem histórico entre mesas, sem cadastro no MVP.
- **Não é sistema fiscal**: a NFC-e é apenas fonte de importação de itens.

## Métricas de sucesso (norte do produto)

- Tempo entre "abrir a mesa" e "todos sabem quanto devem" < 2 minutos após pedir a conta.
- Zero divergência: soma das partes = total da conta em 100% dos fechamentos.
- Um participante convidado entra na mesa em < 30 segundos, sem cadastro.
