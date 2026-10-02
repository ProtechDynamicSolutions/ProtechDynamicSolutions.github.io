/* Cork Grocers Club — service worker.
   The page is network-first so a redeploy reaches everyone at once (a cache-first page would
   serve the first version forever); static files are cache-first. The club server and the intro
   film are never cached here. Push messages carry no payload: we fetch the text ourselves. */
var VERSION = 'e775ae44fb';
var CACHE = 'gc-' + VERSION;
var STATIC = ["./","index.html","manifest.webmanifest","crest.png","crest-256.png","crest-96.png","felt.jpg","poster.jpg","jsqr.js","icons/apple-touch-icon.png","icons/badge-72.png","icons/favicon-16.png","icons/favicon-32.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","fonts/inter-400.woff2","fonts/inter-500.woff2","fonts/inter-600.woff2","fonts/inter-700.woff2","fonts/playfair-display-400-italic.woff2","fonts/playfair-display-600-700.woff2"];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(STATIC.map(function (u) { return c.add(u).catch(function () { /* one missing file must not stop the install */ }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('gc-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function isPage(req, url) {
  return req.mode === 'navigate' || /\/$/.test(url.pathname) || /\/index\.html$/.test(url.pathname);
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // the club server, fonts from elsewhere, etc.
  if (/\.mp4$/.test(url.pathname) || req.headers.get('range')) return; // video uses range requests
  if (/\/config\.js$/.test(url.pathname)) {                   // tiny, but must never go stale
    e.respondWith(fetch(req).catch(function () { return caches.match(req); }));
    return;
  }
  if (isPage(req, url)) {
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || caches.match('./index.html') || caches.match('./'); });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    });
    return hit || net;
  }));
});

/* ── push ─────────────────────────────────────────────────────────────────────────────────── */
function kv(key) {
  return new Promise(function (resolve) {
    try {
      var open = indexedDB.open('gc', 1);
      open.onupgradeneeded = function () { open.result.createObjectStore('kv'); };
      open.onsuccess = function () {
        try {
          var r = open.result.transaction('kv', 'readonly').objectStore('kv').get(key);
          r.onsuccess = function () { resolve(r.result); };
          r.onerror = function () { resolve(null); };
        } catch (err) { resolve(null); }
      };
      open.onerror = function () { resolve(null); };
    } catch (err) { resolve(null); }
  });
}

self.addEventListener('push', function (e) {
  var fallback = { title: 'Cork Grocers Club', body: 'There is news from the club. Tap to read it.', url: './#/news' };
  e.waitUntil(Promise.all([kv('token'), kv('api')]).then(function (v) {
    var token = v[0], api = v[1];
    if (!token || !api) return fallback;
    return fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ a: 'push.latest', t: token, d: {} }) })
      .then(function (r) { return r.json(); })
      .then(function (res) { return res && res.ok && res.d && res.d.title ? res.d : fallback; })
      .catch(function () { return fallback; });
  }).then(function (msg) {
    return self.registration.showNotification(msg.title, {
      body: msg.body || '', icon: 'icons/icon-192.png', badge: 'icons/badge-72.png',
      data: { url: msg.url || './#/news' }, tag: msg.tag || 'gc-news', renotify: true
    });
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || './#/news';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if ('focus' in list[i]) { list[i].navigate(new URL(target, self.registration.scope).href).catch(function () { /* old browsers */ }); return list[i].focus(); }
    }
    return self.clients.openWindow(new URL(target, self.registration.scope).href);
  }));
});
