# Estratégia Offline — ContaFácil

Bar cheio = rede ruim. A estratégia define **o que** funciona sem conexão e o que é honesto bloquear. Implementação completa na FASE 12; as fundações (esta estratégia, FA-90) valem desde já.

## Princípio

O ContaFácil é colaborativo em tempo real: o custo de mostrar/aceitar estado divergente é alto (dinheiro, discussão na mesa). Offline **privilegia leitura honesta e escrita bloqueada com clareza**, não uma ilusão de escrita que estoura em conflito depois.

## Níveis

| Nível | O quê | Mecanismo | Fase |
|-------|------|-----------|------|
| L1 — Shell | app abre offline (HTML/JS/CSS/fontes) | service worker, precache do build | 12 |
| L2 — Leitura | última mesa vista abre com dados do último snapshot + banner "desatualizado desde HH:MM" | persistência do cache TanStack Query (localStorage/IDB) | 12 |
| L3 — Escrita | ver abaixo | fila mínima | 12 |

## Escrita offline (L3) — política por operação

| Operação | Offline | Racional |
|----------|---------|----------|
| Criar mesa / entrar em mesa | ❌ bloqueada | exige servidor por definição (código, unicidade, realtime) |
| Criar/editar item, distribuir | ❌ bloqueada com CTA "reconectando…" | alta chance de conflito com a mesa viva; honestidade > ilusão |
| Fechamento | ❌ bloqueada | transação crítica (ADR-007) |
| **Marcar pagamento (pago/recebi)** | ✅ enfileirada | pós-fechamento a mesa é estática; conflito improvável; é exatamente o momento (saída do bar) de rede pior |

A fila de L3 guarda a intenção (`{paymentId, ação, version}`) e reenvia ao reconectar; se a `version` do servidor mudou, a intenção é descartada e o estado real prevalece (servidor vence — sempre).

## Reconexão

Idêntica ao realtime (FA-90): snapshot completo primeiro, depois vida normal. Não há merge de estado local: **estado local divergente é descartado**, exceto a fila de pagamentos acima.

## Sinalização ao usuário

- Estado de conexão sempre visível quando degradado (banner discreto do design system).
- Ação bloqueada por offline explica e oferece retry — nunca falha silenciosa (estratégia de erros).

## O que fica explicitamente fora

- Criação/edição offline com merge posterior (CRDTs etc.) — complexidade desproporcional ao caso de uso (mesa é efêmera, horas de vida).
- Sincronização entre dispositivos do mesmo participante (limite do ADR-006).
