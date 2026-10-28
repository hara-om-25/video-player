// Офлайн-кеш застосунку (збирає build.py). Діє лише в його папці.
// Спершу кеш — застосунок відкривається миттєво й без інтернету (і при поганому зв'язку не чекає мережу).
// Нові версії приходять так: сторінка сама порівнює APP_VER на сайті (checkUpdate, запит з ?u=… — лише мережа),
// просить оновити цей файл; новий sw.js з новим CACHE завантажує свіжі файли — і сторінка перезапускається.
const CACHE = 'video-player-v138';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './fonts/tektur-cyrillic.woff2', './fonts/tektur-cyrillic-ext.woff2', './fonts/tektur-latin.woff2', './fonts/tektur-latin-ext.woff2'];

self.addEventListener('install', e => {
  // cache: 'reload' — повз кеш браузера, щоб у новий кеш не потрапили старі файли
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k.startsWith('video-player-') && k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
const INBOX = 'share-video-player';     // не з префіксом CACHE — інакше activate її стер би
self.addEventListener('fetch', e => {
  const req = e.request;
  // «Поділитися» → файли кладемо у вхідні й відкриваємо застосунок; сторінка забере їх у плейлист
  if (req.method === 'POST' && new URL(req.url).searchParams.has('share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await req.formData(), box = await caches.open(INBOX);
        let n = 0;
        for (const f of fd.getAll('media')) {
          if (!f || typeof f === 'string') continue;
          await box.put('./__share/' + Date.now() + '-' + (n++), new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name || 'video') } }));
        }
      } catch (err) {}
      return Response.redirect('./?shared=' + Date.now(), 303);
    })());
    return;
  }
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.searchParams.has('u')) return;   // перевірка оновлення — повз кеш
  e.respondWith((async () => {
    const nav = req.mode === 'navigate';
    const hit = await caches.match(req, { ignoreSearch: true }) || (nav && (await caches.match('./') || await caches.match('./index.html')));
    if (hit) return hit;
    try {
      const resp = await fetch(req);
      if (resp && resp.ok) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return resp;
    } catch (err) {
      return (await caches.match('./index.html')) || Response.error();
    }
  })());
});
