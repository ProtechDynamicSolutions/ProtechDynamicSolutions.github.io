/* VSOP service worker
   Shell cached so the app opens with no signal. Map tiles you have already
   looked at are kept, so the water you browsed ashore is there at sea.
   Bump SHELL when you change index.html. */
var SHELL = "vsop-shell-v1";
var TILES = "vsop-tiles-v1";
var TILE_CAP = 1200;

var CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./logo.txt",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/esri-leaflet@3.0.12/dist/esri-leaflet.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) {
      /* one bad URL must not fail the whole install */
      return Promise.all(CORE.map(function (u) {
        return c.add(new Request(u, { mode: "no-cors" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL && k !== TILES) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isTile(url) {
  return /tile\.openstreetmap\.org|tiles\.openseamap\.org|emodnet-bathymetry\.eu|maps\.marine\.ie/.test(url);
}
function isLive(url) {
  return /open-meteo\.com|overpass|api\.open/.test(url);
}

async function trimTiles() {
  var c = await caches.open(TILES);
  var keys = await c.keys();
  if (keys.length > TILE_CAP) {
    for (var i = 0; i < keys.length - TILE_CAP; i++) await c.delete(keys[i]);
  }
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = req.url;

  /* Weather and hazards: always try the network, never serve a stale answer
     as if it were current. */
  if (isLive(url)) {
    e.respondWith(fetch(req).catch(function () {
      return new Response('{"error":"offline"}', { headers: { "Content-Type": "application/json" } });
    }));
    return;
  }

  /* Map tiles: cache first, then fill in behind. */
  if (isTile(url)) {
    e.respondWith(
      caches.open(TILES).then(function (c) {
        return c.match(req).then(function (hit) {
          var net = fetch(req).then(function (res) {
            if (res && (res.ok || res.type === "opaque")) {
              c.put(req, res.clone());
              trimTiles();
            }
            return res;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
    return;
  }

  /* Everything else: cache first, refresh in the background. */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(SHELL).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
