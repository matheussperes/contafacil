# Scanner NFC-e — FASE 11

Importa itens da nota fiscal: **QR/URL → parser → revisão → mesa**, com
fallback manual garantido em qualquer falha (RN-060/061).

## Peças

- `application/nfce/nfce-types.ts` — contrato normalizado (`ParsedNfceItem`
  em centavos/mili) e `NfceParseResult` (ok | reason). Vive na aplicação:
  é o contrato entre parser e UI, não detalhe de infra (ADR-004).
- `infrastructure/nfce/nfce-parser.ts` — parser **tolerante a UF**: varre
  as linhas da nota por padrões comuns (Qtde/Vl. Unit./descrição) em vez
  de depender do layout exato de cada estado; converte tudo para inteiros
  sem float. Nunca lança — classifica a falha.
- `app/api/nfce/route.ts` — proxy server-side (contorna CORS da SEFAZ):
  busca a página e devolve JSON normalizado; cabeçalhos de navegador real
  (User-Agent Chrome, Accept, Accept-Language — WAFs de SEFAZ costumam
  bloquear requisições que parecem robô); timeout de 12s (`maxDuration=15`
  na função); não repassa HTML cru nem loga a URL (só host + status/erro,
  via `console.warn`, para diagnóstico nos logs da Vercel).
- `infrastructure/nfce/http-nfce-gateway.ts` — cliente do port; toda falha
  de rede vira `SEFAZ_INDISPONIVEL`.
- `ui/features/scanner/QrScanner.tsx` — sempre tenta abrir a câmera
  primeiro. Decodifica via `BarcodeDetector` nativo quando o navegador
  suporta (Chrome/Edge); nos demais (Safari/iOS, Firefox — sem suporte a
  essa API), decodifica os frames via `<canvas>` + `jsqr`, que funciona em
  qualquer navegador. Só cai no modo manual (colar URL) se a câmera
  falhar de verdade (permissão negada, sem câmera, `getUserMedia`
  ausente) — nunca por falta de suporte a uma API específica.
- `ui/features/scanner/ScannerSheet.tsx` — orquestra scan → revisão →
  inserção pelo **mesmo CRUD** (`item.addMany`, origem NFCE); qualquer
  falha volta ao passo com a opção "adicionar manualmente".

## Garantias (RN-061)

Todas as 4 falhas classificadas (QR inválido, SEFAZ fora, formato
desconhecido, sem itens) levam à mesma tela com a saída manual. Itens
importados entram pelo mesmo caminho dos manuais — indistinguíveis para o
resto do sistema (RN-021), verificado no motor e nos testes de item.

## Testes

`nfce-parser.test.ts` (7): conversões BR/US sem float, `isNfceUrl`, dois
layouts de UF (SP com total, MG com quantidade fracionária sem total) e as
falhas SEM_ITENS/FORMATO_DESCONHECIDO. Total do projeto: 119 testes verdes.

## Correção pós-deploy: câmera não abria em alguns navegadores

A primeira versão usava só `BarcodeDetector` e, quando a API não existia
no navegador, pulava direto para o modo manual **sem sequer pedir a
câmera** — o que acontecia em praticamente todo iPhone (Safari não
implementa essa API) e no Firefox. Corrigido adicionando `jsqr` como
decodificador via canvas para esses casos; a câmera agora abre sempre que
existir e há permissão, em qualquer navegador.

## Correção pós-deploy: "não conseguimos falar com a SEFAZ"

O proxy usava `User-Agent: Mozilla/5.0 ContaFacil` — uma string que se
autoidentifica como robô, e WAFs de portais de SEFAZ costumam bloquear
requisições fora do padrão de navegador. Trocado por um User-Agent real de
Chrome + `Accept`/`Accept-Language`, com timeout maior e log de
diagnóstico (host + status/erro, sem a URL) para investigar via Vercel.

**Limite conhecido, não totalmente resolvido por código**: a região de
função (`gru1`, São Paulo) definida em `vercel.json` só é honrada nos
planos Pro/Enterprise da Vercel — no plano **Hobby**, a função roda de um
datacenter nos EUA independente da configuração. Sites de governo
brasileiros costumam ter bloqueio/lentidão maior para tráfego de fora do
país. Se o erro persistir após esta correção, é o indício mais provável;
confirmar olhando os logs da função (`Vercel → Deployments → Functions →
/api/nfce`) para ver se aparece status HTTP (bloqueio) ou timeout (rede
lenta). Resolver de vez exigiria rodar a busca a partir de uma região
brasileira (plano Pro, ou um relay externo) — decisão de infraestrutura,
não só de código.

## Correção pós-deploy: desconto de item promocional não era aplicado

Dois bugs juntos faziam o valor final ficar sempre com o preço de tabela,
ignorando qualquer desconto por item da nota:

1. O parser só lia `Vl. Unit.` (preço de tabela) e `Vl. Total`; nunca
   procurava por uma linha `Desconto`, então quando a nota só informava o
   desconto (sem repetir o total já líquido), ele passava batido.
2. Mesmo quando `totalCents` era capturado corretamente, o `ScannerSheet`
   **descartava esse valor** ao inserir o item na mesa — sempre recalculava
   `quantidade × preço de tabela`, sem nunca usar o total líquido.

Corrigido em duas frentes:

- `parseNfceHtml` agora também procura `Desconto`/`Vl. Desconto` por item
  e, quando não há `Vl. Total` explícito, deriva o líquido
  (`qtde×unitário − desconto`); quando há `Vl. Total`, ele já costuma vir
  líquido na maioria dos portais e é usado como está.
- Nova função `effectiveUnitPriceCents`: deriva o preço por unidade a
  partir do total líquido da linha (em vez do preço de tabela) — é esse
  preço, e não o impresso, que o `ScannerSheet` agora usa ao adicionar o
  item à mesa. Assim o total do item na mesa bate com o que foi
  efetivamente pago.
- A tela de revisão passou a permitir editar **quantidade e preço**, não
  só a descrição (a FASE 00 já previa "revê e edita" — a edição de valores
  não tinha sido implementada). Quando um desconto é detectado
  automaticamente, aparece um aviso "Preço ajustado pelo desconto da
  nota"; se o parser não pegar um caso, dá para corrigir o preço na mão
  antes de confirmar — sempre há uma saída manual (RN-061).

12 testes novos cobrindo os dois formatos (com/sem `Vl. Total` líquido) e
os limites de `effectiveUnitPriceCents` (sem total informado; desconto
zerando o preço). Total do projeto: 124 testes verdes.

**Limite aceito**: como o parser é baseado em padrões de texto (regex),
ele reconhece os rótulos mais comuns ("Desconto", "Vl. Desconto") mas não
cobre necessariamente toda variação de todo estado. A tela de revisão
editável é a rede de segurança para os casos que escaparem.

## Correção pós-deploy 2: desconto em `<tr>` própria (Carrefour/SP)

Um usuário mandou o **papel impresso** de uma nota com item promocional
que ainda não estava sendo descontado. Importante: o papel impresso e a
página web que o QR abre (o que o parser lê) são duas representações
diferentes da mesma compra — o papel não prova o HTML real. Ainda assim,
ele confirma o padrão mais comum na prática: a linha "Desconto sobre
item" aparece **numa `<tr>` separada, logo depois da `<tr>` do item** —
não dentro da mesma linha, como a correção anterior assumia.

- `PER_ITEM_DISCOUNT_LINE`: reconhece uma linha própria contendo "Desconto
  (sobre) (o) item" e aplica ao **último item lido** antes dela.
- Exige a palavra "item" especificamente para nunca se confundir com a
  linha de total agregado da nota ("Descontos R$ ..."), que aparece no
  bloco de totais — evitando contar o desconto duas vezes.
- `TOTALS_SECTION_MARKER` marca o início do bloco de totais ("Valor total
  R$", "Valor a pagar", "Qtde total de itens"); a partir dali, nenhuma
  linha de desconto é mais atribuída a item algum — mesmo que alguma
  variação de rótulo inclua a palavra "item" por acaso.

Novo teste replica exatamente essa estrutura (3 itens + linha de desconto
própria entre o 2º e o 3º + bloco de totais no fim) e confirma: o item
antes do desconto não é tocado, o item com a linha logo depois recebe o
líquido certo, e o item seguinte **não** herda nem o desconto do anterior
nem o total agregado do bloco de totais. Total do projeto: 131 testes.

**Ainda não verificado contra o HTML real.** Sem acesso a uma nota ao
vivo, não há como confirmar que a página da SEFAZ usa exatamente essa
redação. Se o próximo teste do usuário ainda não pegar o desconto
automaticamente, o próximo passo é pedir um print da **página que abre no
navegador** (não o papel) para ver o texto exato — a tela de revisão
editável do scanner continua sendo a rede de segurança garantida
enquanto isso.

## Correção pós-deploy 3: desconto agregado sem item específico (caso real confirmado)

O usuário enviou um print da **página real** que o QR abre (Portal
NFC-e/SEFAZ-SP, nota Carrefour) — a primeira evidência direta do HTML.
Ela revelou algo diferente das duas correções anteriores: **nenhum item
individual mostra desconto**. Cada linha de item tem "Vl. Total" sempre
**bruto** (qtde×unitário, sem redução nenhuma — a batata mostra
`3 × 6,39 = 19,17`, exatamente o valor cheio). O desconto de R$ 6,39
aparece **uma única vez**, no resumo agregado da nota ("Descontos R$"),
sem qualquer indicação de qual item foi a promoção.

Como não há como saber, a partir dessa página, qual item específico teve
o desconto, a solução deixou de ser "achar o item certo" e passou a ser
**ratear o valor entre todos os itens**, proporcional ao valor bruto de
cada um — usando a mesma função `allocate` (método do maior resto,
ADR-008) que já é a primitiva de divisão de todo o app. Isso garante a
propriedade que realmente importa para dividir a conta: a soma dos itens
importados bate, centavo a centavo, com o que foi de fato pago
("Valor a pagar R$") — mesmo sem saber qual item exato estava em
promoção.

- `AGGREGATE_DISCOUNT_LINE` captura o "Descontos R$" do bloco de totais.
- `distributeAggregateDiscount` usa `allocate()` do motor (importado de
  `domain/calculator` — infraestrutura pode depender de domínio, ADR-004)
  para ratear com a mesma garantia de conservação usada em toda divisão
  de conta do produto.
- Só roda quando **nenhum** desconto específico de item foi detectado
  pelas correções anteriores (flag `anyPerItemDiscount`) — evita contar o
  mesmo desconto duas vezes num layout híbrido.
- Corrigido também: `TOTALS_SECTION_MARKER` esperava "Qtde total de
  itens", mas a página real usa "**Qtd**. total de itens" (sem o "e").

Novo teste replica a página inteira (7 itens + bloco de totais, com os
valores reais da nota) e confirma, com os números conferidos à mão: soma
líquida = R$ 74,81 exata, preços de tabela preservados, e o preço efetivo
da batata cai de R$ 6,39 para R$ 5,89/unidade após o rateio. Total do
projeto: 133 testes verdes.

## Correção pós-deploy 4: desconto ainda não aplicava (mesmo após a correção 3)

O usuário testou de novo e o valor final continuou vindo cheio, sem
desconto. A correção 3 estava certa em matemática (comprovada nos
testes), mas dependia de dois pressupostos sobre o HTML real que não dá
para confirmar sem acesso à página ao vivo:

1. **Entidades HTML não decodificadas.** Portais de governo costumam
   separar rótulo e valor com `&nbsp;` (ex.: `Descontos R$:&nbsp;6,39`).
   O parser só tirava as tags e colapsava espaços — a entidade ficava
   como texto literal `&nbsp;`, e a regex do valor (que espera espaço em
   branco de verdade) nunca casava. Corrigido com `decodeHtmlEntities`
   (nbsp/amp/lt/gt/quot/apos + entidades numéricas), aplicado antes de
   qualquer regex de valor.
2. **Bloco de totais pode não estar dentro de `<tr>`.** O parser só varria
   linhas de tabela (`<tr>...</tr>`); se o portal renderiza o resumo em
   `<div>`/`<span>` fora de tabela (comum em templates mais novos), essa
   seção nunca era vista. Adicionado um fallback: se nenhum `Descontos R$`
   foi achado varrendo linhas, tenta de novo no **documento inteiro**
   (tags removidas, entidades decodificadas), antes de desistir.

**Rede de segurança nova, sugerida pelo usuário**: mesmo com as correções
acima, não há como garantir cobertura de toda variação de todo estado
(são 27 SEFAZ diferentes). A tela de revisão ganhou um campo **"Desconto
total da nota"** — quem revisa digita o valor impresso na nota e clica em
"Ratear desconto"; o app distribui esse valor entre os itens listados
pelo mesmo `allocate()` usado automaticamente, tratando os preços atuais
como o bruto a ratear. Não depende do parser identificar nada sozinho —
funciona mesmo se a SEFAZ mudar o layout de novo.

2 novos testes de parser (entidade + totais fora de `<tr>`) confirmam a
robustez, com os números conferidos à mão: soma líquida bate exata com o
"Valor a pagar" também nesse layout alternativo. Total do projeto: 134
testes verdes.

## Pendência de ambiente

Ler o QR de uma NFC-e real com a câmera e bater numa SEFAZ ao vivo exige
dispositivo + rede externa (e cada UF tem HTML próprio). O parser foi
coberto com fixtures de dois layouts e entradas malformadas; ampliar a
cobertura para mais UFs é acréscimo de fixtures quando houver amostras
reais — o contrato normalizado não muda.
