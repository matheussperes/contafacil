'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, Input } from '@/ui/design-system'

/**
 * Leitor de QR (F11): usa BarcodeDetector nativo quando disponível; se
 * não houver câmera/permissão/suporte, oferece colar a URL da nota —
 * nenhuma via sem saída (RN-061).
 */
export function QrScanner({ onDetected }: { onDetected: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [manual, setManual] = useState(false)
  const [url, setUrl] = useState('')
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    const hasDetector = 'BarcodeDetector' in globalThis
    if (!hasDetector) {
      setSupported(false)
      setManual(true)
      return
    }
    const DetectorCtor = (
      globalThis as unknown as { BarcodeDetector: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }
    ).BarcodeDetector
    const detector = new DetectorCtor({ formats: ['qr_code'] })

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        const tick = async () => {
          if (!videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            const first = codes[0]?.rawValue
            if (first) {
              onDetected(first)
              return
            }
          } catch {
            /* frame sem leitura */
          }
          raf = requestAnimationFrame(() => void tick())
        }
        raf = requestAnimationFrame(() => void tick())
      } catch {
        setSupported(false)
        setManual(true)
      }
    })()

    return () => {
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onDetected])

  return (
    <div className="flex flex-col gap-3">
      {!manual && (
        <>
          <video
            ref={videoRef}
            className="aspect-square w-full rounded-[var(--radius-lg)] bg-black object-cover"
            muted
            playsInline
          />
          <Button variant="ghost" onClick={() => setManual(true)}>
            Colar link da nota
          </Button>
        </>
      )}

      {manual && (
        <div className="flex flex-col gap-2">
          {!supported && (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Câmera indisponível. Cole o link da NFC-e:
            </p>
          )}
          <Input
            label="Link da nota fiscal"
            placeholder="https://…/nfce?p=…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button
            fullWidth
            disabled={url.trim() === ''}
            onClick={() => onDetected(url.trim())}
          >
            Ler nota
          </Button>
        </div>
      )}
    </div>
  )
}
