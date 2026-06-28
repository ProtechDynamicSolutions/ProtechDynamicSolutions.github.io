/* Protech Invoices service worker - app shell cache for installable PWA */
const CACHE = 'protech-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = new URL(req.url);
  // Never intercept backend or CDN calls; only same-origin GETs are handled.
  if (url.origin !== location.origin || req.method !== 'GET') return;

  // The app page itself is fetched network-first, so a normal refresh always
  // gets the latest build when online, and falls back to cache when offline.
  var isDoc = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;
  if (isDoc) {
    e.respondWith(
      fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); }).catch(function () {});
        return resp;
      }).catch(function () {
        return caches.match(req).then(function (m) { return m || caches.match('./index.html'); });
      })
    );
    return;
  }

  // Other assets (icons, manifest): serve from cache fast, refresh in the background.
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        return resp;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
