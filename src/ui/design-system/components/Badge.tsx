import type { HTMLAttributes } from 'react'
import { cn } from '@/ui/design-system/cn'

export type BadgeTone = 'neutral' | 'positive' | 'warning' | 'danger' | 'info'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

const TONES: Record<BadgeTone, string> = {
  neutral:
    'bg-[var(--color-surface-inset)] text-[var(--color-text-muted)]',
  positive: 'bg-[var(--color-positive)]/15 text-[var(--color-positive)]',
  warning: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
  info: 'bg-[var(--color-info)]/15 text-[var(--color-info)]',
}

export function Badge({ tone = 'neutral', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5',
        'text-[length:var(--text-xs)] font-medium',
        TONES[tone],
        className,
      )}
      {...rest}
    />
  )
}
