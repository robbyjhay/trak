/**
 * Phase 3A service-worker offline caching tests.
 *
 * Loads the real `public/sw.js` into a sandbox with fake `caches`,
 * `fetch`, and `clients` globals and drives its lifecycle + fetch
 * handlers through online and offline scenarios.
 *
 * Push-notification behaviour is covered by regression tests at the
 * bottom — the caching work must not break push, notification clicks,
 * or push-subscription renewal.
 */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// Next.js's own cache-busting search-param generator: `_rsc` is a digest of
// the volatile RSC router headers, so this builds the EXACT URL shape Next
// produces for a given router state tree.
import { computeCacheBustingSearchParam } from "next/dist/shared/lib/router/utils/cache-busting-search-param";

const ORIGIN = "https://trak.test";

function swSource(): string {
  return readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
}

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

function cacheKey(input: unknown): string {
  if (typeof input === "string") return new URL(input, ORIGIN).href;
  return (input as { url: string }).url;
}

// Real Cache Storage semantics: a URL **string** (or constructor-less
// request) has `mode: "cors"`, and a `navigate`-mode request can ONLY match
// entries that were stored under `mode: "navigate"` (and vice-versa). Prior
// harnesses ignored mode entirely, so shell/string-vs-document mismatches
// that break in Chrome never appeared in Vitest.
function requestMode(input: unknown): string {
  if (typeof input === "string") return "cors";
  return (input as { mode?: string }).mode ?? "cors";
}

// Node's undici `Request` rejects `mode: "navigate"`, but a real service
// worker accepts it on matching-only requests. Provide an injected
// constructor for the SW sandbox that yields a navigate-mode request object
// the fake cache can reason about.
function navigateAwareRequest(input: unknown, init: Record<string, unknown> = {}) {
  if (init.mode === "navigate") {
    const raw =
      typeof input === "string"
        ? input
        : (input as { href?: string }).href ?? (input as { url: string }).url;
    const url = new URL(raw, ORIGIN).href;
    return {
      url,
      mode: "navigate",
      method: (init.method as string) ?? "GET",
      headers: new Headers((init.headers as HeadersInit) ?? {}),
    };
  }
  return new Request(input as RequestInfo, init as RequestInit);
}

class FakeCache {
  store = new Map<string, Response>();
  modes = new Map<string, string>();

  async match(input: unknown): Promise<Response | undefined> {
    const key = cacheKey(input);
    if (!this.modes.has(key)) return undefined;
    const entryMode = this.modes.get(key)!;
    const reqMode = requestMode(input);
    if (entryMode === "navigate" || reqMode === "navigate") {
      if (entryMode !== reqMode) return undefined;
    }
    return this.store.get(key);
  }

  async put(input: unknown, res: Response): Promise<void> {
    this.store.set(cacheKey(input), res);
    this.modes.set(cacheKey(input), requestMode(input));
  }

  async add(url: string): Promise<void> {
    const res = await fakeFetch(url);
    if (!res.ok) throw new Error(`precache failed: ${url}`);
    this.store.set(cacheKey(url), res);
    this.modes.set(cacheKey(url), requestMode(url));
  }

  has(input: unknown): boolean {
    return this.store.has(cacheKey(input));
  }
}

class FakeCaches {
  map = new Map<string, FakeCache>();

  async open(name: string): Promise<FakeCache> {
    let c = this.map.get(name);
    if (!c) {
      c = new FakeCache();
      this.map.set(name, c);
    }
    return c;
  }

  async match(
    input: unknown,
    opts?: { cacheName?: string },
  ): Promise<Response | undefined> {
    if (opts?.cacheName) return this.map.get(opts.cacheName)?.match(input);
    for (const c of this.map.values()) {
      const hit = await c.match(input);
      if (hit) return hit;
    }
    return undefined;
  }

  async keys(): Promise<string[]> {
    return [...this.map.keys()];
  }

  async delete(name: string): Promise<boolean> {
    return this.map.delete(name);
  }
}

let online = true;
let networkHits: string[] = [];
const networkOverrides = new Map<string, () => Response>();

function html(body: string, status = 200): Response {
  return new Response(`<html><body>${body}</body></html>`, {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function flight(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/x-component" },
  });
}

function defaultNetworkResponse(url: string): Response {
  if (url.includes("/api/bootstrap")) return json({ users: [{ id: "u1" }] });
  if (url.includes("/api/")) return json({ ok: true });
  if (url.includes("/_next/")) {
    return new Response("// chunk", {
      status: 200,
      headers: { "Content-Type": "text/javascript" },
    });
  }
  if (url.endsWith(".png")) {
    return new Response("PNGDATA", {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });
  }
  if (url.includes("manifest")) return json({ name: "Trak" });
  return html(`page:${url}`);
}

async function fakeFetch(input: unknown): Promise<Response> {
  const url = typeof input === "string" ? input : (input as { url: string }).url;
  networkHits.push(url);
  if (!online) throw new TypeError("Failed to fetch");
  const ov = networkOverrides.get(url);
  if (ov) return ov();
  return defaultNetworkResponse(url);
}

interface SwHarness {
  listeners: Record<string, Array<(event: any) => void>>;
  caches: FakeCaches;
  clients: {
    claim: () => Promise<void>;
    matchAll: (...args: unknown[]) => Promise<any[]>;
    openWindow?: (url: string) => Promise<unknown>;
  };
  registration: {
    showNotification: ReturnType<typeof vi.fn>;
    pushManager: { subscribe: (...args: unknown[]) => Promise<{ toJSON: () => object }> };
  };
  skipWaiting: ReturnType<typeof vi.fn>;
}

function loadSw(cachesOverride?: FakeCaches): SwHarness {
  const listeners: Record<string, Array<(event: any) => void>> = {};
  const caches = cachesOverride ?? new FakeCaches();
  const clients: SwHarness["clients"] = {
    claim: async () => {},
    matchAll: async () => [],
  };
  const registration: SwHarness["registration"] = {
    showNotification: vi.fn(async () => {}),
    pushManager: {
      subscribe: async () => ({ toJSON: () => ({ endpoint: "x" }) }),
    },
  };
  const fakeSelf = {
    location: { origin: ORIGIN },
    skipWaiting: vi.fn(),
    clients,
    registration,
    addEventListener: (type: string, fn: (event: any) => void) => {
      listeners[type] = listeners[type] ?? [];
      listeners[type].push(fn);
    },
  };
  const run = new Function(
    "self",
    "caches",
    "fetch",
    "clients",
    "indexedDB",
    "Request",
    `${swSource()}\nreturn self;`,
  );
  run(
    fakeSelf,
    caches,
    fakeFetch,
    clients,
    globalThis.indexedDB,
    navigateAwareRequest,
  );
  return {
    listeners,
    caches,
    clients,
    registration,
    skipWaiting: fakeSelf.skipWaiting,
  };
}

function stubRequest(
  url: string,
  init: {
    method?: string;
    mode?: string;
    destination?: string;
    headers?: Record<string, string>;
  } = {},
) {
  return {
    method: init.method ?? "GET",
    url: url.startsWith("http") ? url : ORIGIN + url,
    mode: init.mode ?? "cors",
    destination: init.destination ?? "",
    headers: new Headers(init.headers ?? {}),
  };
}

function navRequest(path: string) {
  return stubRequest(path, { mode: "navigate", destination: "document" });
}

/** Next.js App Router client-side navigation flight request. */
function rscRequest(path: string, extraHeaders: Record<string, string> = {}) {
  return stubRequest(path, { headers: { RSC: "1", ...extraHeaders } });
}

async function fireMessage(h: SwHarness, data: unknown): Promise<void> {
  const event = {
    data,
    _done: Promise.resolve() as Promise<unknown>,
    waitUntil(p: Promise<unknown>) {
      this._done = p;
    },
  };
  for (const fn of h.listeners.message ?? []) fn(event);
  await event._done;
}

function rscCacheNames(h: SwHarness): string[] {
  return cacheNames(h).filter((n) => n.startsWith("trak-rsc-"));
}

function rscCaches(h: SwHarness): Array<FakeCache | undefined> {
  return rscCacheNames(h).map((n) => h.caches.map.get(n));
}

async function fireInstall(h: SwHarness): Promise<void> {
  const event = {
    _done: Promise.resolve() as Promise<unknown>,
    waitUntil(p: Promise<unknown>) {
      this._done = p;
    },
  };
  for (const fn of h.listeners.install ?? []) fn(event);
  await event._done;
}

async function fireActivate(h: SwHarness): Promise<void> {
  const event = {
    _done: Promise.resolve() as Promise<unknown>,
    waitUntil(p: Promise<unknown>) {
      this._done = p;
    },
  };
  for (const fn of h.listeners.activate ?? []) fn(event);
  await event._done;
}

/** Fires a fetch event; returns the interception response, or undefined on passthrough. */
async function fireFetch(
  h: SwHarness,
  request: unknown,
): Promise<Response | undefined> {
  const event = {
    request,
    _response: undefined as Promise<Response> | undefined,
    respondWith(p: Promise<Response>) {
      this._response = p;
    },
  };
  for (const fn of h.listeners.fetch ?? []) fn(event);
  if (!event._response) return undefined;
  return event._response;
}

function cacheNames(h: SwHarness): string[] {
  return [...h.caches.map.keys()];
}

function staticCache(h: SwHarness): FakeCache | undefined {
  const name = cacheNames(h).find((n) => n.startsWith("trak-static-"));
  return name ? h.caches.map.get(name) : undefined;
}

function pagesCache(h: SwHarness): FakeCache | undefined {
  const name = cacheNames(h).find((n) => n.startsWith("trak-pages-"));
  return name ? h.caches.map.get(name) : undefined;
}

function dataCache(h: SwHarness): FakeCache | undefined {
  const name = cacheNames(h).find((n) => n.startsWith("trak-data-"));
  return name ? h.caches.map.get(name) : undefined;
}

// ---------------------------------------------------------------------------
// Dedicated SW-readable session-key record ("trak-sw-session") helpers.
// Mirrors the writes the client module (src/lib/sw/rsc-cache-session.ts)
// performs, so tests can seed/fxp the SW restart path end to end.
// ---------------------------------------------------------------------------

function openSwKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("trak-sw-session", 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains("keys")) {
        req.result.createObjectStore("keys");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function seedSwKeyRecord(key: string, userId: string): Promise<void> {
  const db = await openSwKeyDb();
  try {
    const tx = db.transaction("keys", "readwrite");
    tx.objectStore("keys").put({ key, userId }, "active-rsc");
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } finally {
    db.close();
  }
}

async function readSwKeyRecord(): Promise<{ key: string; userId: string } | null> {
  const db = await openSwKeyDb();
  try {
    const tx = db.transaction("keys", "readonly");
    const got = tx.objectStore("keys").get("active-rsc");
    const record = await new Promise<{ key?: string; userId?: string } | null>(
      (resolve) => {
        got.onsuccess = () => resolve(got.result);
        got.onerror = () => resolve(null);
      },
    );
    return record?.key ? { key: record.key, userId: record.userId ?? "" } : null;
  } finally {
    db.close();
  }
}

function deleteSwKeyDb(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase("trak-sw-session");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  online = true;
  networkHits = [];
  networkOverrides.clear();
  await deleteSwKeyDb();
});

// ---------------------------------------------------------------------------
// Install / activate lifecycle
// ---------------------------------------------------------------------------

describe("sw lifecycle", () => {
  test("install skipWaits and precaches shell assets without failing", async () => {
    const h = loadSw();
    await fireInstall(h);
    expect(h.skipWaiting).toHaveBeenCalled();
    const sc = staticCache(h);
    expect(sc?.has(`${ORIGIN}/icon-192.png`)).toBe(true);
    expect(sc?.has(`${ORIGIN}/icon-512.png`)).toBe(true);
    expect(sc?.has(`${ORIGIN}/manifest.webmanifest`)).toBe(true);
  });

  test("install still succeeds when fully offline (push must survive)", async () => {
    online = false;
    const h = loadSw();
    await expect(fireInstall(h)).resolves.toBeUndefined();
    expect(h.skipWaiting).toHaveBeenCalled();
  });

  test("activate deletes only stale trak-* caches and claims clients", async () => {
    const h = loadSw();
    await h.caches.open("trak-static-old");
    await h.caches.open("trak-data-v0");
    await h.caches.open("workbox-precache");
    await fireInstall(h);
    const seededOld = ["trak-static-old", "trak-data-v0"];
    const current = cacheNames(h).filter(
      (n) => n.startsWith("trak-") && !seededOld.includes(n),
    );
    expect(current.length).toBeGreaterThan(0);
    let claimed = false;
    h.clients.claim = async () => {
      claimed = true;
    };
    await fireActivate(h);
    const after = await h.caches.keys();
    for (const name of seededOld) expect(after).not.toContain(name);
    expect(after).toContain("workbox-precache");
    for (const name of current) expect(after).toContain(name);
    expect(claimed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Static assets — cache-first
// ---------------------------------------------------------------------------

describe("static assets (cache-first)", () => {
  test("serves from network once, then from cache", async () => {
    const h = loadSw();
    const first = await fireFetch(h, stubRequest("/_next/static/chunks/app.js"));
    expect(first).toBeDefined();
    expect(await first!.text()).toBe("// chunk");
    expect(networkHits).toHaveLength(1);

    const second = await fireFetch(h, stubRequest("/_next/static/chunks/app.js"));
    expect(await second!.text()).toBe("// chunk");
    expect(networkHits).toHaveLength(1);
  });

  test("offline serves cached asset; uncached asset rejects", async () => {
    const h = loadSw();
    await fireFetch(h, stubRequest("/_next/static/chunks/app.js"));
    online = false;

    const hit = await fireFetch(h, stubRequest("/_next/static/chunks/app.js"));
    expect(await hit!.text()).toBe("// chunk");

    await expect(
      fireFetch(h, stubRequest("/_next/static/chunks/other.js")),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Navigations — network-first with cached fallback
// ---------------------------------------------------------------------------

describe("navigations (network-first)", () => {
  test("online navigation returns fresh html and caches it under the session key", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    const res = await fireFetch(h, navRequest("/dashboard"));
    expect(res).toBeDefined();
    expect(await res!.text()).toContain("page:");
    expect(cacheNames(h)).toContain("trak-pages-3a-v1-K1");
    expect(pagesCache(h)?.has(`${ORIGIN}/dashboard`)).toBe(true);
  });

  test("online navigation without a session key is served but never cached", async () => {
    const h = loadSw();
    const res = await fireFetch(h, navRequest("/dashboard"));
    expect(res).toBeDefined();
    expect(await res!.text()).toContain("page:");
    expect(cacheNames(h)).not.toContain("trak-pages-3a-v1-K1");
  });

  test("offline navigation serves the cached copy of the same page", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    await fireFetch(h, navRequest("/dashboard"));
    const before = networkHits.length;
    online = false;

    const res = await fireFetch(h, navRequest("/dashboard"));
    expect(await res!.text()).toContain("page:");
    // Network-first still attempts the network once (and fails), then
    // serves the cached copy — no additional successful fetch.
    expect(networkHits).toHaveLength(before + 1);
  });

  test("offline navigation falls back to this session's cached dashboard shell", async () => {
    // Guards real CacheStorage semantics: the shell is stored under a
    // `navigate` document request, and Cache Storage only matches
    // `navigate` entries against `navigate` requests. If the fallback
    // matched with a plain URL string (mode "cors") this serves the
    // offline page instead — the harness models that rule via FakeCache.
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    await fireFetch(h, navRequest("/dashboard"));
    online = false;

    const res = await fireFetch(h, navRequest("/messages"));
    expect(res).toBeDefined();
    expect(await res!.text()).toContain(`${ORIGIN}/dashboard`);
  });

  test("offline navigation with an empty cache returns the offline fallback page", async () => {
    const h = loadSw();
    online = false;

    const res = await fireFetch(h, navRequest("/dashboard"));
    expect(res).toBeDefined();
    expect(res!.status).toBe(503);
    expect(res!.headers.get("content-type")).toContain("text/html");
    expect(await res!.text()).toMatch(/offline/i);
  });

  test("redirects and error pages are never cached", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    networkOverrides.set(
      `${ORIGIN}/login`,
      () => new Response("redirect", { status: 302 }),
    );
    const res = await fireFetch(h, navRequest("/login"));
    expect(res!.status).toBe(302);
    expect(pagesCache(h)?.has(`${ORIGIN}/login`) ?? false).toBe(false);

    online = false;
    const fallback = await fireFetch(h, navRequest("/login"));
    // No cached /login (and no cached shell under this key) → offline fallback page.
    expect(fallback!.status).toBe(503);
  });

  test("isolation: page HTML cached by one session is never served to a later session", async () => {
    const h = loadSw();
    // User A loads /dashboard online → cached under A's namespace.
    await fireMessage(h, { type: "trak-rsc-session", key: "K-A" });
    networkOverrides.set(`${ORIGIN}/dashboard`, () => html("USER_A_SECRET"));
    await fireFetch(h, navRequest("/dashboard"));
    expect(cacheNames(h)).toContain("trak-pages-3a-v1-K-A");

    // User B's session starts on the same device → key rotates, and A's
    // page cache is purged before B can ever read it.
    await fireMessage(h, { type: "trak-rsc-session", key: "K-B" });
    expect(cacheNames(h)).not.toContain("trak-pages-3a-v1-K-A");

    online = false;
    // B's offline document load must NOT receive A's authenticated HTML.
    const res = await fireFetch(h, navRequest("/dashboard"));
    expect(res).toBeDefined();
    expect(res!.status).toBe(503);
    expect(await res!.text()).not.toContain("USER_A_SECRET");
  });

  test("re-advertising the same session key preserves cached pages across reloads", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    networkOverrides.set(`${ORIGIN}/dashboard`, () => html("PAGE:CACHED"));
    await fireFetch(h, navRequest("/dashboard"));

    // Reload: the client re-advertises the identical key.
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    expect(cacheNames(h)).toContain("trak-pages-3a-v1-K1");

    online = false;
    const res = await fireFetch(h, navRequest("/dashboard"));
    expect(await res!.text()).toContain("PAGE:CACHED");
  });

  test("cold-start restart recovers the session key and serves cached pages/flights offline", async () => {
    // A genuine service-worker restart: fresh SW global (new loadSw), but
    // shared CacheStorage and the persisted SW-readable key record. No
    // postMessage is needed — the SW recovers the key from IndexedDB.
    const sharedCaches = new FakeCaches();
    await seedSwKeyRecord("K1", "u1");

    const h1 = loadSw(sharedCaches);
    await fireMessage(h1, { type: "trak-rsc-session", key: "K1" });
    networkOverrides.set(`${ORIGIN}/dashboard`, () => html("PAGE:CACHED"));
    networkOverrides.set(`${ORIGIN}/activities`, () => flight("FLIGHT:CACHED"));
    await fireFetch(h1, navRequest("/dashboard"));
    const h1Flight = await fireFetch(h1, rscRequest("/activities"));

    const h2 = loadSw(sharedCaches);
    online = false;

    const page = await fireFetch(h2, navRequest("/dashboard"));
    expect(await page!.text()).toContain("PAGE:CACHED");

    const flightRes = await fireFetch(h2, rscRequest("/activities"));
    expect(await flightRes!.text()).toBe("FLIGHT:CACHED");
  });
});

// ---------------------------------------------------------------------------
// /api/bootstrap — network-first with safe cached fallback
// ---------------------------------------------------------------------------

describe("bootstrap api (network-first)", () => {
  const BOOT = "/api/bootstrap?mode=poll";

  test("online bootstrap returns fresh data and caches it under the session key", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    const res = await fireFetch(h, stubRequest(BOOT));
    expect(res).toBeDefined();
    expect(await res!.json()).toEqual({ users: [{ id: "u1" }] });
    expect(cacheNames(h)).toContain("trak-data-3a-v1-K1");
    expect(dataCache(h)?.has(`${ORIGIN}${BOOT}`)).toBe(true);
  });

  test("offline bootstrap serves the cached snapshot", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    await fireFetch(h, stubRequest(BOOT));
    const before = networkHits.length;
    online = false;

    const res = await fireFetch(h, stubRequest(BOOT));
    expect(await res!.json()).toEqual({ users: [{ id: "u1" }] });
    // Network-first attempts the network once (and fails), then serves cache.
    expect(networkHits).toHaveLength(before + 1);
  });

  test("offline bootstrap with no cache returns 503 json (never a stale 401)", async () => {
    const h = loadSw();
    online = false;
    const res = await fireFetch(h, stubRequest(BOOT));
    expect(res!.status).toBe(503);
    expect(await res!.json()).toEqual({
      error: expect.stringMatching(/offline/i),
    });
  });

  test("401 bootstrap responses are returned but never cached", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    networkOverrides.set(`${ORIGIN}${BOOT}`, () =>
      json({ error: "Unauthorized" }, 401),
    );
    const res = await fireFetch(h, stubRequest(BOOT));
    expect(res!.status).toBe(401);
    expect(dataCache(h)?.has(`${ORIGIN}${BOOT}`) ?? false).toBe(false);
  });

  test("isolation: bootstrap cached under one session is never served to another", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K-A" });
    networkOverrides.set(`${ORIGIN}${BOOT}`, () =>
      json({ users: [{ id: "userA" }] }),
    );
    await fireFetch(h, stubRequest(BOOT));
    expect(cacheNames(h)).toContain("trak-data-3a-v1-K-A");

    // User B's session starts on the same device → key rotates, A's
    // bootstrap cache is purged.
    await fireMessage(h, { type: "trak-rsc-session", key: "K-B" });
    expect(cacheNames(h)).not.toContain("trak-data-3a-v1-K-A");

    online = false;
    const res = await fireFetch(h, stubRequest(BOOT));
    expect(res!.status).toBe(503);
    expect(await res!.text()).not.toContain("userA");
  });
});

// ---------------------------------------------------------------------------
// RSC flight responses — network-first, per-session namespaced cache
// ---------------------------------------------------------------------------

describe("RSC flight responses (per-session network-first)", () => {
  test("without an advertised session key, flight requests are fulfilled but never cached", async () => {
    const h = loadSw();
    networkOverrides.set(
      `${ORIGIN}/activities`,
      () => flight("FLIGHT:/activities"),
    );
    // No session key (memory or recovered from IndexedDB) → the request is
    // fulfilled normally but never stored — the safe default.
    const res = await fireFetch(h, rscRequest("/activities"));
    expect(res).toBeDefined();
    expect(await res!.text()).toBe("FLIGHT:/activities");
    expect(rscCacheNames(h)).toHaveLength(0);
  });

  test("caches a 200 flight response under the active session key", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    networkOverrides.set(
      `${ORIGIN}/activities`,
      () => flight("FLIGHT:/activities"),
    );

    const res = await fireFetch(h, rscRequest("/activities"));
    expect(await res!.text()).toBe("FLIGHT:/activities");
    expect(rscCacheNames(h)).toEqual(["trak-rsc-3a-v1-K1"]);
    expect(
      rscCaches(h)[0]?.has(`${ORIGIN}/activities`),
    ).toBe(true);
  });

  test("serves the cached flight payload offline", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    networkOverrides.set(
      `${ORIGIN}/activities`,
      () => flight("FLIGHT:/activities"),
    );
    await fireFetch(h, rscRequest("/activities"));
    const before = networkHits.length;
    online = false;

    const res = await fireFetch(h, rscRequest("/activities"));
    expect(await res!.text()).toBe("FLIGHT:/activities");
    // Network-first still attempts the network once (and fails), then serves
    // the cached copy — no additional successful fetch.
    expect(networkHits).toHaveLength(before + 1);
  });

  test("offline with no cached flight returns a 503 (never cross-session data)", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    online = false;
    const res = await fireFetch(h, rscRequest("/activities"));
    expect(res!.status).toBe(503);
    expect(await res!.json()).toEqual({
      error: expect.stringMatching(/offline/i),
    });
  });

  test("isolation: a different session key drops and cannot read prior session payloads", async () => {
    const h = loadSw();
    // User A's session caches /activities.
    await fireMessage(h, { type: "trak-rsc-session", key: "K-A" });
    networkOverrides.set(
      `${ORIGIN}/activities`,
      () => flight('USER_A_SECRET'),
    );
    await fireFetch(h, rscRequest("/activities"));
    expect(rscCacheNames(h)).toEqual(["trak-rsc-3a-v1-K-A"]);

    // User B logs in on the same device → new key; SW must drop A's cache.
    await fireMessage(h, { type: "trak-rsc-session", key: "K-B" });
    expect(rscCacheNames(h)).not.toContain("trak-rsc-3a-v1-K-A");

    online = false;
    // B's offline navigation must NOT receive A's payload.
    const res = await fireFetch(h, rscRequest("/activities"));
    expect(res!.status).toBe(503);
    expect(await res!.text()).not.toContain("USER_A_SECRET");
  });

  test("vary header is stripped so offline matches are keyed by URL alone", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    const resWithVary = flight("FLIGHT");
    resWithVary.headers.set("vary", "RSC, Next-Router-State-Tree");
    networkOverrides.set(`${ORIGIN}/activities`, () => resWithVary);
    await fireFetch(h, rscRequest("/activities"));

    // The stored copy must not carry the Vary header — cache matches are
    // keyed purely by URL (its `?_rsc=` query already encodes router state).
    const stored = rscCaches(h)[0]?.store.get(`${ORIGIN}/activities`);
    expect(stored?.headers.get("vary")).toBeNull();

    online = false;
    // A repeat navigation with different router-state headers (which would
    // normally Vary-miss) still hits the cached entry offline.
    const res = await fireFetch(
      h,
      rscRequest("/activities", { "Next-Router-State-Tree": "%5B%22other%22%5D" }),
    );
    expect(await res!.text()).toBe("FLIGHT");
  });

  test("requests with a _rsc cache-busting query reuse the exact cached URL", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    const url = "/activities?_rsc=abc123";
    networkOverrides.set(`${ORIGIN}${url}`, () => flight("FLIGHT:_rsc"));
    await fireFetch(h, rscRequest(url));
    online = false;

    const res = await fireFetch(h, rscRequest(url));
    expect(await res!.text()).toBe("FLIGHT:_rsc");
  });

  test("offline navigation matches a cached flight across _rsc hash drift", async () => {
    // Real Next 16 devices: every RSC navigation request carries
    // `?_rsc=<hash>` where the hash is produced by Next's own
    // computeCacheBustingSearchParam from volatile headers (prefetch level,
    // next-router-state-tree, next-url). A route cached while online under
    // one router tree is re-requested offline with a DIFFERENT hash after
    // the state tree / next-url moves. Keying CacheStorage by the full URL
    // therefore misses, 503s, and forces Next's MPA fallback straight into
    // the SW offline page. The offline match must reuse the cached flight
    // regardless of the `_rsc` value.
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });

    // Two different but realistic `next-router-state-tree` payloads (the
    // source route changed between the online visit and the offline click).
    const treeOnDashboard = encodeURIComponent(
      JSON.stringify(["__DEFAULT__", {}]),
    );
    const treeOnActivities = encodeURIComponent(
      JSON.stringify(["activities", {}, null, null, true]),
    );
    const rscWhenOnDashboard = await computeCacheBustingSearchParam(
      undefined,
      undefined,
      treeOnDashboard,
      "/dashboard",
    );
    const rscWhenOnActivities = await computeCacheBustingSearchParam(
      undefined,
      undefined,
      treeOnActivities,
      "/activities",
    );
    expect(rscWhenOnDashboard).toBeTruthy();
    expect(rscWhenOnActivities).not.toBe(rscWhenOnDashboard);

    networkOverrides.set(
      `${ORIGIN}/activities?_rsc=${rscWhenOnDashboard}`,
      () => flight("FLIGHT:/activities"),
    );
    await fireFetch(
      h,
      rscRequest(`/activities?_rsc=${rscWhenOnDashboard}`, {
        "Next-Router-State-Tree": treeOnDashboard,
        "Next-Url": "/dashboard",
      }),
    );
    // Exactly one normalized entry, keyed without the volatile `_rsc` param.
    const stored = rscCaches(h)[0]?.store.get(`${ORIGIN}/activities`);
    expect(stored?.status).toBe(200);

    online = false;
    // Offline click from the new tree: Next computes a fresh `_rsc`. This
    // must NOT 503 into the MPA offline page.
    const res = await fireFetch(
      h,
      rscRequest(`/activities?_rsc=${rscWhenOnActivities}`, {
        "Next-Router-State-Tree": treeOnActivities,
        "Next-Url": "/activities",
      }),
    );
    expect(res!.status).toBe(200);
    expect(await res!.text()).toBe("FLIGHT:/activities");
  });

  test("auth failures, errors, and redirects are returned but never cached", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });

    networkOverrides.set(`${ORIGIN}/activities`, () =>
      json({ error: "Unauthorized" }, 401),
    );
    const denied = await fireFetch(h, rscRequest("/activities"));
    expect(denied!.status).toBe(401);

    networkOverrides.set(`${ORIGIN}/messages`, () =>
      new Response("redirect", { status: 307 }),
    );
    const redirected = await fireFetch(h, rscRequest("/messages"));
    expect(redirected!.status).toBe(307);

    networkOverrides.set(`${ORIGIN}/settings`, () =>
      flight("", 500),
    );
    await fireFetch(h, rscRequest("/settings"));

    for (const cache of rscCaches(h)) {
      expect(cache?.store.size ?? 0).toBe(0);
    }
  });

  test("HMR flight refreshes pass through and are never cached", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    networkOverrides.set(
      `${ORIGIN}/activities`,
      () => flight("FLIGHT:/activities"),
    );
    networkHits = [];
    // HMR refreshes are excluded from the RSC handler → SW does not
    // intercept (passthrough) and nothing is cached or fetched by the SW.
    const res = await fireFetch(
      h,
      rscRequest("/activities", { "Next-HMR-Refresh": "1" }),
    );
    expect(res).toBeUndefined();
    expect(rscCacheNames(h)).toHaveLength(0);
    expect(networkHits).toHaveLength(0);
  });

  test("re-advertising the same session key preserves the cache (same-session reload)", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    networkOverrides.set(
      `${ORIGIN}/activities`,
      () => flight("FLIGHT:/activities"),
    );
    await fireFetch(h, rscRequest("/activities"));
    expect(rscCacheNames(h)).toEqual(["trak-rsc-3a-v1-K1"]);

    // Reload: the client re-advertises the identical key. The SW must NOT
    // purge — the namespace (and its cached routes) survives offline.
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    expect(rscCacheNames(h)).toEqual(["trak-rsc-3a-v1-K1"]);

    online = false;
    const res = await fireFetch(h, rscRequest("/activities"));
    expect(await res!.text()).toBe("FLIGHT:/activities");
  });

  test("explicit purge removes every session's page, bootstrap, and rsc caches", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    networkOverrides.set(`${ORIGIN}/activities`, () => flight("FLIGHT"));
    networkOverrides.set(`${ORIGIN}/dashboard`, () => html("PAGE"));
    await fireFetch(h, rscRequest("/activities"));
    await fireFetch(h, navRequest("/dashboard"));
    expect(cacheNames(h)).toEqual([
      "trak-rsc-3a-v1-K1",
      "trak-pages-3a-v1-K1",
    ]);

    await fireMessage(h, { type: "trak-rsc-purge" });
    expect(rscCacheNames(h)).toHaveLength(0);
    expect(cacheNames(h)).not.toContain("trak-pages-3a-v1-K1");
  });

  test("activate keeps current-version RSC caches and drops older versions", async () => {
    const h = loadSw();
    await fireMessage(h, { type: "trak-rsc-session", key: "K1" });
    networkOverrides.set(`${ORIGIN}/activities`, () => flight("FLIGHT"));
    await fireFetch(h, rscRequest("/activities"));
    // Pre-existing stale-version + unversioned RSC caches.
    await h.caches.open("trak-rsc-2-K1");
    await h.caches.open("trak-rsc-old");

    await fireActivate(h);
    const names = rscCacheNames(h);
    expect(names).toContain("trak-rsc-3a-v1-K1");
    expect(names).not.toContain("trak-rsc-2-K1");
    expect(names).not.toContain("trak-rsc-old");
  });
});

// ---------------------------------------------------------------------------
// Passthrough — mutations, other APIs, cross-origin, ranges
// ---------------------------------------------------------------------------

describe("passthrough (never cached, never blocked)", () => {
  test("mutations pass through untouched", async () => {
    const h = loadSw();
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
      const event = await fireFetch(
        h,
        stubRequest("/api/messages/dms", { method }),
      );
      expect(event).toBeUndefined();
    }
    expect(networkHits).toHaveLength(0);
    expect(cacheNames(h)).toHaveLength(0);
  });

  test("non-bootstrap GET apis and uploads pass through", async () => {
    const h = loadSw();
    expect(
      await fireFetch(h, stubRequest("/api/messages/announcements")),
    ).toBeUndefined();
    expect(
      await fireFetch(h, stubRequest("/api/uploads/abc123")),
    ).toBeUndefined();
    expect(cacheNames(h)).toHaveLength(0);
  });

  test("cross-origin and range requests pass through", async () => {
    const h = loadSw();
    expect(
      await fireFetch(h, stubRequest("https://cdn.example.com/x.js")),
    ).toBeUndefined();
    expect(
      await fireFetch(
        h,
        stubRequest("/api/uploads/song.mp3", { headers: { Range: "bytes=0-99" } }),
      ),
    ).toBeUndefined();
    expect(cacheNames(h)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Push behaviour regression (must not break)
// ---------------------------------------------------------------------------

describe("push behaviour intact", () => {
  test("all push-related listeners are registered alongside fetch", () => {
    const h = loadSw();
    for (const type of [
      "install",
      "activate",
      "fetch",
      "message",
      "push",
      "notificationclick",
      "pushsubscriptionchange",
    ]) {
      expect(
        h.listeners[type]?.length ?? 0,
        `missing listener: ${type}`,
      ).toBeGreaterThan(0);
    }
  });

  test("push without payload shows the default TRAK notification", async () => {
    const h = loadSw();
    const event = {
      data: null as unknown,
      _done: Promise.resolve() as Promise<unknown>,
      waitUntil(p: Promise<unknown>) {
        this._done = p;
      },
    };
    for (const fn of h.listeners.push ?? []) fn(event);
    await event._done;
    expect(h.registration.showNotification).toHaveBeenCalledWith(
      "TRAK",
      expect.objectContaining({ data: { url: "/dashboard" } }),
    );
  });

  test("push with payload shows it when no client is focused on target", async () => {
    const h = loadSw();
    const event = {
      data: { json: () => ({ title: "Hi", body: "Yo", data: { url: "/messages" } }) },
      _done: Promise.resolve() as Promise<unknown>,
      waitUntil(p: Promise<unknown>) {
        this._done = p;
      },
    };
    for (const fn of h.listeners.push ?? []) fn(event);
    await event._done;
    expect(h.registration.showNotification).toHaveBeenCalledWith(
      "Hi",
      expect.objectContaining({ body: "Yo" }),
    );
  });

  test("notification click focuses an existing client", async () => {
    const h = loadSw();
    const navigate = vi.fn(async () => {});
    const focus = vi.fn(async () => {});
    h.clients.matchAll = async () => [
      { url: `${ORIGIN}/dashboard`, focused: false, navigate, focus },
    ];
    const event = {
      notification: { close: vi.fn(), data: { url: "/messages" } },
      _done: Promise.resolve() as Promise<unknown>,
      waitUntil(p: Promise<unknown>) {
        this._done = p;
      },
    };
    for (const fn of h.listeners.notificationclick ?? []) fn(event);
    await event._done;
    expect(event.notification.close).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(`${ORIGIN}/messages`);
    expect(focus).toHaveBeenCalled();
  });
});
