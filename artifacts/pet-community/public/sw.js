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

/**
 * A push arrives. Show it — always.
 *
 * Apple revokes a site's notification permission if it receives a push and
 * shows nothing, so there is no early return anywhere in here. Even a push we
 * cannot make sense of gets a notification, because a vague alert is better
 * than losing the ability to send any.
 */
self.addEventListener('push', (event) => {
  let note = { title: 'A pet is missing nearby', body: 'Open PetCommunity to see the search map.', url: '/lost-pets' };
  try {
    if (event.data) {
      const sent = event.data.json();
      note = {
        title: typeof sent.title === 'string' ? sent.title : note.title,
        body: typeof sent.body === 'string' ? sent.body : note.body,
        url: typeof sent.url === 'string' ? sent.url : note.url,
      };
    }
  } catch {
    /* Unreadable payload: the default above still gets shown. */
  }

  event.waitUntil(
    self.registration.showNotification(note.title, {
      body: note.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'lost-pet',
      data: { url: note.url },
    }),
  );
});

/** Tapping it should land on the search map, not a fresh copy of the app. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/lost-pets';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
