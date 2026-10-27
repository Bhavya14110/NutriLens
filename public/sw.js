/* NutriLens service worker - hand-rolled so it works with Turbopack builds (see DECISIONS.md).
   app shell: network-first pages with cached fallback, cache-first static assets,
   offline page when nothing else works, and web push for expiry reminders. */

const V = "v1";
const SHELL = `nl-shell-${V}`;
const PAGES = `nl-pages-${V}`;
const IMG = `nl-img-${V}`;
const PRECACHE = ["/offline", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];
// only these pages get a cached copy for offline starts
const APP_PAGES = ["/home", "/pantry", "/shop", "/recipes", "/more", "/settings", "/insights", "/drinks"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("nl-") && !k.endsWith(V)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // signing out: drop cached pages so the next person doesn't see them
  if (req.method === "POST" && url.pathname === "/auth/signout") {
    e.waitUntil(caches.delete(PAGES));
    return;
  }
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // api data is cached by the app itself (per user), never here
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(SHELL).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/image")) {
    e.respondWith(
      caches.open(IMG).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) {
          c.put(req, res.clone());
          trim(IMG, 120);
        }
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const keep = APP_PAGES.includes(url.pathname) && res.ok && !res.redirected;
          if (keep) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname, { cacheName: PAGES })) || (await caches.match("/offline")) || Response.error()),
    );
  }
});

self.addEventListener("push", (e) => {
  let msg = { title: "NutriLens", body: "Something in your pantry needs attention.", url: "/pantry", tag: "nutrilens" };
  try {
    if (e.data) msg = { ...msg, ...e.data.json() };
  } catch {
    if (e.data) msg.body = e.data.text();
  }
  e.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      tag: msg.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/maskable-192.png",
      data: { url: msg.url },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const to = (e.notification.data && e.notification.data.url) || "/home";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          w.navigate(to);
          return w.focus();
        }
      }
      return self.clients.openWindow(to);
    }),
  );
});
