// Offline-Unterstützung: zeigt sofort die gespeicherte Version und aktualisiert im Hintergrund.
// Bei größeren Änderungen VERSION erhöhen, damit alte Caches gelöscht werden.
var VERSION = 'atemzeit-v1';
var ASSETS = ['./', 'index.html', 'styles.css', 'js/engine.js', 'js/content.js', 'js/ui.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(function (cache) {
    return cache.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(function () {
        return hit || (e.request.mode === 'navigate' ? cache.match('index.html') : undefined);
      });
      return hit || net;
    });
  }));
});
