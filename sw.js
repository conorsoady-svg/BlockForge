/* sw.js — update-prompt style */
const CACHE = "bf-static-v9";

/* Optional: very small precache (safe files only) */
self.addEventListener("install", (event) => {
  // Don’t block install on precache; keep it resilient
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll([
        "./",                // root
        "./index.html",      // or your main html file name
        "./manifest.webmanifest",
      ].map((u) => new URL(u, self.registration.scope).toString())
      ).catch(() => {})
    )
  );
  // Let the new SW move to "waiting" right away
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // cleanup old caches if you ever bump CACHE name
      const keys = await caches.keys();
      await Promise.all(keys.map(k => (k !== CACHE) && caches.delete(k)));
    })()
  );
  self.clients.claim();
});

/* Listen for the page asking us to take over now */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* Runtime caching: cache-first for same-origin GET, fall back to network */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req))
  );
});

