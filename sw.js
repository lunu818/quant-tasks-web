// 构建时由 vite.config.ts 的 stampServiceWorker 替换成本次构建的指纹：
// 文件字节一变，浏览器才会安装新的 Service Worker，客户端才会收到"已更新"提示。
const BUILD_ID = '03fa66756b79';
const CACHE_NAME = `quant-tasks-shell-${BUILD_ID}`;
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
    // 绕过 HTTP 缓存（GitHub Pages 给 index.html 十分钟 max-age），冷启动必拿最新入口；
    // 不直接复用 navigate 模式的 Request 构造，旧版 WebKit 会抛错。
    event.respondWith(
      fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })
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
