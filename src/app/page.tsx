import Link from 'next/link'

// Placeholder da Home — a FASE 07 substitui pelo fluxo real.
export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-[length:var(--text-2xl)] font-bold">ContaFácil</h1>
      <p className="text-[var(--color-text-muted)]">
        Divida a conta do bar em tempo real, sem sobrar nem faltar.
      </p>
      <Link
        href="/design"
        className="text-[var(--color-brand-600)] underline"
      >
        Ver o design system →
      </Link>
    </main>
  )
}
