// SwimBuddy service worker — offline caching + Background Sync

const CACHE = 'swimbuddy-v1';
const SYNC_TAG = 'swimbuddy-sync';

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['/', '/index.html']),
    ),
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/sync') || url.pathname.startsWith('/auth')) {
    // network only for API routes
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, clone));
        return res;
      });
      return cached ?? network;
    }),
  );
});

// Background Sync: replay queued mutations
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushMutations());
  }
});

async function flushMutations() {
  // The sync client runs in the main thread; signal it to flush.
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'BACKGROUND_SYNC_TRIGGER' });
  }
}
