/**
 * Per-session offline-cache coordination (client side).
 *
 * The service worker (`public/sw.js`) keeps network-first caches of Next.js
 * RSC flight responses, authenticated document pages, and /api/bootstrap so
 * previously-visited routes work offline. Because TRAK's app layout
 * serialises a full per-user bootstrap into those payloads, they must never
 * cross sessions — a naive URL-keyed cache could show one user's data to the
 * next user on the same device.
 *
 * The SW cannot read the httpOnly session cookie, so this module owns the
 * security boundary instead:
 *
 * - A random `key` is persisted per login (`read/writeRscCacheSession`).
 * - The SW only caches authenticated responses under
 *   `trak-<kind>-<version>-<key>`.
 * - When the persisted userId differs from the active session (a new login),
 *   the key is rotated; the SW drops every session-namespaced cache whenever
 *   the advertised key changes.
 * - On logout the key is rotated (and cached payloads purged), so the next
 *   session starts from an empty, unreachable namespace.
 * - The same key is also written to a dedicated IndexedDB record
 *   ("trak-sw-session") that the SW reads back after a cold start, so a
 *   service-worker restart keeps working offline without weakening the
 *   namespace boundary.
 *
 * All functions are SSR-safe and never throw.
 */

import {
  readRscCacheSession,
  writeRscCacheSession,
} from "@/lib/offline/db";

const MSG_SET_SESSION = "trak-rsc-session";
const MSG_PURGE = "trak-rsc-purge";

function swAvailable(): boolean {
  return (
    typeof navigator !== "undefined" && "serviceWorker" in navigator
  );
}

function randomKey(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to non-crypto fallback */
  }
  return (
    "k-" +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

async function postToSw(message: Record<string, unknown>): Promise<void> {
  if (!swAvailable()) return;
  try {
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      controller.postMessage(message);
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage(message);
  } catch {
    /* messaging is best-effort; key namespacing protects on its own */
  }
}

// Minimal, dedicated IndexedDB record the service worker reads on a cold
// start to recover the active session key without a fresh postMessage. This
// keeps offline navigation (and the session namespace boundary) intact
// across service-worker restarts. It is intentionally separate from the
// Dexie "meta" store so the SW never depends on the app's own schema.
const SW_KEY_DB = "trak-sw-session";
const SW_KEY_STORE = "keys";
const SW_KEY_ID = "active-rsc";

export function writeSessionKeyRecord(
  key: string,
  userId: string,
): Promise<void> {
  return new Promise((resolve) => {
    if (
      !swAvailable() ||
      typeof indexedDB === "undefined" ||
      typeof key !== "string" ||
      !key
    ) {
      resolve();
      return; 
    }
    try {
      const req = indexedDB.open(SW_KEY_DB, 1);
      req.onupgradeneeded = () => {
        try {
          if (!req.result.objectStoreNames.contains(SW_KEY_STORE)) {
            req.result.createObjectStore(SW_KEY_STORE);
          }
        } catch {
          /* ignore */
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(SW_KEY_STORE, "readwrite");
          tx.objectStore(SW_KEY_STORE).put(
            { key, userId, updatedAt: Date.now() },
            SW_KEY_ID,
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } catch {
          db.close();
          resolve();
        }
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Advertise the current session's RSC cache key to the service worker.
 *
 * Rotates the key when the stored userId does not match the active session
 * (a login or account switch), so the new session can never reuse a
 * previous session's cache namespace. Keeps the key across same-session
 * reloads so an offline app relaunch keeps its cached routes.
 */
export async function syncRscCacheSession(userId: string): Promise<void> {
  if (!swAvailable()) return;
  const current = await readRscCacheSession();
  if (current && current.userId === userId && current.key) {
    // Same session reload — reuse the namespace and keep the cache. Also
    // (re)persist the SW-readable record in case it was cleared or the
    // previous write only reached the Dexie meta store.
    await writeSessionKeyRecord(current.key, userId);
    await postToSw({ type: MSG_SET_SESSION, key: current.key });
    return;
  }
  // New/unknown session — rotate to a fresh namespace. The SW purges all
  // session caches when the advertised key changes, dropping any data
  // cached by the previous session on this device.
  const key = randomKey();
  await writeRscCacheSession({ key, userId });
  await writeSessionKeyRecord(key, userId);
  await postToSw({ type: MSG_SET_SESSION, key });
}

/**
 * Purge all session-namespaced caches (pages, bootstrap, RSC flights) — call
 * on logout — and rotate the persisted key so a stale namespace can never be
 * reused, even if the purge message is lost during page unload.
 */
export async function purgeRscCacheSession(): Promise<void> {
  if (!swAvailable()) return;
  try {
    await postToSw({ type: MSG_PURGE });
    const current = await readRscCacheSession();
    if (current?.userId) {
      const key = randomKey();
      await writeRscCacheSession({ key, userId: current.userId });
      await writeSessionKeyRecord(key, current.userId);
    }
  } catch {
    /* best-effort */
  }
}