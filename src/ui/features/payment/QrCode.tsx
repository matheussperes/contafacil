'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// Renderiza um QR Code (data URL) a partir do payload PIX. Client-only.
export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
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
      alt="QR Code PIX"
      width={size}
      height={size}
      className="rounded-[var(--radius-md)]"
    />
  )
}
