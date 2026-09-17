/**
 * Sakaimachi Bus Mini — Service Worker
 *
 * 方針
 * - HTML（ナビゲーション）は network-first。オフライン時のみキャッシュを返すので、
 *   ダイヤを更新したらリロードで必ず新しい内容になる。
 * - ビルド成果物（内容ハッシュ付き）と画像は cache-first。
 * - 古いバージョンのキャッシュは activate 時に破棄する。
 */

const VERSION = 'v3';
const PRECACHE = `sbm-precache-${VERSION}`;
const RUNTIME = `sbm-runtime-${VERSION}`;

const scopePath = (() => {
  const scope = new URL(self.registration.scope);
  return scope.pathname.endsWith('/') ? scope.pathname : `${scope.pathname}/`;
})();

const PRECACHE_URLS = [
  scopePath,
  `${scopePath}sakai-to-tokyo/`,
  `${scopePath}tokyo-to-sakai/`,
  `${scopePath}timetable/`,
  `${scopePath}manifest.webmanifest`,
  `${scopePath}favicon.svg`
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) =>
      // 1 つでも失敗すると addAll 全体が失敗するため、個別に取得する
      Promise.all(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((response) => (response.ok ? cache.put(url, response) : undefined))
            .catch(() => undefined)
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== PRECACHE && key !== RUNTIME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

const isAsset = (url) =>
  url.pathname.startsWith(`${scopePath}_astro/`) ||
  /\.(?:css|js|png|jpg|jpeg|svg|webp|woff2?|ico)$/.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML は network-first（最新のダイヤを優先）
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request, { ignoreSearch: true })
            .then((cached) => cached || caches.match(scopePath, { ignoreSearch: true }))
            .then(
              (cached) =>
                cached ||
                new Response(
                  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>オフライン</title><body style="font-family:system-ui;padding:32px"><h1>オフラインです</h1><p>一度表示したページはオフラインでも開けます。通信が回復してから再度お試しください。</p></body></html>',
                  { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
                )
            )
        )
    );
    return;
  }

  // 静的アセットは cache-first
  if (isAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok && response.type === 'basic') {
              const copy = response.clone();
              caches.open(RUNTIME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
});
