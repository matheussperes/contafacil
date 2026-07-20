import { JoinScreen } from '@/ui/features/table/JoinScreen'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams
  return <JoinScreen initialCode={code?.toUpperCase() ?? ''} />
}
