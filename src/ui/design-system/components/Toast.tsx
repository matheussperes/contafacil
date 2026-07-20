'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '@/ui/design-system/cn'

export type ToastTone = 'neutral' | 'positive' | 'danger' | 'info'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (ctx === null) throw new Error('useToast fora de ToastProvider')
  return ctx
}

const TONES: Record<ToastTone, string> = {
  neutral: 'bg-[var(--color-text)] text-[var(--color-text-inverse)]',
  positive: 'bg-[var(--color-positive)] text-white',
  danger: 'bg-[var(--color-danger)] text-white',
  info: 'bg-[var(--color-info)] text-white',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, tone: ToastTone = 'neutral') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, tone }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto max-w-sm rounded-[var(--radius-md)] px-4 py-2',
              'text-[length:var(--text-sm)] shadow-[var(--shadow-card)]',
              TONES[t.tone],
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
