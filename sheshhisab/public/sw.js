const CACHE_PREFIX = "sheshhisab-static";
const CACHE_NAME = `${CACHE_PREFIX}-v1`;
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icon-192.png",
  "/icon-512.png",
  "/brand-mark.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheableStaticRequest(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return false;
  }

  return (
    url.pathname.startsWith("/_next/static/") ||
    PRECACHE_URLS.includes(url.pathname)
  );
}

function safeAppUrl(value) {
  try {
    const candidate = new URL(value, self.location.origin);
    if (
      candidate.origin === self.location.origin &&
      (candidate.pathname === "/app" || candidate.pathname.startsWith("/app/"))
    ) {
      return candidate;
    }
  } catch {
    // Fall through to the activity screen.
  }

  return new URL("/app/activity", self.location.origin);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL);
        return cached ?? Response.error();
      }),
    );
    return;
  }

  if (!isCacheableStaticRequest(request, url)) return;

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    }),
  );
});

function notificationData(event) {
  if (!event.data) return null;

  try {
    const value = event.data.json();
    if (!value || typeof value !== "object") return null;

    const title = typeof value.title === "string" ? value.title.trim() : "";
    const body = typeof value.body === "string" ? value.body.trim() : "";
    if (!title || !body) return null;

    let url = "/app/activity";
    if (typeof value.url === "string") {
      const candidate = safeAppUrl(value.url);
      url = `${candidate.pathname}${candidate.search}${candidate.hash}`;
    }

    return {
      title: title.slice(0, 80),
      options: {
        body: body.slice(0, 240),
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: typeof value.tag === "string" ? value.tag.slice(0, 80) : undefined,
        data: { url },
      },
    };
  } catch {
    return null;
  }
}

self.addEventListener("push", (event) => {
  const notification = notificationData(event);
  if (!notification) return;

  event.waitUntil(
    self.registration.showNotification(
      notification.title,
      notification.options,
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath =
    typeof event.notification.data?.url === "string"
      ? event.notification.data.url
      : "/app/activity";
  const targetUrl = safeAppUrl(targetPath);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windowClients) => {
        for (const client of windowClients) {
          if (new URL(client.url).origin !== targetUrl.origin) continue;
          if ("navigate" in client) await client.navigate(targetUrl.href);
          return client.focus();
        }
        return self.clients.openWindow(targetUrl.href);
      }),
  );
});
