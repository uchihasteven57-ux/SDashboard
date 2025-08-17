const CACHE_NAME = 'static-cache-v1';
const DATA_CACHE_NAME = 'data-cache-v1';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  'https://unpkg.com/leaflet/dist/leaflet.css',
  'https://unpkg.com/leaflet/dist/leaflet.js'
];

const DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQUyjM9WjlMz2-T9d2rDQJV65gWL7swVtDAkg-ODkzonKOjnuykUKr2NlmGN0zqp35sYulYYJLmoUo6/pub?output=csv';

self.addEventListener('install', (evt) => {
  self.skipWaiting();
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (evt) => {
  if (evt.request.url.includes('output=csv')) {
    // Network-first for CSV, then cache fallback
    evt.respondWith(
      fetch(evt.request)
        .then((response) => {
          return caches.open(DATA_CACHE_NAME).then((cache) => {
            cache.put(evt.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(evt.request))
    );
    return;
  }

  // Cache-first for navigation & static assets
  evt.respondWith(
    caches.match(evt.request).then((cached) => {
      return cached || fetch(evt.request);
    })
  );
});