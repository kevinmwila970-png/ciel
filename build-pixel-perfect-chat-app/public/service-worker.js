const CACHE = "sage-app-v4-vision";
const PRECACHE = ["/", "/manifest.json", "/favicon.ico", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const page = await fetch("/", { cache: "reload" });
    if (page.ok) {
      await cache.put("/", page.clone());
      const html = await page.text();
      const assets = [...new Set(Array.from(html.matchAll(/(?:src|href)="(\/_next\/static\/[^"<>]+)"/g), (match) => match[1]))];
      await Promise.allSettled(assets.map((url) => cache.add(url)));
    }
    await Promise.allSettled(PRECACHE.filter((url) => url !== "/").map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("sage-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }).catch(async () => {
      const hit = await caches.match(request);
      if (hit) return hit;
      if (request.mode === "navigate") return (await caches.match("/")) || Response.error();
      return Response.error();
    }),
  );
});
