// ─── ControleGeral Service Worker v4.1 ───────────────────────────────────────
// Estratégia:
//   Supabase/BrasilAPI → sempre rede (dados não são cacheados)
//   CDN (React, XLSX, jsPDF) → Cache First (baixa 1x, serve sempre offline)
//   App shell (index.html, app.js) → Network First, fallback para cache

const CACHE = 'cgel-v4.1';
const CDN_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://unpkg.com/docx@8.5.0/build/index.umd.js',  // [B4.1-03] versão unificada
];

// Instala e pré-cacheia CDN + shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // Cacheia CDN silenciosamente (falha não é crítica)
      CDN_URLS.forEach(function(url) {
        cache.add(url).catch(function() {});
      });
      // Cacheia o shell da aplicação
      return cache.addAll(['/', '/index.html', '/src/app.js', '/manifest.json'])
        .catch(function() {});
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Remove caches antigos
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Intercepta todas as requisições
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // 1. Supabase e BrasilAPI — sempre rede, nunca cacheia dados
  if (url.includes('supabase.co') || url.includes('brasilapi.com.br')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // 2. CDN — Cache First (offline-friendly)
  if (url.includes('cdnjs.cloudflare.com') || url.includes('unpkg.com')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(resp) {
          if (resp.ok) {
            var clone = resp.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          }
          return resp;
        });
      })
    );
    return;
  }

  // 3. App shell — Network First, fallback para cache se offline
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function(resp) {
      if (resp.ok) {
        var clone = resp.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
      }
      return resp;
    }).catch(function() {
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('/index.html');
      });
    })
  );
});

// Mensagem de controle
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
