# ADR-002 — Next.js (App Router) + TypeScript estrito

**Status:** Aceito · **Data:** 13/07/2026

## Contexto

O produto é um PWA mobile-first hospedado na Vercel (restrição do pipeline, FASE 13). Duas necessidades puxam renderização no servidor:

1. O **link de convite** (`/m/{joinCode}`) precisa de preview rico (Open Graph) no WhatsApp/Telegram — é o principal canal de entrada de convidados (F2).
2. SEO das páginas públicas (FASE 12).

Ao mesmo tempo, a tela da mesa é uma aplicação altamente interativa e realtime — essencialmente client-side.

## Decisão

- **Next.js 15+ (App Router)** como framework, no modelo híbrido: rotas públicas (Home, convite) com renderização no servidor para OG/SEO; a mesa como client component hidratado, dirigido por realtime.
- **TypeScript em modo estrito** (`strict: true`, `noUncheckedIndexedAccess: true`) em 100% do código.
- **React 19** (padrão do Next 15).

## Alternativas consideradas

1. **Vite + React SPA** — mais simples para o app realtime, mas sem SSR: preview do link de convite exigiria serviço separado de OG; rejeitada.
2. **Remix / React Router v7** — equivalente tecnicamente, mas Next.js tem integração de primeira classe com a Vercel (deploy, preview branches, analytics) já decidida no pipeline.
3. **SvelteKit** — ecossistema menor para os componentes/bibliotecas que o projeto usará; equipe/agente mais produtivos em React.

## Consequências

- `src/app/` contém apenas rotas e composição — regra de negócio proibida ali (Clean Architecture, ADR-004).
- O domínio (FASE 03) e a aplicação são agnósticos de framework: nada de imports de React/Next fora de `src/ui` e `src/app`.
- Metadados OG por mesa são gerados no servidor lendo apenas dados públicos (nome da mesa, nº de participantes) — nunca valores.
