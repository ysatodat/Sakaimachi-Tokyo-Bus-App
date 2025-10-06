const CACHE_NAME = 'sbm-static-v1';
const OFFLINE_FALLBACK = 'index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const scope = new URL(self.registration.scope);
      const basePath = scope.pathname.endsWith('/') ? scope.pathname : `${scope.pathname}/`;
      return cache.addAll([
        basePath,
        basePath + OFFLINE_FALLBACK,
        basePath + 'manifest.webmanifest'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(() => caches.match(requestUrl.pathname.endsWith('/') ? requestUrl.pathname : `${requestUrl.pathname}/`)
          .then((cachedPage) => cachedPage || caches.match(OFFLINE_FALLBACK))
        );
    })
  );
});
