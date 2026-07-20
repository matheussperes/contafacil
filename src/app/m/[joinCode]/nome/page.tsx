import { NameScreen } from '@/ui/features/table/NameScreen'

export default async function Page({
  params,
}: {
  params: Promise<{ joinCode: string }>
}) {
  const { joinCode } = await params
  return <NameScreen joinCode={joinCode.toUpperCase()} />
}
