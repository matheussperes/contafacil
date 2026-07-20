/**
 * Eventos de analytics do produto (FASE 13) — separados dos logs
 * (estrategia-logs.md). No-op sem provider configurado; nunca inclui
 * valores monetários associados a pessoas nem chaves PIX.
 */
export type AnalyticsEvent =
  | 'mesa_criada'
  | 'mesa_entrou'
  | 'mesa_fechada'
  | 'pix_copiado'
  | 'nfce_importada'

type Emitter = (event: AnalyticsEvent, props?: Record<string, string | number>) => void

let emitter: Emitter | null = null

/** Liga um provider real (ex.: Vercel Analytics/Plausible) na inicialização. */
export function configureAnalytics(fn: Emitter): void {
  emitter = fn
}

export function track(
  event: AnalyticsEvent,
  props?: Record<string, string | number>,
): void {
  emitter?.(event, props)
}
