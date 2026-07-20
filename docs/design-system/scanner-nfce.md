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
  busca a página e devolve JSON normalizado; timeout de 8s; não repassa
  HTML cru nem loga a URL.
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

## Pendência de ambiente

Ler o QR de uma NFC-e real com a câmera e bater numa SEFAZ ao vivo exige
dispositivo + rede externa (e cada UF tem HTML próprio). O parser foi
coberto com fixtures de dois layouts e entradas malformadas; ampliar a
cobertura para mais UFs é acréscimo de fixtures quando houver amostras
reais — o contrato normalizado não muda.
