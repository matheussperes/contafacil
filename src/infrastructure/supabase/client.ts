/**
 * Ponto único de criação do client Supabase (ADR-003) e da sessão
 * anônima (ADR-006). Nenhum outro módulo instancia o client.
 */
import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from '@supabase/supabase-js'
import { InfrastructureError } from '@/application/errors'

export type AppSupabaseClient = SupabaseClient

let singleton: AppSupabaseClient | null = null

export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<'public'>,
): AppSupabaseClient {
  return createClient(url, anonKey, options)
}

/** Client do app (browser): singleton com sessão persistida. */
export function getSupabaseClient(): AppSupabaseClient {
  if (singleton !== null) return singleton
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new InfrastructureError('SUPABASE_NAO_CONFIGURADO', false)
  }
  singleton = createSupabaseClient(url, anonKey)
  return singleton
}

/**
 * Client preguiçoso: o client real só é criado no PRIMEIRO acesso a uma
 * propriedade (sempre client-side, numa interação). Assim a composição
 * pode ser construída durante o prerender/SSR sem exigir env do Supabase
 * — páginas client não executam queries no servidor.
 */
export function lazySupabaseClient(): AppSupabaseClient {
  return new Proxy({} as AppSupabaseClient, {
    get(_target, prop, receiver) {
      const real = getSupabaseClient() as unknown as Record<string, unknown>
      const value = Reflect.get(real, prop, receiver)
      return typeof value === 'function' ? value.bind(real) : value
    },
  })
}

/**
 * Garante identidade anônima do dispositivo (ADR-006): reutiliza a
 * sessão persistida ou cria um usuário anônimo — invisível ao usuário.
 */
export async function ensureAnonymousSession(
  client: AppSupabaseClient,
): Promise<string> {
  const { data } = await client.auth.getSession()
  const existing = data.session?.user.id
  if (existing) return existing
  const { data: signed, error } = await client.auth.signInAnonymously()
  if (error || !signed.user) {
    throw new InfrastructureError('AUTH_ANONIMA_FALHOU', true, error)
  }
  return signed.user.id
}
