/**
 * Offline mutation queue + sync engine (Phase 2).
 *
 * - `sendQueued()` is the offline-aware counterpart to `apiSend()`:
 *   when the browser reports offline, or when a request fails with a
 *   network/timeout error, the mutation is persisted to the IndexedDB
 *   outbox and a `QueuedForSyncError` is thrown so callers can keep
 *   their optimistic UI instead of reverting it.
 * - `syncOutbox()` replays queued mutations oldest-first when
 *   connectivity returns, then asks the caller to reconcile (refresh).
 *
 * Retry / dedupe semantics:
 * - Each entry carries a stable idempotency key (generated once at
 *   enqueue time) re-sent on every retry via `X-Idempotency-Key`.
 * - Transient failures (offline, timeout, 429, 5xx) stop the drain and
 *   leave the entry pending for the next run — nothing is lost.
 * - Permanent failures (other 4xx, e.g. validation) mark the entry
 *   `failed` (with the server message) and continue with the next
 *   entry, so one bad mutation never blocks the rest of the queue.
 * - 401 stops the drain without consuming the queue — the session is
 *   invalid and the user must re-authenticate first.
 *
 * Auth: replay uses plain `fetch` with `credentials: "same-origin"`, so
 * the httpOnly session cookie is attached by the browser. The raw
 * token is never read, stored, or logged anywhere in this module.
 */

import {
  ApiError,
  apiSend,
  isNetworkError,
  type FetchOpts,
} from "@/lib/api/client";
import {
  enqueueOutbox,
  isOfflineDbAvailable,
  listOutbox,
  loadTempIdMappings,
  pruneTempIdMappings,
  removeOutboxEntry,
  saveTempIdMapping,
  updateOutboxEntry,
  type OutboxEntry,
} from "@/lib/offline/db";

export const IDEMPOTENCY_HEADER = "X-Idempotency-Key";

/** Thrown by `sendQueued()` when a mutation was queued instead of sent. */
export class QueuedForSyncError extends Error {
  /** IndexedDB row id, or null when the queue itself was unavailable. */
  readonly outboxId: number | null;

  constructor(outboxId: number | null) {
    super("Offline — change queued and will sync when back online.");
    this.name = "QueuedForSyncError";
    this.outboxId = outboxId;
  }
}

export function isQueuedForSync(err: unknown): err is QueuedForSyncError {
  return err instanceof QueuedForSyncError;
}

/** True when the browser explicitly reports no network connection. */
export function isOfflineNow(): boolean {
  try {
    if (typeof navigator === "undefined") return false;
    const onLine = (navigator as { onLine?: unknown }).onLine;
    return onLine === false;
  } catch {
    return false;
  }
}

function newIdempotencyKey(): string {
  try {
    const c = crypto as unknown as { randomUUID?: () => string };
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    /* fall through */
  }
  return `key_${Date.now()}_${Math.floor(Math.random() * 1_000_000_000)}`;
}

export type QueuedMethod = "POST" | "PATCH" | "PUT" | "DELETE";

export interface SendQueuedOpts extends FetchOpts {
  /** Client temp id of an optimistically-created object (for coalescing). */
  tempId?: string;
  /** Reuse an existing idempotency key instead of generating one. */
  idempotencyKey?: string;
}

/**
 * Send a mutation, queueing it when offline or when the request fails
 * with a network/timeout error. Resolves with the server response when
 * sent; throws `QueuedForSyncError` when queued; rethrows any other
 * (validation / server / auth) error unchanged.
 *
 * When IndexedDB itself is unavailable there is nowhere to queue, so the
 * original network error is rethrown and callers keep their existing
 * error behaviour.
 */
export async function sendQueued<T>(
  path: string,
  method: QueuedMethod,
  body?: unknown,
  opts?: SendQueuedOpts,
): Promise<T> {
  const idempotencyKey = opts?.idempotencyKey ?? newIdempotencyKey();
  const { tempId: _tempId, idempotencyKey: _key, ...fetchOpts }: SendQueuedOpts =
    opts ?? {};
  const headers = {
    ...(fetchOpts.headers ?? {}),
    [IDEMPOTENCY_HEADER]: idempotencyKey,
  };

  if (isOfflineNow()) {
    const id = await enqueueOutbox({
      method,
      path,
      ...(body !== undefined ? { body } : {}),
      idempotencyKey,
      ...(_tempId !== undefined ? { tempId: _tempId } : {}),
    });
    if (id == null) {
      throw new ApiError(
        408,
        "You appear to be offline. Check your connection and try again.",
      );
    }
    throw new QueuedForSyncError(id);
  }

  try {
    return await apiSend<T>(path, method, body, { ...fetchOpts, headers });
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    const id = await enqueueOutbox({
      method,
      path,
      ...(body !== undefined ? { body } : {}),
      idempotencyKey,
      ...(_tempId !== undefined ? { tempId: _tempId } : {}),
    });
    if (id == null) throw err;
    throw new QueuedForSyncError(id);
  }
}

// ---------------------------------------------------------------------------
// Sync engine
// ---------------------------------------------------------------------------

export interface SyncResult {
  attempted: number;
  succeeded: number;
  /** Entries that failed permanently (still in the outbox as `failed`). */
  failed: OutboxEntry[];
  /** Stopped early on a transient failure; remaining entries stay queued. */
  stoppedOnTransient: boolean;
  /** Stopped early on 401 — session invalid, re-authentication required. */
  stoppedOnAuth: boolean;
}

export interface SyncCallbacks {
  /** Reconcile local state with the server (e.g. TrakStore.refresh). */
  onReconcile?: () => Promise<void>;
  /** Permanent failures that need user attention (never silent). */
  onFailures?: (failed: OutboxEntry[]) => void;
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/**
 * Pull the authoritative server id out of a create-mutation response so
 * later queued entries that reference the client temp id can be
 * rewritten before replay (e.g. a daily log queued for an activity
 * that was itself created offline). Returns null when the response
 * carries no usable id (e.g. community send returns a list only).
 */
export function extractCreatedId(
  entry: Pick<OutboxEntry, "tempId" | "method">,
  response: unknown,
): string | null {
  if (!entry.tempId || entry.method !== "POST") return null;
  if (!response || typeof response !== "object") return null;
  const res = response as Record<string, unknown>;
  if (typeof res.id === "string" && res.id.length > 0) return res.id;
  for (const key of [
    "activity",
    "responsibility",
    "comment",
    "announcement",
    "broadcast",
    "log",
  ]) {
    const obj = res[key];
    if (
      obj &&
      typeof obj === "object" &&
      typeof (obj as Record<string, unknown>).id === "string"
    ) {
      return (obj as Record<string, unknown>).id as string;
    }
  }
  return null;
}

/**
 * Rewrite known temp ids to server ids in a queued entry's path and
 * body. Temp ids are unique random strings, so plain substitution is
 * safe. Returns the (possibly unchanged) path and body.
 */
export function applyTempIdMappings(
  entry: Pick<OutboxEntry, "path" | "body">,
  mappings: Record<string, string>,
): { path: string; body: unknown } {
  const ids = Object.keys(mappings);
  if (ids.length === 0) return { path: entry.path, body: entry.body };
  let path = entry.path;
  for (const tempId of ids) {
    if (path.includes(tempId)) path = path.split(tempId).join(mappings[tempId]);
  }
  let body = entry.body;
  if (body !== undefined) {
    try {
      let json = JSON.stringify(body);
      for (const tempId of ids) {
        if (json.includes(tempId)) json = json.split(tempId).join(mappings[tempId]);
      }
      body = JSON.parse(json);
    } catch {
      /* keep the original body on (unreachable) serialization failure */
    }
  }
  return { path, body };
}

/** Guard against overlapping drains (online event + manual retry). */
let syncInFlight: Promise<SyncResult> | null = null;

/**
 * Replay pending outbox entries oldest-first. Concurrent callers share
 * the in-flight run. Never throws — failures are reported in the result
 * and via `onFailures`.
 */
export function syncOutbox(callbacks?: SyncCallbacks): Promise<SyncResult> {
  if (syncInFlight) return syncInFlight;
  const run = (async (): Promise<SyncResult> => {
    const result: SyncResult = {
      attempted: 0,
      succeeded: 0,
      failed: [],
      stoppedOnTransient: false,
      stoppedOnAuth: false,
    };
    if (!isOfflineDbAvailable()) return result;

    let entries: OutboxEntry[];
    let tempMappings: Record<string, string>;
    try {
      const [listed, mappings] = await Promise.all([
        listOutbox(),
        loadTempIdMappings(),
      ]);
      entries = listed.filter((e) => e.status === "pending");
      tempMappings = mappings;
    } catch {
      return result;
    }
    if (entries.length === 0) return result;

    for (const entry of entries) {
      if (typeof entry.id !== "number") continue;
      const id = entry.id;
      result.attempted += 1;
      try {
        await updateOutboxEntry(id, { status: "sending" });
      } catch {
        /* best-effort state tracking */
      }

      // Rewrite temp ids (from earlier-synced creates) to server ids.
      const { path, body } = applyTempIdMappings(entry, tempMappings);

      try {
        const response = await apiSend(path, entry.method, body, {
          timeoutMs: 25_000,
          headers: entry.idempotencyKey
            ? { [IDEMPOTENCY_HEADER]: entry.idempotencyKey }
            : undefined,
        });
        // Remember temp → real id so dependent entries replay correctly,
        // including across drains interrupted by transient failures.
        const createdId = extractCreatedId(entry, response);
        if (entry.tempId && createdId) {
          tempMappings[entry.tempId] = createdId;
          await saveTempIdMapping(entry.tempId, createdId);
        }
        await removeOutboxEntry(id);
        result.succeeded += 1;
      } catch (err) {
        const retryCount = (entry.retryCount ?? 0) + 1;
        if (err instanceof ApiError && err.status === 401) {
          // Session invalid — keep the queue intact for after re-login.
          await updateOutboxEntry(id, { status: "pending", retryCount });
          result.stoppedOnAuth = true;
          break;
        }
        if (isNetworkError(err) || (err instanceof ApiError && isTransientStatus(err.status))) {
          // Transient — stop the drain; this and later entries retry next run.
          await updateOutboxEntry(id, { status: "pending", retryCount });
          result.stoppedOnTransient = true;
          break;
        }
        // Permanent (validation, not-found, forbidden, …) — park it as
        // failed with the server message and continue with the rest.
        const message =
          err instanceof Error ? err.message : "Request failed";
        await updateOutboxEntry(id, {
          status: "failed",
          retryCount,
          lastError: message,
        });
        result.failed.push({ ...entry, status: "failed", lastError: message });
      }
    }

    if (result.succeeded > 0) {
      try {
        await callbacks?.onReconcile?.();
      } catch {
        /* reconcile is best-effort; cache stays until next refresh */
      }
    }
    if (result.failed.length > 0) {
      try {
        callbacks?.onFailures?.(result.failed);
      } catch {
        /* reporting must never break sync */
      }
    }
    try {
      await pruneTempIdMappings();
    } catch {
      /* housekeeping is best-effort */
    }
    return result;
  })();

  syncInFlight = run;
  return run.finally(() => {
    if (syncInFlight === run) syncInFlight = null;
  });
}

/**
 * Run `fn` on every browser `online` event. Returns an unsubscribe
 * function. No-op (with a no-op unsubscribe) outside the browser.
 */
export function startAutoSync(fn: () => void): () => void {
  try {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
      return () => {};
    }
    const handler = () => {
      fn();
    };
    window.addEventListener("online", handler);
    return () => {
      try {
        window.removeEventListener("online", handler);
      } catch {
        /* ignore */
      }
    };
  } catch {
    return () => {};
  }
}
