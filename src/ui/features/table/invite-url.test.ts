import { describe, expect, it } from 'vitest'
import { buildInviteUrl } from '@/ui/features/table/invite-url'

describe('buildInviteUrl', () => {
  it('monta /m/{joinCode} a partir da origem', () => {
    expect(buildInviteUrl('https://contafacil.app', 'ABC234')).toBe(
      'https://contafacil.app/m/ABC234',
    )
  })

  it('remove barra final da origem para não duplicar', () => {
    expect(buildInviteUrl('https://contafacil.app/', 'ABC234')).toBe(
      'https://contafacil.app/m/ABC234',
    )
  })
})
