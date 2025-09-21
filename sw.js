/* sw.js — dev-friendly + safe updates */
const STATIC_CACHE = 'bf-static-v9';   // <-- bump when you change assets
const STATIC_ASSETS = [
  './icons/192x192.png',
  './manifest.webmanifest?v=5',
  // add other real files you want cached (images, sounds, fonts…)
];

/* Install: cache static (NOT index.html) */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(STATIC_ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

/* Activate: clean old caches, enable nav preload */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== STATIC_CACHE) && caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
  })());
  self.clients.claim();
});

/* Messages: SKIP_WAITING + optional CLEAR_CACHES */
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data.type === 'CLEAR_CACHES') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    })());
  }
});

/* Fetch:
   - HTML/navigations -> network-first (so index.html is always fresh)
   - same-origin GET assets -> cache-first
*/
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // 1) Navigations / HTML -> network first, fallback to cache/offline
  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('Accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith((async () => {
      try {
        // navigation preload if available, else normal fetch
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const fresh = await fetch(req, { cache: 'no-store' });
        return fresh;
      } catch (err) {
        // fallback: cached index.html if you decide to precache it later
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match('./index.html')) ||
               new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // 2) Other same-origin GET (assets) -> cache first
  event.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(req, res.clone()).catch(()=>{});
    return res;
  })());
});
