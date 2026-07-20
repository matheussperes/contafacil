/**
 * Service worker do ContaFácil (FASE 12) — estratégia de cache conforme
 * estrategia-offline.md:
 * - navegações: network-first com fallback ao shell em cache (L1/L2);
 * - assets estáticos: stale-while-revalidate;
 * - dados do Supabase e /api NUNCA são cacheados (estado vivo).
 */
const VERSION = 'contafacil-v1'
const SHELL = ['/', '/offline']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
      ),
  )
  self.clients.claim()
})

function isBypassed(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('supabase.co')
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (isBypassed(url)) return // estado vivo: sempre rede

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put(request, copy))
          return res
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline')),
        ),
    )
    return
  }

  // assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
