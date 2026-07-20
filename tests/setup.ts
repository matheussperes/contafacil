import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Sem globals do vitest, o auto-cleanup do RTL não se registra sozinho.
afterEach(() => {
  cleanup()
})
