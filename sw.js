// ─── ControleGeral Service Worker v4.0 ───────────────────────────────────────
const CACHE = "cgel-v4.0";
const ASSETS = ["/", "/index.html", "/manifest.json"];
const CDN_CACHE = [
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://unpkg.com/docx@7.8.2/build/index.umd.js",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled([
        ...ASSETS.map(u => c.add(u).catch(() => {})),
        ...CDN_CACHE.map(u => c.add(u).catch(() => {})),
      ])
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Supabase — sempre rede, nunca cacheia dados do banco
  if (url.hostname.includes("supabase.co") || url.hostname.includes("brasilapi.com.br")) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } })
    ));
    return;
  }
  // CDN — cache first
  if (url.hostname.includes("cdnjs.") || url.hostname.includes("unpkg.com")) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
        if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        return r;
      }))
    );
    return;
  }
  // App shell — network first, cache fallback
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok && e.request.method === "GET") {
        caches.open(CACHE).then(c => c.put(e.request, r.clone()));
      }
      return r;
    }).catch(() => caches.match(e.request))
  );
});

self.addEventListener("message", e => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});
