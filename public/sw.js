// TRAK service worker — push notifications + offline app-shell caching.
//
// Caching strategy (Phase 3B):
// - Static assets (/_next/static/*, /_next/image/*, precached icons):
//   cache-first. Next.js build output is content-hashed, so cached
//   bundles can never go stale within a deploy.
// - App navigations (document loads): network-first, then the cached
//   copy of the same page, then this session's cached /dashboard shell,
//   then a minimal offline fallback page. Only 200 HTML responses are
//   cached — redirects (e.g. /login) and error pages never poison the
//   cache.
// - GET /api/bootstrap: network-first with a cached fallback so the
//   client bootstrap has data even before IndexedDB warms up. Only 200
//   responses are cached — 401s and errors are never stored.
// - Next.js RSC flight responses (client-side `<Link>` navigations send
//   GET requests with the `RSC: 1` header): network-first so previously
//   visited routes keep working through soft navigation while offline.
// - Auth isolation: authenticated pages, /api/bootstrap, and RSC payloads
//   all embed per-user data, so they are NEVER cached globally. They are
//   only stored under a per-login session key namespace
//   (`trak-<kind>-<sw-version>-<session-key>`), advertised by the app via
//   postMessage. Every key change (login/logout/account switch) purges all
//   such caches, so one user's data can never be shown to a different
//   session on the same device. The key is also persisted to a dedicated
//   IndexedDB slot the SW can read back after a cold start, so offline
//   navigation survives a service-worker restart without weakening the
//   namespace boundary. With no key available, authenticated responses
//   pass through and are never cached. RSC responses are only stored on
//   200 `text/x-component` results; 401/403s, redirects, and errors are
//   never cached.
// - Everything else passes through untouched: mutations
//   (POST/PATCH/PUT/DELETE), other /api GETs, uploads, cross-origin
//   requests, and range requests. The IndexedDB outbox/sync engine owns
//   offline mutations; the service worker never reads or writes it.
//
// Versioning: bump TRAK_SW_VERSION whenever the precached shell files
// change. Old trak-* caches (and legacy global page/data caches) are
// deleted on activate, so clients can never get stuck on stale or shared
// assets (install also skipWaits + claims).

const TRAK_SW_VERSION = "3a-v1";

// Cache names. Static assets are public and shared; anything that can carry
// authenticated per-user data (document pages, /api/bootstrap, RSC flight
// responses) is namespaced by the per-login session key.
const STATIC_CACHE = "trak-static-" + TRAK_SW_VERSION;
const RSC_CACHE_PREFIX = "trak-rsc-";
const PAGES_CACHE_PREFIX = "trak-pages-";
const DATA_CACHE_PREFIX = "trak-data-";
const SESSION_CACHE_PREFIXES = ["trak-rsc-", "trak-pages-", "trak-data-"];

// Active session key: advertised by the app via postMessage and persisted to
// a dedicated IndexedDB slot the SW can read back on a cold start, so offline
// navigation keeps working across service-worker restarts. When null, no
// authenticated response is ever cached.
let rscSessionKey = null;
let swKeyRecovered = false;

// Dedicated, minimal IndexedDB record that the SERVICE WORKER can read
// without depending on the app's own (Dexie) database schema. It is written
// by the client whenever it rotates/advertises a session key
// (src/lib/sw/rsc-cache-session.ts).
const SW_KEY_DB = "trak-sw-session";
const SW_KEY_STORE = "keys";
const SW_KEY_ID = "active-rsc";

function sessionCacheName(prefix, key) {
  return prefix + TRAK_SW_VERSION + "-" + key;
}

function openSwKeyDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("no indexedDB"));
      return;
    }
    const req = indexedDB.open(SW_KEY_DB, 1);
    req.onupgradeneeded = () => {
      try {
        if (!req.result.objectStoreNames.contains(SW_KEY_STORE)) {
          req.result.createObjectStore(SW_KEY_STORE);
        }
      } catch (e) {
        /* ignore */
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Read the persisted active session key (works after a SW cold start). */
async function readSessionKeyFromIdb() {
  let db;
  try {
    db = await openSwKeyDb();
  } catch (e) {
    return null;
  }
  try {
    const record = await new Promise((resolve) => {
      try {
        const tx = db.transaction(SW_KEY_STORE, "readonly");
        const got = tx.objectStore(SW_KEY_STORE).get(SW_KEY_ID);
        got.onsuccess = () => resolve(got.result);
        got.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
    return record && typeof record.key === "string" && record.key
      ? record.key
      : null;
  } finally {
    db.close();
  }
}

async function getSessionKey() {
  if (rscSessionKey === null && !swKeyRecovered) {
    swKeyRecovered = true;
    try {
      const key = await readSessionKeyFromIdb();
      if (key) rscSessionKey = key;
    } catch (e) {
      /* memory-only fallback */
    }
  }
  return rscSessionKey;
}

/** Delete every session-namespaced cache (pages, bootstrap, RSC flight). */
async function purgeSessionCaches() {
  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) =>
          SESSION_CACHE_PREFIXES.some((prefix) => name.indexOf(prefix) === 0)
        )
        .map((name) => caches.delete(name)),
    );
  } catch (e) {
    /* best-effort */
  }
}

// Public, unauthenticated shell files safe to precache at install.
const PRECACHE_URLS = [
  "/icon-192.png",
  "/icon-512.png",
  "/app-icon.png",
  "/logo-black.png",
  "/logo-white.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  // Best-effort precache: individual failures (or a fully offline
  // install) must never fail installation — push depends on it.
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) => cache.add(url).catch(() => {})),
        ),
      )
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => {
            // Only manage trak-* caches — never delete other vendors'.
            if (name.indexOf("trak-") !== 0) return false;
            // Keep current-version caches: static assets (public/shared)
            // and keyed session caches for THIS version. Everything else —
            // older versions, legacy unkeyed/global page+data caches, and
            // orphaned namespaces — is deleted.
            if (name === STATIC_CACHE) return false;
            if (name.indexOf(RSC_CACHE_PREFIX + TRAK_SW_VERSION + "-") === 0)
              return false;
            if (name.indexOf(PAGES_CACHE_PREFIX + TRAK_SW_VERSION + "-") === 0)
              return false;
            if (name.indexOf(DATA_CACHE_PREFIX + TRAK_SW_VERSION + "-") === 0)
              return false;
            return true;
          })
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })()
  );
});

// The app advertises a random per-login session key; authenticated
// responses (pages, bootstrap, RSC flights) are only ever cached into
// `trak-<kind>-<version>-<key>`. When the advertised key differs from the
// one currently in memory (a login/logout/session switch), every existing
// session-namespaced cache is dropped so no previously-cached user payload
// can be served to a later session. Re-advertising the SAME key — including
// across a cold start, where memory was restored from IndexedDB — preserves
// the caches for offline continuity.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "trak-rsc-session" && typeof data.key === "string" && data.key) {
    if (data.key === rscSessionKey) return; // same-session reload — keep cache
    event.waitUntil(
      purgeSessionCaches()
        .catch(() => {})
        .then(() => {
          rscSessionKey = data.key;
        })
    );
    return;
  }
  if (data.type === "trak-rsc-purge") {
    event.waitUntil(purgeSessionCaches().catch(() => {}));
  }
});

function isBootstrapRequest(url) {
  return url.pathname === "/api/bootstrap";
}

function isStaticAsset(url) {
  const path = url.pathname;
  if (path.startsWith("/_next/static/")) return true;
  if (path.startsWith("/_next/image")) return true;
  return PRECACHE_URLS.indexOf(path) !== -1;
}

function isNavigationRequest(request) {
  return request.mode === "navigate" || request.destination === "document";
}

function isRscRequest(request) {
  if (request.method !== "GET") return false;
  // Dev-only HMR refreshes are flight requests but must stay fresh.
  if (request.headers.get("next-hmr-refresh") === "1") return false;
  if (request.headers.get("rsc")) return true;
  // Fallback: new/older clients that identify flight requests via Accept.
  return (request.headers.get("accept") || "").indexOf("text/x-component") !== -1;
}

async function networkFirstRsc(request) {
  const key = await getSessionKey();
  const cacheKey = rscCacheUrl(request);
  try {
    const res = await fetch(request);
    // Never cache redirects, errors, or auth failures — and only store
    // real flight responses under an active session namespace (the router
    // treats anything else as a fallback to a full page load).
    if (res && res.ok && key) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.indexOf("text/x-component") !== -1) {
        const cache = await caches.open(sessionCacheName(RSC_CACHE_PREFIX, key));
        const headers = new Headers(res.headers);
        headers.delete("vary");
        const clean = new Response(res.clone().body, {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
        cache.put(cacheKey, clean).catch(() => {});
      }
    }
    return res;
  } catch (e) {
    if (key) {
      const cached = await caches.match(cacheKey, {
        cacheName: sessionCacheName(RSC_CACHE_PREFIX, key),
      });
      if (cached) return cached;
    }
    return offlineDataResponse();
  }
}

// Collapse RSC cache keys onto the stable path. Next.js appends a volatile
// `?_rsc=<hash>` cache-busting param to every flight request, where the hash
// is a digest of the request headers (prefetch level, router state tree,
// next-url). The hash changes whenever the router state moves, so the exact
// same server payload arrives under different hashes across navigations —
// keying CacheStorage by the full URL would 503 the instant an offline click
// computes a fresh hash. The `_rsc` value carries no server-reading content
// of its own, so matching by path + non-`_rsc` query is safe and preserves
// per-session isolation.
function rscCacheUrl(input) {
  let url;
  try {
    url =
      typeof input === "string"
        ? new URL(input, self.location.origin)
        : new URL(input.url);
  } catch (e) {
    return input;
  }
  url.searchParams.delete("_rsc");
  return url.href;
}

function offlineFallbackResponse() {
  const html =
    "<!doctype html>" +
    '<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>TRAK — Offline</title>" +
    "<style>body{margin:0;min-height:100vh;display:flex;align-items:center;" +
    "justify-content:center;background:#0d1d1a;color:#f4efe4;" +
    'font-family:system-ui,sans-serif;text-align:center;padding:24px}' +
    "button{margin-top:16px;padding:10px 20px;border-radius:12px;border:0;" +
    "background:#c9a227;color:#0d1d1a;font-weight:700;cursor:pointer}" +
    "</style></head><body><main><h1>You are offline</h1>" +
    "<p>TRAK needs a connection to load this page.</p>" +
    "<button onclick=\"location.reload()\">Retry</button>" +
    "</main></body></html>";
  return new Response(html, {
    status: 503,
    headers: { "Content-Type": "text/html" },
  });
}

function offlineDataResponse() {
  return new Response(
    JSON.stringify({ error: "Offline — no cached data available." }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }
  );
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request, { cacheName: STATIC_CACHE });
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, res.clone()).catch(() => {});
  }
  return res;
}

async function networkFirstPage(request) {
  const key = await getSessionKey();
  try {
    const res = await fetch(request);
    const contentType = res.headers.get("content-type") || "";
    // Only cache real pages into the session namespace — never redirects
    // (e.g. /login) or errors, and never without an active session key
    // (a keyless cache could leak one session's authenticated HTML to
    // another user on the same device).
    if (res.ok && contentType.indexOf("text/html") !== -1 && key) {
      const cache = await caches.open(sessionCacheName(PAGES_CACHE_PREFIX, key));
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch (e) {
    if (key) {
      const cacheName = sessionCacheName(PAGES_CACHE_PREFIX, key);
      const cached = await caches.match(request, { cacheName });
      if (cached) return cached;
      // The offline shell fallback is session-scoped: never serve another
      // session's cached dashboard HTML. The shell was stored under the
      // real document request (mode "navigate"); Cache Storage only lets a
      // `navigate` request match a `navigate` entry, so matching with a
      // plain URL string (mode "cors") would always miss in a real browser
      // and drop users into the offline page. Build an explicit
      // navigate-mode request for the match.
      const shell = await caches.match(
        new Request(new URL("/dashboard", self.location.origin), {
          method: "GET",
          mode: "navigate",
          headers: { accept: "text/html" },
        }),
        { cacheName },
      );
      if (shell) return shell;
    }
    return offlineFallbackResponse();
  }
}

async function networkFirstBootstrap(request) {
  const key = await getSessionKey();
  try {
    const res = await fetch(request);
    // Never cache auth failures or errors — a cached 401 would lock
    // the app out even after the session is fixed — and only store
    // bootstrap data inside the active session namespace.
    if (res && res.ok && key) {
      const cache = await caches.open(sessionCacheName(DATA_CACHE_PREFIX, key));
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch (e) {
    if (key) {
      const cached = await caches.match(request, {
        cacheName: sessionCacheName(DATA_CACHE_PREFIX, key),
      });
      if (cached) return cached;
    }
    return offlineDataResponse();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Mutations and anything non-GET pass through untouched.
  if (request.method !== "GET") return;
  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }
  // Cross-origin (CDN/S3) and range (media) requests pass through.
  if (url.origin !== self.location.origin) return;
  if (request.headers.has("range")) return;

  if (isBootstrapRequest(url)) {
    event.respondWith(networkFirstBootstrap(request));
    return;
  }
  // Next.js RSC flight requests (client-side `<Link>` navigations). They
  // are always fulfilled (never dropped), but caching is gated on an active
  // session key — from memory or recovered from IndexedDB after a cold
  // start — so previously-visited routes work offline without ever mixing
  // one user's payload with another user's session.
  if (isRscRequest(request)) {
    event.respondWith(networkFirstRsc(request));
    return;
  }
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }
  // All other same-origin GETs (other /api routes, uploads, HMR dev
  // refreshes) pass through so they always stay fresh.
});

function resolveTargetUrl(raw) {
  const fallback = "/dashboard";
  if (typeof raw !== "string" || !raw.startsWith("/")) return fallback;
  // Block protocol-relative / credentialed redirects from push payloads.
  if (raw.startsWith("//")) return fallback;
  return raw;
}

self.addEventListener("push", (event) => {
  // No payload (e.g. some Android/FCM edge cases) — still show something
  // useful rather than dropping the notification silently.
  if (!event.data) {
    event.waitUntil(
      self.registration.showNotification("TRAK", {
        body: "You have a new notification. Open TRAK to view it.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: "/dashboard" },
        tag: "trak-" + Date.now(),
      })
    );
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error("Error parsing push notification", e);
    event.waitUntil(
      self.registration.showNotification("TRAK", {
        body: "You have a new notification. Open TRAK to view it.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: "/dashboard" },
        tag: "trak-" + Date.now(),
      })
    );
    return;
  }

  const title = data.title || "TRAK";
  // Server sends a unique tag per notification (trak-<id>) so concurrent
  // notifications never overwrite each other.
  const tag = data.tag || "trak-" + Date.now();
  const options = {
    body: data.body || "Open TRAK to view details.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: data.data || {},
    tag,
    renotify: false,
  };

  const targetUrl = resolveTargetUrl(options.data.url || "/dashboard");

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If any client is focused on the exact target location, suppress the system notification.
      const isFocusedOnTarget = clientList.some((client) => {
        if (!client.focused) return false;
        try {
          const clientPath = new URL(client.url).pathname;
          // If they are on the specific target route (e.g., /messages), don't send a push.
          // Note: for /messages we might want to notify them if they are in a different thread, 
          // but we don't have thread granularity in the push payload right now, so suppressing 
          // on the top-level route is a reasonable start.
          return clientPath === targetUrl || clientPath.startsWith(targetUrl + "/");
        } catch {
          return false;
        }
      });

      if (isFocusedOnTarget) {
        console.log("Client is actively focused on the target route, skipping system notification.");
        return;
      }
      return self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const payloadData = event.notification.data || {};
  let urlToOpen = resolveTargetUrl(payloadData.url || "/dashboard");
  // Chat notifications carry the originating message id — deep-link to the
  // thread so the app can open it and scroll to / highlight that message.
  const msgId = payloadData.messageId;
  const isMessageType = ["dm", "community", "mention", "announcement"].includes(payloadData.type);
  if (isMessageType && msgId) {
    const u = new URL(urlToOpen, self.location.origin);
    u.searchParams.set("message", msgId);
    urlToOpen = u.pathname + u.search;
  }
  const absoluteUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(absoluteUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }
    })
  );
});

// Re-subscribe when the push service expires our subscription (notably on
// Android/Chrome). Without this, background notifications silently stop.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch("/api/push/vapid-public-key", { credentials: "include" });
        if (!res.ok) return;
        const { publicKey } = await res.json();
        if (!publicKey) return;
        const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
        const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
        const raw = atob(base64);
        const key = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);

        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
      } catch (e) {
        console.error("pushsubscriptionchange resubscribe failed", e);
      }
    })()
  );
});
