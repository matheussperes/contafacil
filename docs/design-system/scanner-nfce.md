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

## Pendência de ambiente

Ler o QR de uma NFC-e real com a câmera e bater numa SEFAZ ao vivo exige
dispositivo + rede externa (e cada UF tem HTML próprio). O parser foi
coberto com fixtures de dois layouts e entradas malformadas; ampliar a
cobertura para mais UFs é acréscimo de fixtures quando houver amostras
reais — o contrato normalizado não muda.
