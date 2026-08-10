/**
 * Error monitoring — zero-dependency Sentry envelope ingestion (Phase 4).
 * When SENTRY_DSN is set, exceptions logged via log.error() are forwarded to
 * the configured Sentry project as an envelope POST. When unset, all calls
 * are cheap no-ops, so this module is safe everywhere.
 *
 * Format: https://<publicKey>@<host>/<projectId>
 */
import "server-only";
import { hostname } from "node:os";
import { randomUUID } from "node:crypto";

interface ParsedDsn {
  key: string;
  host: string;
  projectId: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  const m = dsn.match(/^https?:\/\/([^@]+)@([^/]+)\/(\d+)$/);
  if (!m) return null;
  return { key: m[1], host: m[2], projectId: m[3] };
}

function hex32(): string {
  return randomUUID().replace(/-/g, "");
}

function framesFromStack(stack?: string): unknown[] {
  if (!stack) return [];
  const frames: unknown[] = [];
  for (const raw of stack.split("\n").slice(1)) {
    const m = raw.match(/at (.+?) \[as (.+?)\] \((.+?):(\d+):(\d+)\)/);
    const m2 = raw.match(/at (.+?) \((.+?):(\d+):(\d+)\)/);
    const m3 = raw.match(/at (.+?):(\d+):(\d+)/);
    const hit = m || m2 || m3;
    if (!hit) continue;
    frames.push({
      function: hit[2] ? hit[1] : hit[1],
      filename: hit[3] || hit[2],
      lineno: hit[4] || hit[3],
      colno: hit[5] || hit[4],
    });
  }
  return frames;
}

function buildEvent(
  err: unknown,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const raw = err as
    | (Error & { status?: number; code?: string })
    | { message?: string }
    | undefined;
  const message = typeof raw?.message === "string" ? raw.message : String(err);
  const name =
    typeof (raw as Error | undefined)?.name === "string"
      ? (raw as Error).name
      : "Error";
  const stack = (raw as Error | undefined)?.stack;
  const eventId = hex32();

  const event: Record<string, unknown> = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: "node",
    level: "error",
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.APP_VERSION,
    server_name: hostname(),
    message: { formatted: message },
    exception: {
      values: [
        {
          type: name,
          value: message,
          stacktrace: { frames: framesFromStack(stack) },
        },
      ],
    },
  };
  const meta: Record<string, unknown> = { ...extra };
  const errWithCodes = raw as
    | (Error & { status?: number; code?: string })
    | undefined;
  if (errWithCodes?.status !== undefined)
    meta.status = errWithCodes.status;
  if (errWithCodes?.code !== undefined) meta.code = errWithCodes.code;
  if (Object.keys(meta).length > 0) event.extra = meta;
  return event;
}

async function postEnvelope(dsn: ParsedDsn, event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  const head = {
    event_id: event.event_id,
    sent_at: new Date().toISOString(),
    dsn: `${dsn.key}@${dsn.host}/${dsn.projectId}`,
  };
  const itemHeader = JSON.stringify({
    type: "event",
    content_type: "application/json",
    length: Buffer.byteLength(payload),
  });
  const body = `${JSON.stringify(head)}\n${itemHeader}\n${payload}`;

  await fetch(`https://${dsn.host}/api/${dsn.projectId}/envelope/`, {
    method: "POST",
    headers: {
      "content-type": "application/x-sentry-envelope",
      "x-sentry-auth": JSON.stringify({
        sentry_version: "7",
        sentry_client: "trak-nextjs/0.1.0",
        sentry_key: dsn.key,
      }),
    },
    body,
    signal: AbortSignal.timeout(4000),
  });
}

/** Forward an error to the configured Sentry project (fire-and-forget). */
export async function captureError(
  err: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  const dsnRaw = process.env.SENTRY_DSN;
  if (!dsnRaw) return;
  const dsn = parseDsn(dsnRaw);
  if (!dsn) return;
  try {
    const event = buildEvent(err, extra);
    await postEnvelope(dsn, event);
  } catch {
    // Monitoring must never break the request path.
  }
}

/** Send a plain message (e.g. warn-level) to Sentry, if configured. */
export async function captureMessage(
  message: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  const dsnRaw = process.env.SENTRY_DSN;
  if (!dsnRaw) return;
  const dsn = parseDsn(dsnRaw);
  if (!dsn) return;
  try {
    const event = buildEvent(new Error(message), extra);
    event.level = "warning";
    await postEnvelope(dsn, event);
  } catch {
    // no-op
  }
}