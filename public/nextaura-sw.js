const CACHE = "nextaura-v1";

const PRECACHE = [
  "/nextaura-icon-192.png",
  "/nextaura-icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // API çağrılarını ve generate endpoint'ini network-only bırak
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Nextaura sayfaları: network-first, offline'da cache
  if (url.pathname.startsWith("/nextaura")) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Statik dosyalar: cache-first
  e.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request))
  );
});
