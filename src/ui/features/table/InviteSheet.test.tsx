import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToastProvider } from '@/ui/design-system'
import { InviteSheet } from '@/ui/features/table/InviteSheet'

function renderInvite() {
  return render(
    <ToastProvider>
      <InviteSheet
        open
        onClose={() => {}}
        tableName="Bar do Zé"
        joinCode="ABC234"
      />
    </ToastProvider>,
  )
}

describe('InviteSheet', () => {
  it('mostra o link de convite com o código da mesa (modo Link, padrão)', () => {
    renderInvite()
    expect(screen.getByText(/\/m\/ABC234$/)).toBeInTheDocument()
  })

  it('sem Web Share API: botão copia o link para a área de transferência', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    renderInvite()
    const button = screen.getByRole('button', { name: 'Copiar link' })
    fireEvent.click(button)
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('/m/ABC234'),
      )
    })
  })

  it('com Web Share API: botão compartilha em vez de copiar', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'share', {
      value: share,
      configurable: true,
    })
    renderInvite()
    const button = screen.getByRole('button', { name: 'Compartilhar link' })
    fireEvent.click(button)
    await waitFor(() => {
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/m/ABC234'),
        }),
      )
    })
    Reflect.deleteProperty(window.navigator, 'share')
  })

  it('alterna para o modo QR Code e mostra o código falável', async () => {
    renderInvite()
    fireEvent.click(screen.getByRole('tab', { name: 'QR Code' }))
    expect(screen.getByText('ABC234')).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByAltText('QR Code de convite para a mesa'),
      ).toBeInTheDocument()
    })
  })
})
