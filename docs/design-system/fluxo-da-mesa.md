# Fluxo da Mesa — FASE 07

O caminho principal do produto, ponta a ponta: **Home → Nova Mesa →
Entrar → Nome → Mesa**. Usa só componentes da FASE 06 e services/eventos
das FASES 04/05. Sem PIX, sem scanner, sem fechamento, sem distribuição
avançada (o item apenas existe na mesa).

## Rotas

| Rota | Tela | Fluxo |
|------|------|-------|
| `/` | HomeScreen | F1/F2: criar, entrar, mesas recentes |
| `/nova` | NewTableScreen | F1: nome, modo de acerto, taxa, chave PIX (modo A) |
| `/entrar` | JoinScreen | F2: valida o código antes de pedir o nome |
| `/m/[joinCode]/nome` | NameScreen | F2: identificação, trata NOME_DUPLICADO |
| `/m/[joinCode]` | TableRoute → TableScreen | F3: mesa viva em tempo real |

`/m/[joinCode]` gera **metadados Open Graph no servidor** (ADR-002) para
o preview do link no WhatsApp/Telegram — sem expor valores, só o código.

## Arquitetura de estado (ADR-005)

- **`useTableSnapshot`** — a fonte de verdade da tela: o snapshot completo
  vive no cache do TanStack Query; o adapter realtime (FASE 05) escreve no
  cache via `applyEvent`. Em `reconnected`, invalida e refaz o snapshot
  (FA-90).
- **`useTableView`** — deriva "meu participante", capacidades (`canEdit`
  via seletores do domínio) e **totais por participante pelo motor**
  (FASE 03) — a UI nunca calcula dinheiro nem reimplementa regra.
- **`ServicesProvider`** — injeta a composição (ADR-004); a UI consome
  services, nunca repositories. Client Supabase **preguiçoso**: a
  composição é construída no prerender sem exigir env; o client real só
  nasce na primeira interação (client-side).

## Erros (estrategia-erros.md)

`src/ui/errors/error-messages.ts` mapeia todo código → mensagem pt-BR. Um
teste garante que **todo** código de domínio tem mensagem. As telas
apresentam; não decidem.

## Verificação

- `pnpm build` verde: 7 rotas (`/m/[joinCode]` dinâmica com OG).
- `pnpm test`: 92 testes (mapa de erros completo + componentes).
- typecheck e lint limpos.

## Pendência de ambiente

O E2E "criar em um dispositivo, entrar por código em outro, ver os itens
em tempo real" (critério da fase) exige Supabase + Realtime rodando
(Docker) e um navegador — indisponível aqui. As telas foram validadas por
build/lint/type + testes de lógica (derivação de estado, mensagens). Os
Playwright specs entram quando houver ambiente com Supabase (o contrato de
services/eventos já está fixo).
