var CACHE = 'cgel-v4.5';
var ASSETS = [
  './',
  'index.html',
  'app.js',
  'brasao.js',
  'manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // Try to add all, but don't fail entire install if one fails
      return Promise.all(ASSETS.map(function(url) {
        return cache.add(url).catch(function(err) { console.warn('Fail asset:', url); });
      }));
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  if (url.indexOf('supabase.co') !== -1 || url.indexOf('brasilapi.com.br') !== -1) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(res) {
        if (res.ok) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() {
        if (e.request.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
