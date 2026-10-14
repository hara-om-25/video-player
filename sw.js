// Офлайн-кеш застосунку (збирає build.py). Діє лише в його папці.
const CACHE = 'video-player-v96';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './fonts/tektur-cyrillic.woff2', './fonts/tektur-cyrillic-ext.woff2', './fonts/tektur-latin.woff2', './fonts/tektur-latin-ext.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k.startsWith('video-player-') && k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
// Спершу мережа (щоб оновлення приходили одразу), без мережі — кеш
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const fresh = e.request.mode === 'navigate'
    ? fetch(e.request.url, { cache: 'reload' })
    : fetch(e.request);
  e.respondWith(fresh.then(resp => {
    if (resp && resp.ok) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return resp;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
});
