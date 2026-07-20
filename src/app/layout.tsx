import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppProviders } from '@/ui/providers/AppProviders'
import { ServiceWorkerRegister } from '@/ui/pwa/ServiceWorkerRegister'
import { ConnectionBanner } from '@/ui/pwa/ConnectionBanner'

const APP_NAME = 'ContaFácil'
const APP_DESCRIPTION =
  'Divida a conta do bar em tempo real, sem sobrar nem faltar.'

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: { default: APP_NAME, template: `%s — ${APP_NAME}` },
  description: APP_DESCRIPTION,
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: APP_NAME },
  formatDetection: { telephone: false },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    locale: 'pt_BR',
  },
  twitter: { card: 'summary', title: APP_NAME, description: APP_DESCRIPTION },
}

export const viewport: Viewport = {
  themeColor: '#1f6f4f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <ConnectionBanner />
        <AppProviders>{children}</AppProviders>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
