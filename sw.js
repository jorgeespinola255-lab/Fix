// FixFlow · service worker: abre la app aunque no haya internet.
// Estrategia: intenta la red (para tener siempre la última versión) y, si falla o tarda, usa la copia guardada.
const V = "fixflow-v1";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  const net = fetch(r)
    .then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); }
      return res;
    })
    .catch(() => null);
  const wait = new Promise(done => setTimeout(() => done(null), 3500));
  e.respondWith(
    Promise.race([net, wait])
      .then(res => res || caches.match(r))
      .then(res => res || caches.match("./index.html"))
      .then(res => res || net)
      .then(res => res || new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }))
  );
});
