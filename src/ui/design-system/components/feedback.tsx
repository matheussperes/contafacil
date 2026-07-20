import type { ReactNode } from 'react'
import { cn } from '@/ui/design-system/cn'
import { Button } from '@/ui/design-system/components/Button'

/** Skeleton — placeholder de carregamento de listas/cards. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-surface-inset)]',
        className,
      )}
    />
  )
}

/** Spinner — indicador de ação em andamento (com rótulo acessível). */
export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-block size-6 animate-spin rounded-full border-2 border-[var(--color-brand-600)] border-t-transparent"
    />
  )
}

interface StateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: { label: string; onClick: () => void }
}

/** Empty state — lista/tela sem conteúdo, com CTA opcional. */
export function EmptyState({ title, description, icon, action }: StateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      {icon && <div className="text-4xl opacity-60">{icon}</div>}
      <div>
        <p className="font-medium text-[var(--color-text)]">{title}</p>
        {description && (
          <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

/** Error state — falha com ação de retry (estrategia-erros.md). */
export function ErrorState({
  title = 'Algo deu errado',
  description,
  action,
}: Partial<StateProps>) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 py-10 text-center"
    >
      <div className="text-4xl">⚠️</div>
      <div>
        <p className="font-medium text-[var(--color-danger)]">{title}</p>
        {description && (
          <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
