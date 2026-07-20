'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/ui/design-system'
import { ServicesProvider } from '@/ui/providers/ServicesProvider'

/**
 * Providers globais do app (ADR-005): TanStack Query para estado do
 * servidor, ServicesProvider para a composição (ADR-004) e ToastProvider
 * para feedback. Instanciados uma vez no client.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, error) => {
              const retryable =
                typeof error === 'object' &&
                error !== null &&
                'retryable' in error &&
                (error as { retryable?: boolean }).retryable === true
              return retryable && count < 3
            },
            refetchOnWindowFocus: true,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ServicesProvider>
        <ToastProvider>{children}</ToastProvider>
      </ServicesProvider>
    </QueryClientProvider>
  )
}
