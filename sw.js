/* FRZFRM Weather Catch: keeps the app's own files on the phone so it opens without a signal.
   The app's files are fetched fresh when online and fall back to the saved copy when offline.
   Weather and place-name requests always go to the network. The animal spotter's files are left alone here: the
   spotter keeps them in a cache of its own, which is kept through updates. */
var CACHE = 'frzfrm-wc-0.17.0';
var FONTS = 'frzfrm-wc-fonts';
var SHELL = ['./', './index.html', './app.css', './sfx.js', './rules.js', './sky.js', './variants.js', './kit.js', './jars-rain.js', './jars-wonders.js', './jars-storm.js', './animals.js', './zoo.js', './zoo-art.js', './seek.js', './seek-levels.js', './hop.js', './spotter.js', './game.js', './photocheck.js', './app.js', './manifest.webmanifest', './storms.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== FONTS && k.indexOf('frzfrm-spotter') !== 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname.indexOf('/spotter/') !== -1) return;
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
      });
    }));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
  }
});
