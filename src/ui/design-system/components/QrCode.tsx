'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export interface QrCodeProps {
  value: string
  size?: number
  /** rótulo acessível da imagem gerada — descreva o que o QR representa */
  alt?: string
}

// Renderiza qualquer texto/URL como QR Code (data URL). Client-only.
// Componente genérico do design system: usado hoje pelo PIX (FASE 10) e
// pelo convite de mesa (F2) — sem acoplamento a nenhum dos dois.
export function QrCode({ value, size = 200, alt = 'QR Code' }: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    QRCode.toDataURL(value, { margin: 1, width: size })
      .then((url) => {
        if (active) setDataUrl(url)
      })
      .catch(() => {
        if (active) setDataUrl(null)
      })
    return () => {
      active = false
    }
  }, [value, size])

  if (dataUrl === null) {
    return (
      <div
        className="animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-inset)]"
        style={{ width: size, height: size }}
        aria-label="Gerando QR Code"
      />
    )
  }
  // QR é um data URI embutido; next/image não agrega aqui.
  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className="rounded-[var(--radius-md)]"
    />
  )
}
