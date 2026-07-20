'use client'

import { useEffect, useState } from 'react'

// Sinaliza conexão degradada de forma discreta (estrategia-offline.md):
// honestidade > ilusão. Sem falsos positivos no SSR (assume online).
export function ConnectionBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!offline) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[70] bg-[var(--color-warning)] px-4 py-1.5 text-center text-[length:var(--text-sm)] text-black"
    >
      Sem conexão — mostrando dados salvos
    </div>
  )
}
