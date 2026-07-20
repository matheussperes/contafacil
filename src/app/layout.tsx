import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastProvider } from '@/ui/design-system'

export const metadata: Metadata = {
  title: 'ContaFácil',
  description: 'Divida a conta do bar em tempo real, sem sobrar nem faltar.',
}

export const viewport: Viewport = {
  themeColor: '#1f6f4f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
