var CACHE = 'ft-insp-1d5b538';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './lib/jspdf.umd.min.js'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }));
  self.clients.claim();
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  var fonts = /^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (u.origin !== location.origin && !fonts) return;
  if (/[?&]reach=/.test(u.search)) return;   // the app checking it has signal: never from the cache
  // the page and config.js: network first, so a new version or a new office link reaches every phone
  if (r.mode === 'navigate' || /\/(index\.html|config\.js)?$/.test(u.pathname)) {
    var key = /config\.js$/.test(u.pathname) ? './config.js' : './';
    e.respondWith(fetch(r).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(key, copy); }); }
      return res;
    }).catch(function () { return caches.match(key).then(function (m) { return m || (key === './' ? undefined : new Response('', { status: 404 })); }); }));
    return;
  }
  e.respondWith(caches.match(r).then(function (m) {
    var net = fetch(r).then(function (res) { if (res.ok || res.type === 'opaque') { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, cp); }); } return res; });
    if (m) { net.catch(function () {}); return m; }
    return net;
  }));
});
