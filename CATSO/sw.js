/* CATSO drill service worker. App shell cached on install, audio cached on demand. */
const SHELL = 'catso-shell-v3';
const AUDIO = 'catso-audio-v1';
const FILES = ['./', './index.html', './manifest.json', './app.webmanifest'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== SHELL && k !== AUDIO).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;          /* let fonts go to the network */
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const bucket = /\/audio\//.test(url.pathname) ? AUDIO : SHELL;
      const copy = res.clone();
      caches.open(bucket).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
