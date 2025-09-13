// sw.js — instant-update service worker
// Bump this version whenever you change what you cache
const CACHE = 'bf-v3';

// Put files you want pre-cached here (keep paths relative to index.html)
const PRECACHE = [
  './',                 // your index.html
  './manifest.webmanifest',
  './icons/192x192.png',
  './icons/512x512.png',
];

self.addEventListener('install', (event) => {
  // Precache and activate immediately
  event.waitUntil((async () => {
    try {
      const c = await caches.open(CACHE);
      await c.addAll(PRECACHE);
    } catch (e) {
      // Some files may 404 on first publish; that's ok
      console.warn('[SW] precache skipped items:', e);
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean old caches and take control of clients
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();

    // Let any open pages know we’re active (optional)
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED' }));
  })());
});

// Let the page tell us to skip waiting (safety net)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Basic cache-first for GET requests within our origin
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GETs to same-origin
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    // If not cached, go to network and (optionally) cache a copy
    const res = await fetch(req);
    try {
      const c = await caches.open(CACHE);
      c.put(req, res.clone());
    } catch (e) {
      // Ignore caching errors (opaque responses, etc.)
    }
    return res;
  })());
});
