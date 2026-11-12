var CACHE = 'site-reports-365f8fc';
var SHELL = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './lib/jspdf.umd.min.js'].concat(["https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js","https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"]);
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return Promise.all(SHELL.map(function (u) { return c.add(new Request(u, { mode: u.indexOf('http') === 0 ? 'cors' : 'same-origin' })).catch(function () {}); })); }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }));
  self.clients.claim();
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  var cdn = u.hostname === 'cdnjs.cloudflare.com' || /^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (u.origin !== location.origin && !cdn) return;
  if (/[?&]reach=/.test(u.search)) return;   // the app checking it has signal: never from the cache
  if (r.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname)) {
    e.respondWith(fetch(r).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put('./', copy); }); }
      return res;
    }).catch(function () { return caches.match('./').then(function (m) { return m || Response.error(); }); }));
    return;
  }
  e.respondWith(caches.match(r, { ignoreVary: true }).then(function (m) {
    var net = fetch(r).then(function (res) { if (res.ok || res.type === 'opaque') { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, cp); }); } return res; });
    if (m) { net.catch(function () {}); return m; }
    return net;
  }));
});
