/**
 * A small service worker, so the app opens when the signal does not.
 *
 * Network first, always. The cache is a fallback for when the network fails,
 * never a shortcut taken ahead of it — a cache-first worker on an app that
 * deploys this often would happily serve last week's build forever, and this
 * project has already lost an afternoon to stale code once.
 *
 * The API is never cached. A shared total read from a cache is a wrong
 * number, and a wrong number is worse than a spinner.
 */
const CACHE = 'petcommunity-v1';
const SHELL = ['/', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Shared data is never served from a cache.
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // A page we have never seen, with no network: hand back the shell and
        // let the app render its own offline state.
        if (request.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        throw new Error('offline');
      }),
  );
});
