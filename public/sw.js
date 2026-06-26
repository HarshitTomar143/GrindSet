/* Self-destructing service worker.
 * The previous version cached build assets and pinned stale bundles (it broke
 * dev and 404'd chunks). This worker unregisters itself, deletes every cache,
 * and reloads open tabs so the page is served straight from the network again.
 * It intentionally has NO fetch handler — nothing is intercepted.
 */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (e) {}
      try {
        await self.registration.unregister();
      } catch (e) {}
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => {
        try {
          client.navigate(client.url);
        } catch (e) {}
      });
    })()
  );
});
