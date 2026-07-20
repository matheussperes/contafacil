import type { HTMLAttributes } from 'react'
import { cn } from '@/ui/design-system/cn'

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void
}

export function Tag({ onRemove, className, children, ...rest }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-sm)] border px-2 py-1',
        'text-[length:var(--text-sm)] text-[var(--color-text)]',
        className,
      )}
      {...rest}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover"
          className="ml-0.5 rounded-full px-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
        >
          ×
        </button>
      )}
    </span>
  )
}
