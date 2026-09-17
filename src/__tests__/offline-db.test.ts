/**
 * Phase 1 offline-first foundation — IndexedDB (Dexie) persistence tests.
 *
 * Uses fake-indexeddb to emulate the browser. Helpers must never throw,
 * even when IndexedDB is unavailable (SSR / private mode).
 */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test } from "vitest";

// Emulate the browser globals checked by isOfflineDbAvailable().
(globalThis as unknown as { window: unknown }).window = globalThis;

import {
  clearOfflineCache,
  countPendingOutbox,
  enqueueOutbox,
  getLastBootstrapAt,
  isOfflineDbAvailable,
  listOutbox,
  loadCachedBootstrap,
  loadCachedSessionIdentity,
  persistBootstrap,
  persistSessionIdentity,
  removeOutboxEntry,
  type OfflineBootstrapSnapshot,
} from "@/lib/offline/db";
import type { SessionUser, User } from "@/lib/types";

function sampleUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    name: "Test User",
    username: "testuser",
    email: null,
    role: "member",
    isSecretary: false,
    isCorps: false,
    isIntern: false,
    color: "#0e6b47",
    phone: "",
    designation: "",
    gradeLevel: "",
    sex: "",
    stateOfOrigin: "",
    dateJoined: "",
    photoUrl: null,
    isActive: true,
    ...overrides,
  } as User;
}

function sampleSession(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "user-1",
    authUserId: "user-1",
    name: "Test User",
    username: "testuser",
    role: "member",
    isSecretary: false,
    isCorps: false,
    isIntern: false,
    mustChangePassword: false,
    ...overrides,
  };
}

function sampleSnapshot(): OfflineBootstrapSnapshot {
  return {
    users: [sampleUser()],
    db: {
      activities: [],
      dailyLogs: [],
      comments: [],
      dms: [],
      calls: [],
      community: [],
      broadcasts: [],
      announcements: [],
      notifications: [],
    },
    responsibilities: [],
    serverTime: new Date().toISOString(),
  };
}

async function clearOutbox(): Promise<void> {
  const items = await listOutbox();
  await Promise.all(
    items
      .filter((i) => i.id !== undefined)
      .map((i) => removeOutboxEntry(i.id as number)),
  );
}

beforeEach(async () => {
  await clearOfflineCache();
  await clearOutbox();
});

describe("offline db availability", () => {
  test("available with browser globals + indexedDB", () => {
    expect(isOfflineDbAvailable()).toBe(true);
  });

  test("helpers degrade gracefully without a browser environment", async () => {
    const g = globalThis as unknown as Record<string, unknown>;
    const savedWindow = g.window;
    delete g.window;
    try {
      expect(isOfflineDbAvailable()).toBe(false);
      await expect(loadCachedBootstrap()).resolves.toBeNull();
      await expect(loadCachedSessionIdentity()).resolves.toBeNull();
      await expect(
        persistBootstrap(sampleSnapshot()),
      ).resolves.toBeUndefined();
      await expect(
        persistSessionIdentity(sampleSession()),
      ).resolves.toBeUndefined();
      await expect(listOutbox()).resolves.toEqual([]);
      await expect(countPendingOutbox()).resolves.toBe(0);
    } finally {
      g.window = savedWindow;
    }
  });
});

describe("bootstrap persist / load", () => {
  test("returns null when cache is empty", async () => {
    await expect(loadCachedBootstrap()).resolves.toBeNull();
  });

  test("round-trips a snapshot", async () => {
    const snap = sampleSnapshot();
    await persistBootstrap(snap);
    const loaded = await loadCachedBootstrap();
    expect(loaded).not.toBeNull();
    expect(loaded?.users).toHaveLength(1);
    expect(loaded?.users[0].id).toBe("user-1");
    expect(loaded?.responsibilities).toEqual([]);
    expect(loaded?.db.activities).toEqual([]);
    expect(typeof loaded?.serverTime).toBe("string");
  });

  test("later snapshots replace earlier ones (no stale rows)", async () => {
    const first = sampleSnapshot();
    first.db.activities = [
      { id: "act-old", title: "Old" } as unknown as never,
    ] as never;
    await persistBootstrap(first as OfflineBootstrapSnapshot);

    const second = sampleSnapshot();
    second.db.activities = [
      { id: "act-new", title: "New" } as unknown as never,
    ] as never;
    await persistBootstrap(second as OfflineBootstrapSnapshot);

    const loaded = await loadCachedBootstrap();
    expect(loaded?.db.activities.map((a) => a.id)).toEqual(["act-new"]);
  });

  test("records last bootstrap time", async () => {
    await expect(getLastBootstrapAt()).resolves.toBeNull();
    await persistBootstrap(sampleSnapshot());
    const at = await getLastBootstrapAt();
    expect(typeof at).toBe("string");
  });
});

describe("session identity cache", () => {
  test("returns null when absent", async () => {
    await expect(loadCachedSessionIdentity()).resolves.toBeNull();
  });

  test("round-trips the session identity", async () => {
    await persistSessionIdentity(sampleSession({ username: "offline-user" }));
    const loaded = await loadCachedSessionIdentity();
    expect(loaded?.id).toBe("user-1");
    expect(loaded?.username).toBe("offline-user");
  });
});

describe("outbox (Phase 2 queue surface)", () => {
  test("enqueue → list → count → remove", async () => {
    await expect(countPendingOutbox()).resolves.toBe(0);
    const id = await enqueueOutbox({
      method: "POST",
      path: "/api/messages/dms",
      body: { toId: "user-2", text: "hello" },
    });
    expect(typeof id).toBe("number");

    await expect(countPendingOutbox()).resolves.toBe(1);
    const items = await listOutbox();
    expect(items).toHaveLength(1);
    expect(items[0].path).toBe("/api/messages/dms");
    expect(items[0].status).toBe("pending");

    await removeOutboxEntry(id as number);
    await expect(countPendingOutbox()).resolves.toBe(0);
  });
});
