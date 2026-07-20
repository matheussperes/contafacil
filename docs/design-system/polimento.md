# Polimento — FASE 12

Eleva qualidade técnica e percebida, completa os requisitos de PWA. Sem
funcionalidade nova.

## PWA

- `public/manifest.webmanifest` — instalável, standalone, tema/ícones/
  cores; ícones SVG (`icon.svg` + `maskable.svg`).
- `public/sw.js` — service worker conforme `estrategia-offline.md`:
  navegações network-first com fallback ao shell/`/offline` (L1/L2);
  assets stale-while-revalidate; **Supabase e `/api` nunca cacheados**
  (estado vivo). Versionado, limpa caches antigos no activate.
- `ServiceWorkerRegister` — registra o SW só em produção.
- `/offline` — página servida quando offline sem cache.

## Offline honesto (estrategia-offline.md)

`ConnectionBanner` mostra, discreto, "sem conexão — mostrando dados
salvos" quando o navegador fica offline. Nada de ilusão de escrita: a
estratégia da FASE 01 (leitura em cache, escrita bloqueada, fila só de
pagamentos) permanece o contrato.

## Acessibilidade

- `prefers-reduced-motion`: anima quase nada para quem pede menos
  movimento (tokens.css).
- Foco visível global, roles/aria nos componentes (desde a FASE 06),
  navegação por teclado nos diálogos/sheets.

## Performance

- **Code splitting**: o Scanner (câmera + lib `qrcode`) é carregado sob
  demanda via `next/dynamic` (`ssr:false`) — sai do bundle inicial da
  mesa até o usuário abrir "Escanear".
- App shell estático; rotas dinâmicas só onde há dados por requisição.

## SEO / compartilhamento

- Metadados ricos no root (title template, description, OG, Twitter,
  `manifest`, ícones, apple-web-app).
- O convite `/m/[joinCode]` já gera OG próprio no servidor (FASE 07).

## Verificação

`pnpm build` verde; scanner fora do First Load da mesa; 117 testes,
type/lint limpos.

## Pendência de ambiente

Rodar Lighthouse (métrica ≥ 90) e testar instalação/offline reais exigem
o app servido num navegador com Supabase — fora deste ambiente. Os
artefatos que a auditoria cobra (manifest válido, SW, ícones,
reduced-motion, metadados, code splitting) estão implementados e no build;
os PNGs rasterizados dos ícones (a partir do SVG) e a medição Lighthouse
entram no checklist da FASE 13, com ambiente real.
