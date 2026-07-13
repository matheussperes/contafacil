# FASE 11 — Scanner NFC-e

## Contexto

FASES 00–10 aprovadas. O produto está funcional de ponta a ponta com entrada manual de itens. **Somente agora** entra a conveniência de importar itens da nota fiscal.

## Objetivo

Ler o QR Code da NFC-e, extrair os itens e adicioná-los à mesa — com fallback garantido para entrada manual quando qualquer etapa falhar.

## Fluxo

```
QR Code
   ↓
Parser
   ↓
JSON
   ↓
Itens
   ↓
Mesa
```

Caso falhe, em **qualquer** etapa:

```
   ↓
Entrada Manual
```

## Entregáveis

1. **Leitura de QR Code** — câmera do dispositivo via navegador, com permissão tratada e alternativa de colar a URL da nota.
2. **Parser** — extração dos dados da NFC-e a partir da URL/página da SEFAZ; tolerante a variações entre estados; isolado como módulo testável.
3. **JSON normalizado** — estrutura intermediária tipada (descrição, quantidade, valor unitário, total) independente do formato de origem.
4. **Revisão de itens** — tela para conferir/editar/excluir os itens extraídos **antes** de adicionar à mesa.
5. **Inserção na mesa** — itens confirmados entram pelo mesmo CRUD da FASE 04 (nenhum caminho paralelo de escrita).
6. **Fallback** — qualquer falha (QR ilegível, SEFAZ fora do ar, formato desconhecido) leva à entrada manual com mensagem clara, sem beco sem saída.
7. **Testes** — parser testado com amostras reais de NFC-e de diferentes estados e com entradas malformadas.

## Fora do escopo

- Outros documentos fiscais (NF-e, SAT, cupons não fiscais).
- OCR de foto de comanda/nota impressa.
- Armazenamento da nota completa além do necessário para os itens.

## Critérios de aceite

- [ ] Fluxo feliz: escanear QR de NFC-e real → itens revisados → itens na mesa.
- [ ] Toda falha simulada termina em entrada manual funcional (nenhum estado travado).
- [ ] Parser coberto por testes com amostras reais e malformadas.
- [ ] Itens importados são indistinguíveis de itens manuais para o restante do sistema.
- [ ] Build, testes e lint verdes.

## Dependências

- FASE 04 aprovada (CRUD de itens), FASE 07 aprovada (tela da Mesa).
