import type { HTMLAttributes } from 'react'
import { cn } from '@/ui/design-system/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function Card({ interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]',
        interactive &&
          'cursor-pointer transition-transform duration-[var(--duration-fast)] hover:-translate-y-0.5',
        className,
      )}
      {...rest}
    />
  )
}
