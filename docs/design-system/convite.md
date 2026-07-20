# Convite para a mesa

Botão **Convidar**, visível no cabeçalho da mesa enquanto ela está
`ABERTA` (novas pessoas só conseguem entrar nesse estado — RN-006/FA-04;
depois de fechar, o botão some). Abre uma sheet com duas formas de trazer
gente pra mesa, à escolha de quem convida:

- **Link** — mostra a URL e um botão que usa a **Web Share API**
  (`navigator.share`) quando o navegador suporta, abrindo o menu nativo de
  compartilhamento (WhatsApp, mensagens, etc.); sem suporte, cai para
  **copiar** a URL (com Toast de confirmação).
- **QR Code** — renderiza o mesmo link como QR (reaproveita o componente
  já usado no PIX, agora movido para o design system por ser genérico) e
  mostra o código de 6 letras grande embaixo, para quem preferir **falar
  o código em voz alta** em vez de escanear (é exatamente a justificativa
  da RN-001 para o código ser curto e falável).

## Nenhuma rota nova

O link de convite é **o mesmo** `/m/{joinCode}` que já existe desde a
FASE 07: `TableRoute` já resolve — quem abre e ainda não é participante
cai direto na tela de nome (`/m/{joinCode}/nome`); quem já é, entra direto
na mesa. A rota já gera Open Graph próprio (preview rico no WhatsApp). O
convite não introduziu nenhuma lógica de entrada nova — só expõe, de forma
conveniente, o link que já funcionava.

## Peças

- `ui/features/table/invite-url.ts` — `buildInviteUrl(origin, joinCode)`,
  função pura testada isoladamente.
- `ui/design-system/components/QrCode.tsx` — movido de
  `ui/features/payment/` para o design system: é um componente genérico
  (renderiza qualquer string como QR), sem acoplamento a PIX; agora
  reaproveitado pelo convite. `PaymentSheet` foi atualizado para importar
  do novo local.
- `ui/features/table/InviteSheet.tsx` — a sheet com as duas opções.

## Testes

6 novos (`invite-url.test.ts` + `InviteSheet.test.tsx`): montagem da URL,
link exibido, compartilhar vs. copiar (com e sem Web Share API mockada),
alternância para QR Code com o código visível e a imagem do QR
efetivamente gerada (o pacote `qrcode` roda puro em Node/jsdom, sem
precisar do pacote `canvas`). Total do projeto: 130 testes verdes.
