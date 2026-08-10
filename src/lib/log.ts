/**
 * Structured JSON logging (Phase 4 — AUDIT_08 §Structured logging).
 * Emits single-line JSON records so hosts can ship to any log pipeline.
 * Request correlation is driven by the `x-request-id` header set in
 * middleware; route handlers can also wrap work in withRequestContext().
 */
import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { captureError } from "@/lib/errorTracking";

export interface RequestContext {
  requestId: string;
  method?: string;
  path?: string;
  userId?: string;
}

const als = new AsyncLocalStorage<RequestContext>();

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel: LogLevel = (() => {
  const raw = (process.env.LOG_LEVEL || "info").toLowerCase();
  return raw in LEVEL_ORDER ? (raw as LogLevel) : "info";
})();

function write(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
  err?: unknown,
) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[configuredLevel]) return;
  const ctx = als.getStore();
  const base: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    event,
  };
  if (ctx?.requestId) base.requestId = ctx.requestId;
  if (ctx?.method) base.method = ctx.method;
  if (ctx?.path) base.path = ctx.path;
  if (ctx?.userId) base.userId = ctx.userId;
  if (err) {
    const e = err as
      | (Error & { status?: number; code?: string })
      | undefined;
    base.error = {
      name: e?.name || "Error",
      message: e?.message || String(err),
      status: e?.status,
      code: e?.code,
      stack: e?.stack,
    };
  }
  const line = JSON.stringify({ ...base, ...fields });
   
  if (level === "error") console.error(line);
   
  else if (level === "warn") console.warn(line);
   
  else console.log(line);

  // Forward genuine errors to error monitoring (no-op without SENTRY_DSN).
  if (level === "error" && err) {
    void captureError(err, { ...base, ...fields });
  }
}

export const log = {
  debug(event: string, fields?: Record<string, unknown>) {
    write("debug", event, fields);
  },
  info(event: string, fields?: Record<string, unknown>) {
    write("info", event, fields);
  },
  warn(event: string, fields?: Record<string, unknown>) {
    write("warn", event, fields);
  },
  error(event: string, err?: unknown, fields?: Record<string, unknown>) {
    write("error", event, fields, err);
  },
};

/**
 * Run fn inside a request context so log entries are correlated.
 * Prefer passing the request ID from the x-request-id header.
 */
export async function withRequestContext<T>(
  ctx: RequestContext,
  fn: () => Promise<T> | T,
): Promise<T> {
  return als.run(ctx, async () => fn());
}

/** Build a RequestContext from an x-request-id header value (may be null). */
export function contextFromRequestId(requestId: string | null | undefined) {
  return { requestId: requestId || "unknown" };
}