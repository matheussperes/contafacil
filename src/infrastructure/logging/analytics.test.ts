import { describe, expect, it, vi } from 'vitest'
import { configureAnalytics, track } from '@/infrastructure/logging/analytics'

describe('analytics', () => {
  it('é no-op sem provider configurado', () => {
    expect(() => track('mesa_criada')).not.toThrow()
  })

  it('encaminha o evento ao provider configurado', () => {
    const spy = vi.fn()
    configureAnalytics(spy)
    track('pix_copiado', { mode: 'RECEBEDOR_FIXO' })
    expect(spy).toHaveBeenCalledWith('pix_copiado', { mode: 'RECEBEDOR_FIXO' })
  })
})
