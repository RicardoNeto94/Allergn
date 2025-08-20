
const CACHE = 'shangshi-v3-722628';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=722628',
  './app.js?v=722628',
  './menu.json',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './sw-v3.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE && caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('.json')) {
    e.respondWith(fetch(e.request).then(resp => { caches.open(CACHE).then(c=>c.put(e.request, resp.clone())); return resp; }).catch(()=>caches.match(e.request)));
  } else {
    e.respondWith(caches.match(e.request).then(m => m || fetch(e.request)));
  }
});
