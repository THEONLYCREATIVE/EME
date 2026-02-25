/**
 * sw.js — Service Worker
 * Offline-first: cache-first for local, stale-while-revalidate for CDN
 */
const CACHE_NAME = 'no7-analytics-v2';
const PRECACHE_URLS = [
  './', './index.html', './manifest.json',
  './css/tokens.css', './css/base.css', './css/layout.css',
  './css/components.css', './css/animations.css',
  './js/app.js', './js/data/bp.js', './js/store/index.js',
  './js/services/db.js', './js/services/auth.js',
  './js/services/ocr.js', './js/services/sync.js', './js/services/teams.js',
  './js/utils/calc.js', './js/utils/format.js',
  './js/utils/export.js', './js/utils/ui.js',
  './js/views/login.js', './js/views/entry.js',
  './js/views/analysis.js', './js/views/staff.js', './js/views/admin.js',
];
const CDN_PATTERN = /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com/;

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE_URLS).catch(() => {})));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (CDN_PATTERN.test(url.hostname)) {
    e.respondWith(staleWhileRevalidate(e.request)); return;
  }
  e.respondWith(cacheFirst(e.request));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE_NAME)).put(req, res.clone());
    return res;
  } catch {
    return req.mode === 'navigate' ? caches.match('./index.html') : new Response('Offline', { status: 503 });
  }
}
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  const fetchP = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
  return cached || fetchP;
}
