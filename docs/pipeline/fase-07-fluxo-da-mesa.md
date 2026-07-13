# FASE 07 — Fluxo da Mesa (Fluxo Principal)

## Contexto

FASES 00–06 aprovadas. Backend, realtime e design system prontos. Agora começa a interface do produto — apenas o caminho principal.

## Objetivo

Construir o fluxo essencial de entrada e permanência na mesa, usando exclusivamente os componentes do design system e os services/eventos já aprovados.

## Escopo

Construir **apenas**:

```
Home
   ↓
Nova Mesa
   ↓
Entrar Mesa
   ↓
Adicionar Nome
   ↓
Mesa
```

1. **Home** — ponto de partida: criar nova mesa ou entrar em uma existente.
2. **Nova Mesa** — criação com as opções definidas na FASE 00; gera código/link de convite.
3. **Entrar Mesa** — entrada por código/link, com validação de mesa inexistente ou fechada.
4. **Adicionar Nome** — identificação do participante antes de entrar.
5. **Mesa** — tela viva da mesa: participantes presentes, itens, consumo — tudo atualizado em tempo real (FASE 05); adicionar/editar/remover itens manualmente.

## Fora do escopo

- **Sem PIX.**
- **Sem scanner.**
- **Sem fechamento.**
- Distribuição avançada (todos/pessoa/grupo, proporção) — FASE 08. Aqui os itens apenas existem na mesa.
- Animações e polimento (FASE 12).

## Critérios de aceite

- [ ] Fluxo completo funciona de ponta a ponta: criar mesa em um dispositivo, entrar por código em outro, ambos veem os mesmos itens e participantes em tempo real.
- [ ] Todas as telas usam apenas componentes da FASE 06 (nenhum componente visual novo fora do design system).
- [ ] Estados de carregamento, vazio e erro presentes em todas as telas (Skeletons/Empty/Error do design system).
- [ ] Nenhuma regra de negócio implementada na UI — telas apenas chamam services/domínio.
- [ ] Build, testes e lint verdes.

## Dependências

- FASE 04 aprovada (CRUDs), FASE 05 aprovada (realtime), FASE 06 aprovada (componentes).
