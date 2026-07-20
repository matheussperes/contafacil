'use client'

import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Button, Input } from '@/ui/design-system'

type CameraState = 'starting' | 'active' | 'unavailable'

interface NativeDetector {
  detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]>
}

/**
 * Leitor de QR (F11). Sempre tenta abrir a câmera primeiro — só cai no
 * modo manual (colar link) se a câmera de fato falhar ou não existir
 * (permissão negada, sem câmera, navegador sem suporte). Decodificação:
 * usa o BarcodeDetector nativo quando disponível (Chrome/Edge); caso
 * contrário decodifica via canvas + jsQR, que funciona em qualquer
 * navegador (Safari/iOS, Firefox…) — nenhuma via sem saída (RN-061).
 */
export function QrScanner({ onDetected }: { onDetected: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [manual, setManual] = useState(false)
  const [url, setUrl] = useState('')
  const [camera, setCamera] = useState<CameraState>('starting')

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let cancelled = false

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCamera('unavailable')
      setManual(true)
      return
    }

    const nativeDetector: NativeDetector | null =
      'BarcodeDetector' in globalThis
        ? new (
            globalThis as unknown as {
              BarcodeDetector: new (o: { formats: string[] }) => NativeDetector
            }
          ).BarcodeDetector({ formats: ['qr_code'] })
        : null

    function decodeWithCanvas(video: HTMLVideoElement): string | null {
      if (video.videoWidth === 0 || video.videoHeight === 0) return null
      if (!canvasRef.current) canvasRef.current = document.createElement('canvas')
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return null
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const result = jsQR(frame.data, frame.width, frame.height)
      return result?.data ?? null
    }

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setCamera('active')

        const tick = async () => {
          if (!videoRef.current || cancelled) return
          try {
            let text: string | null = null
            if (nativeDetector) {
              const codes = await nativeDetector.detect(videoRef.current)
              text = codes[0]?.rawValue ?? null
            } else {
              text = decodeWithCanvas(videoRef.current)
            }
            if (text) {
              onDetected(text)
              return
            }
          } catch {
            /* frame sem leitura — tenta o próximo */
          }
          raf = requestAnimationFrame(() => void tick())
        }
        raf = requestAnimationFrame(() => void tick())
      } catch {
        // permissão negada, sem câmera, ou dispositivo indisponível
        if (!cancelled) {
          setCamera('unavailable')
          setManual(true)
        }
      }
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onDetected])

  return (
    <div className="flex flex-col gap-3">
      {!manual && (
        <>
          <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-lg)] bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
              autoPlay
            />
            {camera === 'starting' && (
              <p className="absolute inset-0 flex items-center justify-center text-[length:var(--text-sm)] text-white/80">
                Abrindo câmera…
              </p>
            )}
          </div>
          <Button variant="ghost" onClick={() => setManual(true)}>
            Colar link da nota
          </Button>
        </>
      )}

      {manual && (
        <div className="flex flex-col gap-2">
          {camera === 'unavailable' && (
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Não conseguimos acessar a câmera (permissão negada ou
              indisponível). Cole o link da NFC-e:
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
          {camera === 'unavailable' && (
            <Button
              variant="ghost"
              onClick={() => {
                setManual(false)
                setCamera('starting')
              }}
            >
              Tentar câmera de novo
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
