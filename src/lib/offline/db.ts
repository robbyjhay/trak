/**
 * Offline-first foundation (Phase 1) — IndexedDB via Dexie.
 *
 * Mirrors the client-side `TrakDb` collections so a successful
 * `/api/bootstrap` snapshot can be persisted locally and re-loaded
 * on startup when the network is unavailable.
 *
 * Design constraints:
 * - Client-only: every public helper is SSR-safe (returns a safe
 *   fallback on the server or when IndexedDB is unavailable).
 * - Never throws: persistence failures must never break app boot or
 *   the existing optimistic-update flow in `TrakStore`.
 * - Storage only: replay/retry lives in `sync.ts`; this module owns
 *   IndexedDB access. Auth tokens are never stored here — only
 *   display-safe session identity (see `persistSessionIdentity`).
 */

import Dexie, { type Table } from "dexie";
import type {
  Activity,
  Announcement,
  Broadcast,
  CallRecord,
  Comment,
  CommunityMessage,
  DailyLog,
  Dm,
  Notification,
  Responsibility,
  SessionUser,
  TrakDb,
  User,
} from "@/lib/types";

/** Snapshot shape persisted to / restored from IndexedDB. */
export interface OfflineBootstrapSnapshot {
  users: User[];
  db: TrakDb;
  responsibilities: Responsibility[];
  serverTime?: string;
}

/** Pending offline mutation — payload for the Phase 2 sync engine. */
export type OutboxStatus = "pending" | "sending" | "failed";

export interface OutboxEntry {
  /** Auto-increment primary key. */
  id?: number;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  /**
   * Stable idempotency key, generated once at enqueue time and re-sent on
   * every retry via the `X-Idempotency-Key` header. The server ignores it
   * today; it exists so retries never change identity and future
   * server-side dedupe can key off it.
   */
  idempotencyKey?: string;
  /**
   * Client temp id (`temp_…`) of the optimistically-created object, when
   * the mutation creates one. Lets the store coalesce follow-up actions
   * (e.g. deleting a message that was itself created offline).
   */
  tempId?: string;
  createdAt: string;
  retryCount: number;
  status: OutboxStatus;
  /** Last failure message (permanent failures only). */
  lastError?: string;
}

export interface OutboxInput {
  method: OutboxEntry["method"];
  path: string;
  body?: unknown;
  idempotencyKey?: string;
  tempId?: string;
}

interface MetaRow {
  key: string;
  value: unknown;
}

const DB_NAME = "trak-offline";
const META_SESSION_USER = "sessionUser";
const META_SERVER_TIME = "serverTime";
const META_LAST_BOOTSTRAP_AT = "lastBootstrapAt";
/** Meta-key prefix for client-temp-id → server-id mappings. */
const META_TEMP_MAP_PREFIX = "tempmap:";
/** Per-session RSC flight-cache namespace key (advertised to the SW). */
const META_RSC_SESSION = "rscCacheSession";

class TrakOfflineDb extends Dexie {
  users!: Table<User, string>;
  activities!: Table<Activity, string>;
  dailyLogs!: Table<DailyLog, string>;
  comments!: Table<Comment, string>;
  dms!: Table<Dm, string>;
  calls!: Table<CallRecord, string>;
  community!: Table<CommunityMessage, string>;
  broadcasts!: Table<Broadcast, string>;
  announcements!: Table<Announcement, string>;
  notifications!: Table<Notification, string>;
  responsibilities!: Table<Responsibility, string>;
  outbox!: Table<OutboxEntry, number>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      users: "id",
      activities: "id",
      dailyLogs: "id, activityId",
      comments: "id, activityId",
      dms: "id",
      calls: "id",
      community: "id",
      broadcasts: "id",
      announcements: "id",
      notifications: "id, userId",
      responsibilities: "id",
      outbox: "++id, status, createdAt",
      meta: "key",
    });
  }
}

let dbInstance: TrakOfflineDb | null = null;

/** True only in a browser with IndexedDB available. */
export function isOfflineDbAvailable(): boolean {
  return (
    typeof window !== "undefined" && typeof indexedDB !== "undefined"
  );
}

function getOfflineDb(): TrakOfflineDb | null {
  if (!isOfflineDbAvailable()) return null;
  if (!dbInstance) {
    try {
      dbInstance = new TrakOfflineDb();
    } catch {
      return null;
    }
  }
  return dbInstance;
}

/** Test hook — resets the module-level singleton (e.g. between tests). */
export function __resetOfflineDbForTests(): void {
  dbInstance = null;
}

function warn(action: string, err: unknown): void {
  try {
    console.warn(`[offline-db] ${action} failed`, err);
  } catch {
    /* logging must never throw */
  }
}

/**
 * Persist a successful bootstrap snapshot. Replaces previously cached
 * collections atomically (bootstrap is a full scoped snapshot, so stale
 * rows — e.g. deleted messages — must not survive). Never throws.
 */
export async function persistBootstrap(
  snapshot: OfflineBootstrapSnapshot,
): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  const collections = snapshot.db;
  try {
    await db.transaction(
      "rw",
      [
        db.users,
        db.activities,
        db.dailyLogs,
        db.comments,
        db.dms,
        db.calls,
        db.community,
        db.broadcasts,
        db.announcements,
        db.notifications,
        db.responsibilities,
        db.meta,
      ],
      async () => {
        await Promise.all([
          db.users.clear(),
          db.activities.clear(),
          db.dailyLogs.clear(),
          db.comments.clear(),
          db.dms.clear(),
          db.calls.clear(),
          db.community.clear(),
          db.broadcasts.clear(),
          db.announcements.clear(),
          db.notifications.clear(),
          db.responsibilities.clear(),
        ]);
        await Promise.all([
          db.users.bulkPut(snapshot.users ?? []),
          db.activities.bulkPut(collections.activities ?? []),
          db.dailyLogs.bulkPut(collections.dailyLogs ?? []),
          db.comments.bulkPut(collections.comments ?? []),
          db.dms.bulkPut(collections.dms ?? []),
          db.calls.bulkPut(collections.calls ?? []),
          db.community.bulkPut(collections.community ?? []),
          db.broadcasts.bulkPut(collections.broadcasts ?? []),
          db.announcements.bulkPut(collections.announcements ?? []),
          db.notifications.bulkPut(collections.notifications ?? []),
          db.responsibilities.bulkPut(snapshot.responsibilities ?? []),
        ]);
        const metaRows: MetaRow[] = [
          { key: META_LAST_BOOTSTRAP_AT, value: new Date().toISOString() },
        ];
        if (snapshot.serverTime) {
          metaRows.push({ key: META_SERVER_TIME, value: snapshot.serverTime });
        }
        await db.meta.bulkPut(metaRows);
      },
    );
  } catch (err) {
    warn("persistBootstrap", err);
  }
}

/**
 * Load the cached bootstrap snapshot, or null when no cache exists
 * (or when running outside the browser). Never throws.
 */
export async function loadCachedBootstrap(): Promise<OfflineBootstrapSnapshot | null> {
  const db = getOfflineDb();
  if (!db) return null;
  try {
    const [
      users,
      activities,
      dailyLogs,
      comments,
      dms,
      calls,
      community,
      broadcasts,
      announcements,
      notifications,
      responsibilities,
      serverTimeRow,
    ] = await Promise.all([
      db.users.toArray(),
      db.activities.toArray(),
      db.dailyLogs.toArray(),
      db.comments.toArray(),
      db.dms.toArray(),
      db.calls.toArray(),
      db.community.toArray(),
      db.broadcasts.toArray(),
      db.announcements.toArray(),
      db.notifications.toArray(),
      db.responsibilities.toArray(),
      db.meta.get(META_SERVER_TIME),
    ]);
    // Empty cache (fresh install / cleared storage) — not a usable snapshot.
    if (users.length === 0) return null;
    const serverTime =
      typeof serverTimeRow?.value === "string"
        ? (serverTimeRow.value as string)
        : undefined;
    return {
      users,
      db: {
        activities,
        dailyLogs,
        comments,
        dms,
        calls,
        community,
        broadcasts,
        announcements,
        notifications,
      },
      responsibilities,
      ...(serverTime ? { serverTime } : {}),
    };
  } catch (err) {
    warn("loadCachedBootstrap", err);
    return null;
  }
}

/**
 * Cache the authenticated session identity for offline UI boot.
 * Only display-safe identity fields are needed offline; the httpOnly
 * session cookie remains the sole server auth mechanism when online.
 */
export async function persistSessionIdentity(
  session: SessionUser,
): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  try {
    await db.meta.put({ key: META_SESSION_USER, value: session });
  } catch (err) {
    warn("persistSessionIdentity", err);
  }
}

/** Load the cached session identity, or null when absent. Never throws. */
export async function loadCachedSessionIdentity(): Promise<SessionUser | null> {
  const db = getOfflineDb();
  if (!db) return null;
  try {
    const row = await db.meta.get(META_SESSION_USER);
    const value = row?.value as SessionUser | undefined;
    if (!value || typeof value !== "object" || !value.id) return null;
    return value;
  } catch (err) {
    warn("loadCachedSessionIdentity", err);
    return null;
  }
}

/**
 * Last successful bootstrap persist time (ISO string), if any.
 */
export async function getLastBootstrapAt(): Promise<string | null> {
  const db = getOfflineDb();
  if (!db) return null;
  try {
    const row = await db.meta.get(META_LAST_BOOTSTRAP_AT);
    return typeof row?.value === "string" ? (row.value as string) : null;
  } catch (err) {
    warn("getLastBootstrapAt", err);
    return null;
  }
}

/**
 * Random per-login cache namespace for the service worker's RSC flight
 * cache (`trak-rsc-<sw-version>-<key>`). The key is not an auth secret —
 * it is the boundary that stops one session reading another session's
 * cached flight payload on a shared device.
 */
export interface RscCacheSessionRecord {
  key: string;
  userId: string;
}

/** Load the persisted RSC cache namespace, or null when absent. Never throws. */
export async function readRscCacheSession(): Promise<RscCacheSessionRecord | null> {
  const db = getOfflineDb();
  if (!db) return null;
  try {
    const row = await db.meta.get(META_RSC_SESSION);
    const value = row?.value as RscCacheSessionRecord | undefined;
    if (!value || typeof value.key !== "string" || typeof value.userId !== "string") {
      return null;
    }
    return value;
  } catch (err) {
    warn("readRscCacheSession", err);
    return null;
  }
}

/** Persist the RSC cache namespace key + the userId that created it. */
export async function writeRscCacheSession(record: RscCacheSessionRecord): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  try {
    await db.meta.put({ key: META_RSC_SESSION, value: record });
  } catch (err) {
    warn("writeRscCacheSession", err);
  }
}

/** Forget the persisted RSC cache namespace (e.g. full logout). */
export async function deleteRscCacheSession(): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  try {
    await db.meta.delete(META_RSC_SESSION);
  } catch (err) {
    warn("deleteRscCacheSession", err);
  }
}

/** Remove all cached collections + session/meta (e.g. on logout). */
export async function clearOfflineCache(): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  try {
    await db.transaction(
      "rw",
      [
        db.users,
        db.activities,
        db.dailyLogs,
        db.comments,
        db.dms,
        db.calls,
        db.community,
        db.broadcasts,
        db.announcements,
        db.notifications,
        db.responsibilities,
        db.meta,
      ],
      async () => {
        await Promise.all([
          db.users.clear(),
          db.activities.clear(),
          db.dailyLogs.clear(),
          db.comments.clear(),
          db.dms.clear(),
          db.calls.clear(),
          db.community.clear(),
          db.broadcasts.clear(),
          db.announcements.clear(),
          db.notifications.clear(),
          db.responsibilities.clear(),
          db.meta.clear(),
        ]);
      },
    );
  } catch (err) {
    warn("clearOfflineCache", err);
  }
}

// ---------------------------------------------------------------------------
// Outbox (Phase 2 — offline mutation queue drained by the sync engine)
// ---------------------------------------------------------------------------

/** Queue a mutation for later replay by the sync engine. Returns the row id. */
export async function enqueueOutbox(
  input: OutboxInput,
): Promise<number | null> {
  const db = getOfflineDb();
  if (!db) return null;
  try {
    const entry: OutboxEntry = {
      method: input.method,
      path: input.path,
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.idempotencyKey !== undefined
        ? { idempotencyKey: input.idempotencyKey }
        : {}),
      ...(input.tempId !== undefined ? { tempId: input.tempId } : {}),
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: "pending",
    };
    return await db.outbox.add(entry);
  } catch (err) {
    warn("enqueueOutbox", err);
    return null;
  }
}

/** List queued mutations oldest-first (for the future sync engine). */
export async function listOutbox(): Promise<OutboxEntry[]> {
  const db = getOfflineDb();
  if (!db) return [];
  try {
    return await db.outbox.orderBy("id").toArray();
  } catch (err) {
    warn("listOutbox", err);
    return [];
  }
}

/** Number of queued (pending/failed) mutations. */
export async function countPendingOutbox(): Promise<number> {
  const db = getOfflineDb();
  if (!db) return 0;
  try {
    return await db.outbox.where("status").anyOf(["pending", "failed"]).count();
  } catch (err) {
    warn("countPendingOutbox", err);
    return 0;
  }
}

/** Remove a single queued mutation (after successful replay). */
export async function removeOutboxEntry(id: number): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  try {
    await db.outbox.delete(id);
  } catch (err) {
    warn("removeOutboxEntry", err);
  }
}

/** Patch a queued mutation's replay state (status / retry count / error). */
export async function updateOutboxEntry(
  id: number,
  patch: Partial<Pick<OutboxEntry, "status" | "retryCount" | "lastError">>,
): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  try {
    await db.outbox.update(id, patch);
  } catch (err) {
    warn("updateOutboxEntry", err);
  }
}

/** Number of permanently-failed queued mutations (need attention/retry). */
export async function countFailedOutbox(): Promise<number> {
  const db = getOfflineDb();
  if (!db) return 0;
  try {
    return await db.outbox.where("status").equals("failed").count();
  } catch (err) {
    warn("countFailedOutbox", err);
    return 0;
  }
}

/**
 * Reset permanently-failed entries back to pending so the next sync
 * replays them (explicit user retry). Returns the number reset.
 */
export async function resetFailedOutbox(): Promise<number> {
  const db = getOfflineDb();
  if (!db) return 0;
  try {
    return await db.outbox.where("status").equals("failed").modify({
      status: "pending",
      lastError: undefined,
    });
  } catch (err) {
    warn("resetFailedOutbox", err);
    return 0;
  }
}

/**
 * Remove pending create-mutations for a client temp id. Used when the user
 * deletes an optimistically-created object before it ever synced — there
 * is nothing on the server to delete, so the queued create is dropped
 * instead of replayed. Returns the number removed.
 */
export async function removeOutboxByTempId(tempId: string): Promise<number> {
  const db = getOfflineDb();
  if (!db) return 0;
  try {
    const matches = await db.outbox
      .where("status")
      .anyOf(["pending", "sending", "failed"])
      .toArray();
    const ids = matches
      .filter((e) => e.tempId === tempId && typeof e.id === "number")
      .map((e) => e.id as number);
    if (ids.length === 0) return 0;
    await db.outbox.bulkDelete(ids);
    return ids.length;
  } catch (err) {
    warn("removeOutboxByTempId", err);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Temp-id mappings (client `temp_…` id → authoritative server id)
// ---------------------------------------------------------------------------

/**
 * Record that a replayed create-mutation's temp id now maps to a server
 * id, so later queued entries referencing the temp object can be
 * rewritten before replay. Persisted (not just in-memory) so mappings
 * survive a drain that stops midway on a transient failure.
 */
export async function saveTempIdMapping(
  tempId: string,
  realId: string,
): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  try {
    await db.meta.put({ key: `${META_TEMP_MAP_PREFIX}${tempId}`, value: realId });
  } catch (err) {
    warn("saveTempIdMapping", err);
  }
}

/** Load all known temp-id → server-id mappings. Never throws. */
export async function loadTempIdMappings(): Promise<Record<string, string>> {
  const db = getOfflineDb();
  if (!db) return {};
  try {
    const rows = await db.meta
      .where("key")
      .startsWith(META_TEMP_MAP_PREFIX)
      .toArray();
    const out: Record<string, string> = {};
    for (const row of rows) {
      if (typeof row.value === "string") {
        out[row.key.slice(META_TEMP_MAP_PREFIX.length)] = row.value;
      }
    }
    return out;
  } catch (err) {
    warn("loadTempIdMappings", err);
    return {};
  }
}

/**
 * Drop mappings no queued entry still references (path or body),
 * keeping the meta table from growing with every offline create.
 */
export async function pruneTempIdMappings(): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  try {
    const [rows, entries] = await Promise.all([
      db.meta.where("key").startsWith(META_TEMP_MAP_PREFIX).toArray(),
      db.outbox.toArray(),
    ]);
    const haystacks = entries.map((e) => {
      try {
        return `${e.path} ${JSON.stringify(e.body ?? null)}`;
      } catch {
        return e.path;
      }
    });
    const stale = rows
      .filter((row) => {
        const tempId = row.key.slice(META_TEMP_MAP_PREFIX.length);
        return !haystacks.some((h) => h.includes(tempId));
      })
      .map((row) => row.key);
    if (stale.length > 0) await db.meta.bulkDelete(stale);
  } catch (err) {
    warn("pruneTempIdMappings", err);
  }
}
