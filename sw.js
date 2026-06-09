/* Vimarsha service worker — network-first (always fresh online), cache fallback for offline.
   Bump CACHE to force-refresh caches on a breaking change. */
const CACHE = 'vimarsha-v2';
const SHELL = [
  './', 'index.html', 'styles.css', 'config.js', 'stretches.js', 'app.js',
  'manifest.json', 'logo-mark.png', 'icon-512.png', 'hero.svg', 'upi-qr.png',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});
