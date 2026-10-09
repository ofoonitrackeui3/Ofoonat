/* Service Worker for عفونی PWA — offline shell
   Fonts are embedded inside index.html (base64). Do not alter fonts. */
const CACHE_NAME = 'afuni-study-shell-v2';
const ROOT_URL = new URL('./', self.registration.scope);
const APP_URL = new URL('index.html', ROOT_URL).href;
const PRECACHE_URLS = [
  APP_URL,
  new URL('manifest.webmanifest', ROOT_URL).href,
  new URL('icons/icon-192.png', ROOT_URL).href,
  new URL('icons/icon-512.png', ROOT_URL).href
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);

  // Only handle same-origin requests
  if (requestUrl.origin !== self.location.origin) return;

  // Navigation requests → network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(APP_URL, copy));
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) ||
                 (await caches.match(APP_URL)) ||
                 Response.error();
        })
    );
    return;
  }

  // Other assets → cache first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(APP_URL));
    })
  );
});
