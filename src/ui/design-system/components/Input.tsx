import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/ui/design-system/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  prefix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, id, className, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[length:var(--text-sm)] font-medium text-[var(--color-text)]"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-center rounded-[var(--radius-md)] border bg-[var(--color-surface)]',
          'focus-within:ring-2 focus-within:ring-[var(--color-brand-600)]',
          error
            ? 'border-[var(--color-danger)]'
            : 'border-[var(--color-border)]',
        )}
      >
        {prefix && (
          <span className="pl-3 text-[var(--color-text-muted)]">{prefix}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-11 w-full bg-transparent px-3 text-[var(--color-text)] outline-none',
            'placeholder:text-[var(--color-text-muted)]',
            className,
          )}
          {...rest}
        />
      </div>
      {error ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-[length:var(--text-xs)] text-[var(--color-danger)]"
        >
          {error}
        </p>
      ) : (
        hint && (
          <p
            id={`${inputId}-hint`}
            className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]"
          >
            {hint}
          </p>
        )
      )}
    </div>
  )
})
