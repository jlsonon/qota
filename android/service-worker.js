// QOTA Android PWA Offline Cache Service Worker
const CACHE_NAME = 'qota-android-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
