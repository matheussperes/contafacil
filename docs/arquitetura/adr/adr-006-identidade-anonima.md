# ADR-006 — Identidade anônima por dispositivo (Supabase Anonymous Auth)

**Status:** Aceito · **Data:** 13/07/2026 · **Regras relacionadas:** RN-007, visão ("anônimo por sessão")

## Contexto

O produto promete entrada em < 30s sem cadastro. Mas o RLS (ADR-003) precisa de **alguma** identidade para autorizar: "só o devedor marca 'paguei'" (RN-051), "só o criador fecha" (RN-031). Sem identidade, qualquer cliente poderia agir por qualquer participante.

## Decisão

- **Supabase Anonymous Sign-in**: ao abrir o app pela primeira vez, o dispositivo recebe um usuário anônimo (`auth.uid()` real, sem e-mail/senha, invisível para o usuário).
- Cada `Participant` registra o `auth.uid()` do dispositivo que o criou. As policies de RLS autorizam por esse vínculo: agir como participante X exige `auth.uid()` = uid registrado em X.
- Papéis (criador) e estados (devedor/recebedor) são verificados por policy + trigger sobre esse vínculo.
- A sessão anônima persiste no dispositivo (storage do supabase-js): a pessoa fecha e reabre o navegador e continua sendo "ela" na mesa.

## Alternativas consideradas

1. **Token secreto próprio por participante (sem auth)** — o RLS teria de ler o token de um header/claim custom; reimplementa metade do Auth com menos segurança; rejeitada.
2. **Login social/e-mail** — mata a proposta de valor (zero atrito) para uma noite de bar; rejeitada no MVP.
3. **Nenhuma identidade (confiança total)** — inviável: RN-031/051 exigem autorização por papel.

## Consequências

- Limite conhecido e aceito: **identidade = dispositivo**. Trocar de aparelho no meio da noite = entrar como novo participante (coerente com I-P2). Recuperação de sessão entre dispositivos fica fora do MVP.
- Usuários anônimos órfãos são inócuos (não carregam dados sensíveis); limpeza é rotina operacional da FASE 13.
- Nenhuma tela de autenticação é construída em fase alguma.
