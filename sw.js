const CACHE_NAME = 'quant-tasks-shell-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './theme-init.js',
  './favicon.svg',
  './app-icon.svg',
  './app-icon-192.png',
  './app-icon-512.png',
  './apple-touch-icon.png',
  './maskable-icon-512.png',
];

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);

  const indexUrl = new URL('./index.html', self.registration.scope);
  const response = await fetch(indexUrl, { cache: 'reload' });
  if (!response.ok) throw new Error(`Unable to precache app shell: ${response.status}`);
  await cache.put(indexUrl, response.clone());

  const html = await response.text();
  const assetUrls = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
    .map(match => new URL(match[1], indexUrl))
    .filter(url => url.origin === self.location.origin);
  await Promise.all(assetUrls.map(url => cache.add(url)));
}

self.addEventListener('install', event => {
  event.waitUntil(precacheShell());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(async () => (
          await caches.match(request)
          || await caches.match(new URL('./index.html', self.registration.scope))
          || Response.error()
        )),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
      return cached || network;
    }),
  );
});
