'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { buildServices, type Services } from '@/infrastructure/composition'

const ServicesContext = createContext<Services | null>(null)

/**
 * Injeta os services (composição, ADR-004). A UI consome hooks que leem
 * daqui; nunca instancia repositories. Aceita override para testes.
 */
export function ServicesProvider({
  children,
  services,
}: {
  children: ReactNode
  services?: Services
}) {
  const value = useMemo(() => services ?? buildServices(), [services])
  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  )
}

export function useServices(): Services {
  const ctx = useContext(ServicesContext)
  if (ctx === null) throw new Error('useServices fora de ServicesProvider')
  return ctx
}
