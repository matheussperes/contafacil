/**
 * Monta o link de convite da mesa (F2). É o mesmo /m/{joinCode} que a
 * FASE 07 já resolve: quem abrir e ainda não for participante cai direto
 * na tela de nome (TableRoute); a FASE 07 também já gera OG nesse link
 * para preview rico no WhatsApp/Telegram. Convite = mesmo link, exposto
 * de forma conveniente (copiar/compartilhar/QR) — nenhuma rota nova.
 */
export function buildInviteUrl(origin: string, joinCode: string): string {
  return `${origin.replace(/\/$/, '')}/m/${joinCode}`
}
