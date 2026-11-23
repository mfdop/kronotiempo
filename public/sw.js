/* Kronotiempo service worker: Web Push only (no caching). */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch { payload = { body: event.data ? event.data.text() : '' } }
  const title = payload.title || 'Kronotiempo'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.tag || 'kronotiempo',
      data: { url: (payload.data && payload.data.url) || payload.url || '/agenda' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/agenda'
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      if ('focus' in c) {
        await c.focus()
        if ('navigate' in c) { try { await c.navigate(url) } catch { /* ignore */ } }
        return
      }
    }
    await self.clients.openWindow(url)
  })())
})
