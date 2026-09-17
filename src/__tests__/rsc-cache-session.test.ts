/**
 * Per-session RSC cache-key coordination tests (Phase 3B).
 *
 * Verifies that the client module which secures the service worker's RSC
 * flight cache: creates/rotates a per-login key, keeps it across
 * same-session reloads, rotates on account switch, and purges + rotates
 * on logout — so no session can ever reuse another session's cache
 * namespace on the same device.
 */
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Emulate the browser global checked by the offline db helpers.
(globalThis as unknown as { window: unknown }).window = globalThis;

import {
  readRscCacheSession,
  clearOfflineCache,
  __resetOfflineDbForTests,
} from "@/lib/offline/db";
import {
  purgeRscCacheSession,
  syncRscCacheSession,
} from "@/lib/sw/rsc-cache-session";

type PostedMessage = Record<string, unknown>;

let posted: PostedMessage[] = [];
let uuids: string[] = [];

function stubSw(): void {
  const controller = {
    postMessage: (m: PostedMessage) => {
      posted.push(m);
    },
  };
  const active = {
    postMessage: (m: PostedMessage) => {
      posted.push(m);
    },
  };
  vi.stubGlobal("navigator", {
    serviceWorker: {
      controller,
      ready: Promise.resolve({ active }),
    },
  });
}

beforeEach(() => {
  posted = [];
  uuids = [];
  vi.stubGlobal("crypto", {
    ...(globalThis as { crypto?: Crypto }).crypto,
    randomUUID: () => {
      uuids.push(`uuid-${uuids.length + 1}`);
      return `uuid-${uuids.length}`;
    },
  });
  stubSw();
});

afterEach(async () => {
  await clearOfflineCache();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("trak-sw-session");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
  vi.unstubAllGlobals();
  __resetOfflineDbForTests();
});

/** Read the dedicated SW-readable key record written to IndexedDB. */
async function readSwKeyRecord(): Promise<{ key: string; userId: string } | null> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("trak-sw-session", 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains("keys")) {
        req.result.createObjectStore("keys");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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

describe("syncRscCacheSession", () => {
  test("creates and advertises a fresh key on first boot", async () => {
    await syncRscCacheSession("u1");

    expect(posted).toEqual([
      { type: "trak-rsc-session", key: "uuid-1" },
    ]);
    const stored = await readRscCacheSession();
    expect(stored).toEqual({ key: "uuid-1", userId: "u1" });
    // The SW must be able to recover the same key after a cold start.
    expect(await readSwKeyRecord()).toEqual({ key: "uuid-1", userId: "u1" });
  });

  test("keeps the same key across same-session reloads (offline continuity)", async () => {
    await syncRscCacheSession("u1");
    const key = posted[0].key;

    posted = [];
    await syncRscCacheSession("u1");
    expect(posted).toEqual([
      { type: "trak-rsc-session", key },
    ]);
    const stored = await readRscCacheSession();
    expect(stored).toEqual({ key, userId: "u1" });
    expect((await readSwKeyRecord())?.key).toBe(key);
  });

  test("rotates the key when a different user starts a session", async () => {
    await syncRscCacheSession("u1");
    const key1 = posted[0].key;

    await syncRscCacheSession("u2");
    expect(posted).toHaveLength(2);
    const key2 = posted[1].key as string;
    expect(key2).not.toBe(key1);

    const stored = await readRscCacheSession();
    expect(stored).toEqual({ key: key2, userId: "u2" });
    expect(await readSwKeyRecord()).toEqual({ key: key2, userId: "u2" });
  });

  test("no-ops when the browser has no service worker", async () => {
    vi.stubGlobal("navigator", {});
    await expect(syncRscCacheSession("u1")).resolves.toBeUndefined();
    expect(posted).toHaveLength(0);
    expect(await readRscCacheSession()).toBeNull();
    expect(await readSwKeyRecord()).toBeNull();
  });
});

describe("purgeRscCacheSession", () => {
  test("posts a purge and rotates the persisted key (logout)", async () => {
    await syncRscCacheSession("u1");
    const key1 = posted[0].key as string;

    posted = [];
    await purgeRscCacheSession();
    expect(posted).toEqual([{ type: "trak-rsc-purge" }]);

    const stored = await readRscCacheSession();
    expect(stored).not.toBeNull();
    expect(stored!.userId).toBe("u1");
    expect(stored!.key).not.toBe(key1);
    // The rotated (post-logout, empty) namespace must also be what the SW
    // recovers after a cold start — never the pre-logout one.
    expect(await readSwKeyRecord()).toEqual({
      key: stored!.key,
      userId: "u1",
    });
  });
});