import { cn } from '@/ui/design-system/cn'

export interface AvatarProps {
  name: string
  muted?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'size-7 text-[length:var(--text-xs)]',
  md: 'size-9 text-[length:var(--text-sm)]',
  lg: 'size-12 text-[length:var(--text-base)]',
}

/** Iniciais determinísticas por nome; matiz derivado do nome (estável). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

function hue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}

export function Avatar({ name, muted, size = 'md', className }: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white',
        SIZES[size],
        muted && 'opacity-50 grayscale',
        className,
      )}
      style={{ backgroundColor: `oklch(0.6 0.13 ${hue(name)})` }}
    >
      {initials(name)}
    </span>
  )
}
