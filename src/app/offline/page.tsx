// Página servida pelo service worker quando offline sem cache (FASE 12).
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-5xl">📶</div>
      <h1 className="text-[length:var(--text-xl)] font-bold">Você está offline</h1>
      <p className="text-[var(--color-text-muted)]">
        Sem conexão no momento. Assim que a internet voltar, a mesa
        sincroniza sozinha.
      </p>
    </main>
  )
}
