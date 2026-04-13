// ─── ControleGeral Service Worker v4.2 ───────────────────────────────────────
const CACHE = 'cgel-v4.2';
const CDN_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      CDN_URLS.forEach(function(url) { cache.add(url).catch(function() {}); });
      return cache.addAll(['index.html', 'app.js', 'brasao.js', 'manifest.json', './'])
        .catch(function(err) { console.warn('PWA Install: Cache Fail:', err); });
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  if (url.includes('supabase.co') || url.includes('brasilapi.com.br')) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify([]), {headers:{'Content-Type':'application/json'}})));
    return;
  }
  if (url.includes('cdnjs.cloudflare.com') || url.includes('jsdelivr.net')) {
    e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (resp.ok) { var clone = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
      return resp;
    })));
    return;
  }
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(resp => {
    if (resp.ok) { var clone = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
    return resp;
  }).catch(() => caches.match(e.request).then(cached => cached || caches.match('index.html'))));
});

self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
