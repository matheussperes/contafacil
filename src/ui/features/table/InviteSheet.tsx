'use client'

import { useState } from 'react'
import {
  BottomSheet,
  Button,
  QrCode,
  useToast,
} from '@/ui/design-system'
import { buildInviteUrl } from '@/ui/features/table/invite-url'

type Mode = 'LINK' | 'QRCODE'

export interface InviteSheetProps {
  open: boolean
  onClose: () => void
  tableName: string | null
  joinCode: string
}

/**
 * Convite para a mesa (F2): o dono escolhe **link** (compartilhar via
 * WhatsApp/etc., com fallback de copiar) ou **QR Code** (outra pessoa
 * escaneia com a câmera do celular). Os dois levam ao mesmo lugar —
 * /m/{joinCode}, que a FASE 07 já resolve direto para a tela de nome
 * (TableRoute) — nenhuma rota ou lógica de entrada nova aqui.
 */
export function InviteSheet({
  open,
  onClose,
  tableName,
  joinCode,
}: InviteSheetProps) {
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('LINK')

  // Guard de SSR: só é lido quando a sheet está de fato aberta (interação
  // do usuário, sempre client-side) — sem risco de hidratação divergente.
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const inviteUrl = buildInviteUrl(origin, joinCode)
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator

  async function share() {
    if (canShare) {
      try {
        await navigator.share({
          title: tableName ? `Mesa: ${tableName}` : 'Convite para a mesa',
          text: 'Entra na nossa mesa no ContaFácil pra dividir a conta:',
          url: inviteUrl,
        })
      } catch {
        // usuário cancelou o compartilhamento — sem ação
      }
      return
    }
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toast.show('Link copiado', 'positive')
    } catch {
      toast.show('Não foi possível copiar', 'danger')
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Convidar para a mesa">
      <div className="flex flex-col gap-4">
        <div role="tablist" className="flex gap-2">
          <button
            role="tab"
            aria-selected={mode === 'LINK'}
            onClick={() => setMode('LINK')}
            className={
              'flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-[length:var(--text-sm)] ' +
              (mode === 'LINK'
                ? 'bg-[var(--color-brand-600)] text-[var(--color-text-inverse)]'
                : 'bg-[var(--color-surface)]')
            }
          >
            Link
          </button>
          <button
            role="tab"
            aria-selected={mode === 'QRCODE'}
            onClick={() => setMode('QRCODE')}
            className={
              'flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-[length:var(--text-sm)] ' +
              (mode === 'QRCODE'
                ? 'bg-[var(--color-brand-600)] text-[var(--color-text-inverse)]'
                : 'bg-[var(--color-surface)]')
            }
          >
            QR Code
          </button>
        </div>

        {mode === 'LINK' && (
          <div className="flex flex-col items-center gap-3">
            <code className="block w-full break-all rounded-[var(--radius-md)] bg-[var(--color-surface-inset)] p-3 text-center text-[length:var(--text-sm)]">
              {inviteUrl}
            </code>
            <Button fullWidth onClick={share}>
              {canShare ? 'Compartilhar link' : 'Copiar link'}
            </Button>
          </div>
        )}

        {mode === 'QRCODE' && (
          <div className="flex flex-col items-center gap-3">
            <QrCode
              value={inviteUrl}
              size={220}
              alt="QR Code de convite para a mesa"
            />
            <p className="text-center text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              Ou fale o código:
            </p>
            <p className="text-[length:var(--text-2xl)] font-bold tracking-widest">
              {joinCode}
            </p>
          </div>
        )}

        <p className="text-center text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          Quem entrar só precisa informar o nome.
        </p>
      </div>
    </BottomSheet>
  )
}
