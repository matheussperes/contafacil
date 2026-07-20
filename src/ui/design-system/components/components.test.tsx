import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/ui/design-system/components/Button'
import { Input } from '@/ui/design-system/components/Input'
import { Avatar } from '@/ui/design-system/components/Avatar'
import { Dialog } from '@/ui/design-system/components/Dialog'
import { EmptyState } from '@/ui/design-system/components/feedback'

describe('Button', () => {
  it('desabilita e marca aria-busy quando loading', () => {
    render(<Button loading>Salvar</Button>)
    const btn = screen.getByRole('button', { name: /salvar/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })

  it('dispara onClick quando habilitado', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Ok</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe('Input', () => {
  it('associa label, erro e aria-invalid', () => {
    render(<Input label="Código" error="Mesa não encontrada" />)
    const input = screen.getByLabelText('Código')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Mesa não encontrada')
  })
})

describe('Avatar', () => {
  it('gera iniciais e rótulo acessível', () => {
    render(<Avatar name="Ana Silva" />)
    const el = screen.getByRole('img', { name: 'Ana Silva' })
    expect(el).toHaveTextContent('AS')
  })
})

describe('Dialog', () => {
  it('não renderiza fechado; renderiza aberto com role dialog', () => {
    const { rerender } = render(
      <Dialog open={false} onClose={() => {}} title="Fechar?" />,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(<Dialog open onClose={() => {}} title="Fechar?" />)
    expect(screen.getByRole('dialog', { name: 'Fechar?' })).toBeInTheDocument()
  })

  it('fecha no Escape', () => {
    const onClose = vi.fn()
    render(<Dialog open onClose={onClose} title="X" />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})

describe('EmptyState', () => {
  it('mostra título, descrição e ação', () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="Sem itens"
        description="Adicione o primeiro"
        action={{ label: 'Adicionar', onClick }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(onClick).toHaveBeenCalled()
  })
})
