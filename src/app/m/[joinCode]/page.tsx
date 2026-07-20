import type { Metadata } from 'next'
import { TableRoute } from '@/ui/features/table/TableRoute'

// OG do convite (F2): metadados no servidor para preview rico no
// WhatsApp/Telegram — sem expor valores, só nome e código (ADR-002).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ joinCode: string }>
}): Promise<Metadata> {
  const { joinCode } = await params
  const code = joinCode.toUpperCase()
  const title = `Entrar na mesa ${code} — ContaFácil`
  const description = 'Você foi convidado para dividir a conta. Toque para entrar.'
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ joinCode: string }>
}) {
  const { joinCode } = await params
  return <TableRoute joinCode={joinCode.toUpperCase()} />
}
