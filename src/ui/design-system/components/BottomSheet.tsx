'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/ui/design-system/cn'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
}

/**
 * Bottom sheet mobile-first acessível. Mesmo contrato de foco/Escape do
 * Dialog; ancorado embaixo e limitado em altura com scroll interno.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[var(--radius-lg)]',
          'bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sheet)] outline-none',
        )}
      >
        <div
          aria-hidden
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border)]"
        />
        <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text)]">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
