// Minimal service worker: enables "Add to Home Screen" installability.
// No offline caching yet — intentionally simple for MVP.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // no-op: pass through to network
});
