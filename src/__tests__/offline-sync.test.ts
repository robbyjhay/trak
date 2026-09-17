/**
 * Phase 2 offline mutations + sync engine tests.
 *
 * Covers: queue-on-offline, queue-on-network-failure, ordered replay,
 * idempotency keys, transient vs permanent vs auth failures, temp-id
 * remapping (including across interrupted drains), auto-sync wiring,
 * and the offline temp-object builders used for activity creation.
 */
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Emulate the browser globals checked by isOfflineDbAvailable().
(globalThis as unknown as { window: unknown }).window = globalThis;

import { ApiError } from "@/lib/api/client";
import {
  clearOfflineCache,
  countFailedOutbox,
  countPendingOutbox,
  enqueueOutbox,
  listOutbox,
  loadTempIdMappings,
  removeOutboxByTempId,
  resetFailedOutbox,
} from "@/lib/offline/db";
import {
  applyTempIdMappings,
  extractCreatedId,
  IDEMPOTENCY_HEADER,
  isOfflineNow,
  isQueuedForSync,
  QueuedForSyncError,
  sendQueued,
  startAutoSync,
  syncOutbox,
} from "@/lib/offline/sync";
import {
  buildOfflineActivity,
  buildOfflineComment,
  buildOfflineDailyLog,
  isTempId,
  mergeOfflineDailyLog,
  newTempId,
} from "@/lib/offline/pending";

interface FetchCall {
  url: string;
  init: RequestInit;
}

let fetchCalls: FetchCall[] = [];
let fetchImpl: (url: string, init: RequestInit) => Promise<Response> =
  async () => okJson({});
const realFetch = globalThis.fetch;
const realNavigator = (globalThis as Record<string, unknown>).navigator;

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function errJson(status: number, body: unknown = { error: "Bad request" }): Response {
  return new Response(JSON.stringify(body), { status });
}

function setOnline(onLine: boolean): void {
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine },
    configurable: true,
    writable: true,
  });
}

async function clearOutbox(): Promise<void> {
  const items = await listOutbox();
  const { removeOutboxEntry } = await import("@/lib/offline/db");
  await Promise.all(
    items
      .filter((i) => typeof i.id === "number")
      .map((i) => removeOutboxEntry(i.id as number)),
  );
}

function headerOf(call: FetchCall, name: string): string | null {
  const h = call.init.headers as Record<string, string> | undefined;
  if (h && typeof h === "object" && name in h) return h[name];
  return null;
}

beforeEach(async () => {
  fetchCalls = [];
  (globalThis as Record<string, unknown>).fetch = async (
    url: string,
    init: RequestInit,
  ) => {
    fetchCalls.push({ url, init });
    return fetchImpl(url, init);
  };
  fetchImpl = async () => okJson({});
  setOnline(true);
  await clearOfflineCache();
  await clearOutbox();
});

afterEach(() => {
  (globalThis as Record<string, unknown>).fetch = realFetch;
  if (realNavigator === undefined) {
    delete (globalThis as Record<string, unknown>).navigator;
  } else {
    Object.defineProperty(globalThis, "navigator", {
      value: realNavigator,
      configurable: true,
      writable: true,
    });
  }
  vi.restoreAllMocks();
});

describe("offline detection", () => {
  test("online by default, offline when the browser says so", () => {
    setOnline(true);
    expect(isOfflineNow()).toBe(false);
    setOnline(false);
    expect(isOfflineNow()).toBe(true);
  });
});

describe("sendQueued", () => {
  test("sends directly when online and returns the server response", async () => {
    fetchImpl = async () => okJson({ activity: { id: "real-1" } });
    const res = await sendQueued<{ activity: { id: string } }>(
      "/api/activities",
      "POST",
      { title: "T" },
    );
    expect(res.activity.id).toBe("real-1");
    expect(fetchCalls).toHaveLength(1);
    expect(headerOf(fetchCalls[0], IDEMPOTENCY_HEADER)).toMatch(/^.+$/);
    expect(headerOf(fetchCalls[0], "Content-Type")).toBe("application/json");
    await expect(countPendingOutbox()).resolves.toBe(0);
  });

  test("queues without touching the network when offline", async () => {
    setOnline(false);
    const err = await sendQueued("/api/messages/dms", "POST", {
      toId: "u2",
      text: "hi",
    }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(isQueuedForSync(err)).toBe(true);
    expect((err as QueuedForSyncError).outboxId).toEqual(expect.any(Number));
    expect(fetchCalls).toHaveLength(0);
    const items = await listOutbox();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      method: "POST",
      path: "/api/messages/dms",
      status: "pending",
    });
    expect(items[0].body).toEqual({ toId: "u2", text: "hi" });
    expect(typeof items[0].idempotencyKey).toBe("string");
  });

  test("queues when an online request fails with a network error", async () => {
    fetchImpl = async () => {
      throw new TypeError("fetch failed");
    };
    const err = await sendQueued("/api/messages/dms", "POST", {
      text: "hi",
    }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(isQueuedForSync(err)).toBe(true);
    await expect(countPendingOutbox()).resolves.toBe(1);
  });

  test("rethrows application errors without queueing", async () => {
    fetchImpl = async () => errJson(400, { error: "Nope" });
    await expect(
      sendQueued("/api/messages/dms", "POST", { text: "" }),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(countPendingOutbox()).resolves.toBe(0);
  });

  test("rethrows the original error when the queue itself is unavailable", async () => {
    const g = globalThis as unknown as Record<string, unknown>;
    const savedWindow = g.window;
    delete g.window;
    setOnline(false);
    try {
      await expect(
        sendQueued("/api/messages/dms", "POST", { text: "hi" }),
      ).rejects.toBeInstanceOf(ApiError);
    } finally {
      g.window = savedWindow;
    }
  });
});

describe("syncOutbox replay", () => {
  test("replays oldest-first with stable idempotency keys, then reconciles", async () => {
    await enqueueOutbox({
      method: "POST",
      path: "/api/a",
      body: { n: 1 },
      idempotencyKey: "key-1",
    });
    await enqueueOutbox({
      method: "PATCH",
      path: "/api/b",
      body: { n: 2 },
      idempotencyKey: "key-2",
    });
    fetchImpl = async () => okJson({ ok: true });

    const reconciled: string[] = [];
    const result = await syncOutbox({
      onReconcile: async () => {
        reconciled.push("yes");
      },
    });

    expect(result).toMatchObject({ attempted: 2, succeeded: 2 });
    expect(result.failed).toHaveLength(0);
    expect(fetchCalls.map((c) => c.url)).toEqual(["/api/a", "/api/b"]);
    expect(headerOf(fetchCalls[0], IDEMPOTENCY_HEADER)).toBe("key-1");
    expect(headerOf(fetchCalls[1], IDEMPOTENCY_HEADER)).toBe("key-2");
    expect(reconciled).toEqual(["yes"]);
    await expect(countPendingOutbox()).resolves.toBe(0);
  });

  test("transient failure stops the drain and keeps entries pending", async () => {
    await enqueueOutbox({ method: "POST", path: "/api/a" });
    await enqueueOutbox({ method: "POST", path: "/api/b" });
    let calls = 0;
    fetchImpl = async () => {
      calls += 1;
      return errJson(500, { error: "Boom" });
    };

    let reconciled = false;
    const result = await syncOutbox({
      onReconcile: async () => {
        reconciled = true;
      },
    });

    expect(result.stoppedOnTransient).toBe(true);
    expect(result.succeeded).toBe(0);
    expect(calls).toBe(1);
    expect(reconciled).toBe(false);
    await expect(countPendingOutbox()).resolves.toBe(2);
    await expect(countFailedOutbox()).resolves.toBe(0);
  });

  test("permanent failure parks the entry and continues with the rest", async () => {
    await enqueueOutbox({ method: "POST", path: "/api/bad" });
    await enqueueOutbox({ method: "POST", path: "/api/good" });
    fetchImpl = async (url) =>
      url === "/api/bad"
        ? errJson(400, { error: "Validation failed" })
        : okJson({ ok: true });

    const failures: string[] = [];
    const result = await syncOutbox({
      onReconcile: async () => {},
      onFailures: (failed) => {
        failures.push(...failed.map((f) => f.path));
      },
    });

    expect(result.succeeded).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].path).toBe("/api/bad");
    expect(failures).toEqual(["/api/bad"]);
    await expect(countPendingOutbox()).resolves.toBe(1); // failed still counts
    await expect(countFailedOutbox()).resolves.toBe(1);
    const remaining = await listOutbox();
    expect(remaining[0].status).toBe("failed");
    expect(remaining[0].lastError).toBe("Validation failed");

    // Explicit retry re-queues the failed entry.
    fetchImpl = async () => okJson({ ok: true });
    await resetFailedOutbox();
    await expect(countFailedOutbox()).resolves.toBe(0);
    const retry = await syncOutbox({ onReconcile: async () => {} });
    expect(retry.succeeded).toBe(1);
    await expect(countPendingOutbox()).resolves.toBe(0);
  });

  test("401 stops the drain without consuming the queue", async () => {
    await enqueueOutbox({ method: "POST", path: "/api/a" });
    fetchImpl = async () => errJson(401, { error: "Unauthorized" });

    const result = await syncOutbox({ onReconcile: async () => {} });

    expect(result.stoppedOnAuth).toBe(true);
    expect(result.succeeded).toBe(0);
    await expect(countPendingOutbox()).resolves.toBe(1);
    const [entry] = await listOutbox();
    expect(entry.status).toBe("pending");
  });

  test("concurrent callers share a single in-flight drain", async () => {
    await enqueueOutbox({ method: "POST", path: "/api/a" });
    await enqueueOutbox({ method: "POST", path: "/api/b" });
    fetchImpl = async () => {
      await new Promise((r) => setTimeout(r, 25));
      return okJson({ ok: true });
    };

    const [r1, r2] = await Promise.all([syncOutbox(), syncOutbox()]);
    expect(fetchCalls).toHaveLength(2);
    expect(r1.succeeded).toBe(2);
    expect(r2.succeeded).toBe(2);
  });

  test("empty outbox resolves without network or reconcile", async () => {
    let reconciled = false;
    const result = await syncOutbox({
      onReconcile: async () => {
        reconciled = true;
      },
    });
    expect(result).toMatchObject({ attempted: 0, succeeded: 0 });
    expect(fetchCalls).toHaveLength(0);
    expect(reconciled).toBe(false);
  });
});

describe("temp-id remapping", () => {
  test("extractCreatedId reads create responses, ignores the rest", () => {
    expect(
      extractCreatedId({ tempId: "temp_1", method: "POST" }, { id: "real-1" }),
    ).toBe("real-1");
    expect(
      extractCreatedId(
        { tempId: "temp_1", method: "POST" },
        { activity: { id: "real-a" } },
      ),
    ).toBe("real-a");
    expect(
      extractCreatedId(
        { tempId: "temp_1", method: "POST" },
        { log: { id: "real-l" } },
      ),
    ).toBe("real-l");
    expect(
      extractCreatedId({ tempId: "temp_1", method: "POST" }, { community: [] }),
    ).toBeNull();
    expect(
      extractCreatedId({ method: "POST" }, { id: "real-1" }),
    ).toBeNull();
    expect(
      extractCreatedId({ tempId: "temp_1", method: "PATCH" }, { id: "x" }),
    ).toBeNull();
  });

  test("applyTempIdMappings rewrites paths and bodies", () => {
    const out = applyTempIdMappings(
      { path: "/api/activities/temp_1/logs", body: { replyToId: "temp_9" } },
      { temp_1: "real-1", temp_9: "real-9" },
    );
    expect(out.path).toBe("/api/activities/real-1/logs");
    expect(out.body).toEqual({ replyToId: "real-9" });
  });

  test("child mutations replay against the synced parent id", async () => {
    await enqueueOutbox({
      method: "POST",
      path: "/api/activities",
      body: { title: "T" },
      tempId: "temp_act_1",
    });
    await enqueueOutbox({
      method: "POST",
      path: "/api/activities/temp_act_1/logs",
      body: { date: "2026-09-12" },
    });
    fetchImpl = async (url) =>
      url === "/api/activities"
        ? okJson({ activity: { id: "real_act_1" } })
        : okJson({ log: { id: "real_log_1" } });

    const result = await syncOutbox({ onReconcile: async () => {} });

    expect(result.succeeded).toBe(2);
    expect(fetchCalls.map((c) => c.url)).toEqual([
      "/api/activities",
      "/api/activities/real_act_1/logs",
    ]);
    // Mapping was recorded, then pruned once nothing referenced it.
    await expect(loadTempIdMappings()).resolves.toEqual({});
    await expect(countPendingOutbox()).resolves.toBe(0);
  });

  test("mappings survive an interrupted drain and apply on retry", async () => {
    await enqueueOutbox({
      method: "POST",
      path: "/api/activities",
      body: { title: "T" },
      tempId: "temp_act_9",
    });
    await enqueueOutbox({
      method: "POST",
      path: "/api/activities/temp_act_9/logs",
      body: { date: "2026-09-12" },
    });

    let failChild = true;
    fetchImpl = async (url) => {
      if (url === "/api/activities") return okJson({ activity: { id: "real_act_9" } });
      if (failChild) return errJson(500, { error: "Flaky" });
      return okJson({ log: { id: "real_log_9" } });
    };

    const first = await syncOutbox({ onReconcile: async () => {} });
    expect(first.succeeded).toBe(1);
    expect(first.stoppedOnTransient).toBe(true);
    // Mapping persisted even though the drain stopped midway.
    await expect(loadTempIdMappings()).resolves.toEqual({
      temp_act_9: "real_act_9",
    });

    failChild = false;
    const second = await syncOutbox({ onReconcile: async () => {} });
    expect(second.succeeded).toBe(1);
    const childCalls = fetchCalls.filter((c) =>
      c.url.includes("/logs"),
    );
    expect(childCalls.at(-1)?.url).toBe("/api/activities/real_act_9/logs");
    await expect(countPendingOutbox()).resolves.toBe(0);
  });

  test("deleting an unsynced temp object drops its queued create", async () => {
    await enqueueOutbox({
      method: "POST",
      path: "/api/messages/dms",
      body: { text: "unsent" },
      tempId: "temp_dm_1",
    });
    await expect(countPendingOutbox()).resolves.toBe(1);
    await expect(removeOutboxByTempId("temp_dm_1")).resolves.toBe(1);
    await expect(countPendingOutbox()).resolves.toBe(0);
    expect(fetchCalls).toHaveLength(0);
  });
});

describe("startAutoSync", () => {
  test("runs on online events and stops after unsubscribe", () => {
    const listeners = new Map<string, Array<() => void>>();
    const fakeWindow = {
      addEventListener: (type: string, fn: () => void) => {
        const list = listeners.get(type) ?? [];
        list.push(fn);
        listeners.set(type, list);
      },
      removeEventListener: (type: string, fn: () => void) => {
        listeners.set(
          type,
          (listeners.get(type) ?? []).filter((f) => f !== fn),
        );
      },
    };
    const g = globalThis as unknown as Record<string, unknown>;
    const savedWindow = g.window;
    g.window = fakeWindow;
    try {
      let runs = 0;
      const stop = startAutoSync(() => {
        runs += 1;
      });
      for (const fn of listeners.get("online") ?? []) fn();
      expect(runs).toBe(1);
      stop();
      for (const fn of listeners.get("online") ?? []) fn();
      expect(runs).toBe(1);
    } finally {
      g.window = savedWindow;
    }
  });

  test("no-op outside the browser", () => {
    const g = globalThis as unknown as Record<string, unknown>;
    const savedWindow = g.window;
    delete g.window;
    try {
      let runs = 0;
      const stop = startAutoSync(() => {
        runs += 1;
      });
      expect(typeof stop).toBe("function");
      stop();
      expect(runs).toBe(0);
    } finally {
      g.window = savedWindow;
    }
  });
});

describe("offline temp builders (activity creation while offline)", () => {
  test("buildOfflineActivity produces a renderable pending activity", () => {
    const temp = buildOfflineActivity({
      title: "  Field trip  ",
      type: "Project",
      description: "Desc",
      createdBy: "user-1",
      startDate: "2026-09-12",
      endDate: "2026-09-13",
      startTime: "09:00",
      responsibilityIds: ["r1"],
    });
    expect(isTempId(temp.id)).toBe(true);
    expect(temp).toMatchObject({
      title: "  Field trip  ",
      createdBy: "user-1",
      status: "pending",
      exceptionStatus: "none",
      hidden: false,
      softDeletedAt: null,
    });
    expect(isTempId("real-uuid")).toBe(false);
    expect(newTempId()).not.toBe(newTempId());
  });

  test("daily-log builders merge and stage submissions", () => {
    const staged = buildOfflineDailyLog("act-1", "2026-09-12", {
      objectives: "Teach",
    });
    expect(staged).toMatchObject({
      activityId: "act-1",
      date: "2026-09-12",
      objectives: "Teach",
      status: "submitted",
    });
    expect(isTempId(staged.id)).toBe(true);

    const merged = mergeOfflineDailyLog(
      { ...staged, transcript: "keep me" },
      { attendanceCount: "25" },
    );
    expect(merged.transcript).toBe("keep me");
    expect(merged.attendanceCount).toBe("25");
    expect(merged.status).toBe("submitted");
  });

  test("comment builder carries activity, author, and text", () => {
    const c = buildOfflineComment("act-1", "user-1", "Nice work");
    expect(c).toMatchObject({
      activityId: "act-1",
      authorId: "user-1",
      text: "Nice work",
    });
    expect(isTempId(c.id)).toBe(true);
  });
});
