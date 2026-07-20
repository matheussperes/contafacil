import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/ui/design-system/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-brand-600)] text-[var(--color-text-inverse)] hover:bg-[var(--color-brand-700)]',
  secondary:
    'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]',
  ghost:
    'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-inset)]',
  danger:
    'bg-[var(--color-danger)] text-[var(--color-text-inverse)] hover:opacity-90',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[length:var(--text-sm)]',
  md: 'h-11 px-4 text-[length:var(--text-base)]',
  lg: 'h-13 px-6 text-[length:var(--text-lg)]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium',
          'transition-[background-color,opacity] duration-[var(--duration-fast)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          VARIANTS[variant],
          SIZES[size],
          fullWidth && 'w-full',
          className,
        )}
        {...rest}
      >
        {loading && (
          <span
            aria-hidden
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </button>
    )
  },
)
