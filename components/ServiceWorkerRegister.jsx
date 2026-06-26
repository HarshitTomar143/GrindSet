"use client";

import { useEffect } from "react";

// The offline service worker was removed — it pinned stale bundles and broke
// dev. This component now only cleans up: it unregisters any worker a previous
// build installed and clears its caches. It never registers a new one.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => keys.forEach((k) => caches.delete(k)))
        .catch(() => {});
    }
  }, []);
  return null;
}
