const APP_CACHE = 'shr-app-cache-v3';
const RUNTIME_CACHE = 'shr-runtime-cache-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons.svg',
  '/pwa-192.png',
  '/pwa-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== APP_CACHE && key !== RUNTIME_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put('/index.html', copy);
          });
          return response;
        })
        .catch(async () => {
          const offlinePage = await caches.match('/offline.html');
          const cachedShell = await caches.match('/index.html');
          return offlinePage || cachedShell || Response.error();
        }),
    );
    return;
  }

  if (isSameOrigin && url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseCopy = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseCopy);
          });

          return networkResponse;
        })
        .catch(() => {
          if (request.destination === 'document') {
            return caches.match('/offline.html').then((offlinePage) => offlinePage || caches.match('/index.html'));
          }
          return Response.error();
        });
    }),
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag !== 'shr-sync-outbox') return;

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' });
      });
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
