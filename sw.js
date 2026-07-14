/* AD Training service worker — cache-first app shell, versioned cache.
   Bump CACHE_VERSION on every deploy to invalidate old caches. */
'use strict';

const CACHE_VERSION = 'v1';
const CACHE_NAME = `adtrain-${CACHE_VERSION}`;
const FONT_CACHE = `adtrain-fonts-${CACHE_VERSION}`;

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './app.js',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME && k !== FONT_CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  // Google Fonts: cache-first, populate on first online use so offline keeps working
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(event.request).then(hit => hit || fetch(event.request).then(res => {
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        }))
      )
    );
    return;
  }

  // App shell: cache-first with network fallback (and cache the fallback)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then(hit => hit || fetch(event.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html')))
    );
  }
});
