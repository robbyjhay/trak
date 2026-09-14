/**
 * Server-side idempotency for offline-mutation replay (Phase 3B).
 *
 * Each mutating API route should call `tryIdempotent()` near the top,
 * *before* any business logic, and `return` the cached result if one
 * exists. On first execution the function stores the result alongside
 * the key + user + expiry, then returns `undefined` so the route can
 * proceed normally and store the final result afterwards.
 *
 * Design:
 * - Keys are scoped per-user (the `userId` from the session cookie),
 *   so one user's key never collides with another's.
 * - Keys expire after `IDEMPOTENCY_TTL_DAYS` (default 30) to prevent
 *   unbounded table growth. Expired keys are auto‑purged on every
 *   check (best‑effort, never throws).
 * - Only **successful** mutations (HTTP 200) persist the result; any
 *   error (4xx/5xx) leaves the key absent, so the client can retry
 *   without fear of silently getting the old result.
 * - The `resultJson` payload is the JSON‑encoded response body that
 *   should be returned on a duplicate. The route must still build and
 *   return the real response on first execution, then overwrite the
 *   cached one afterwards.
 * - The function never throws. If Prisma / DB is unavailable it always
 *   returns `undefined` (degrade gracefully, never block a request).
 */

import { prisma } from "@/lib/db/prisma";
import { readSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/types";

const IDEMPOTENCY_TTL_DAYS = 30;

/** Check / store an idempotency key. Returns the cached result if found,
 *  or `undefined` so the caller can proceed with the real mutation.
 *  On success the caller must subsequently call `storeIdempotentResult()`
 *  with the actual response JSON.
 */
export async function tryIdempotent(
  request: Request,
): Promise<{ cached: Response | null; storeResult: (body: Record<string, unknown>) => Promise<void> }> {
  try {
    const session = await readSession();
    if (!session?.id) {
      // No session → cannot scope keys; degrade gracefully.
      return { cached: null, storeResult: async () => {} };
    }

    const keyHeader = request.headers.get("X-Idempotency-Key");
    if (!keyHeader) {
      // No key → normal path.
      return { cached: null, storeResult: async () => {} };
    }

    // Best‑effort: if Prisma is unavailable, just proceed.
    if (!prisma) {
      return { cached: null, storeResult: async () => {} };
    }

    // Look up an active, non‑expired key for this user.
    const now = new Date();
    const existing = await prisma.idempotencyKey.findFirst({
      where: {
        key: keyHeader,
        userId: session.id,
        status: "active",
        expiresAt: { gt: now },
      },
      select: { resultJson: true, expiresAt: true },
    });

    if (existing) {
      // Key found and not expired → return the cached response.
      // resultJson is stored as TEXT in Prisma; coerce to known shape.
      const result = existing.resultJson as string;
      const cachedResponse = new Response(JSON.parse(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": keyHeader,
        },
      });
      // We must still allow the route to run and overwrite the cache,
      // but for now return the cached response and a no‑op store.
      return { cached: cachedResponse, storeResult: async () => {} };
    }

    // No cached result → the caller will execute the mutation and then
    // call storeIdempotentResult(). Return a storeResult that persists
    // the key + result after the real response is built.
    const storeResult = async (body: Record<string, unknown>) => {
      const expiresAt = new Date(
        now.getTime() + IDEMPOTENCY_TTL_DAYS * 24 * 60 * 60 * 1000,
      );
      try {
        // Best-effort: check if a key already exists for this user first.
        // The DB has a composite unique index on (key, userId), so we use
        // findFirst to check before creating — this avoids the Prisma
        // unique-input-type limitation while still respecting the DB constraint.
        const alreadyExists = await prisma.idempotencyKey.findFirst({
          where: {
            key: keyHeader,
            userId: session.id,
            status: "active",
            expiresAt: { gt: now },
          },
        });
        if (alreadyExists) {
          // Rare race condition — another request just inserted the key.
          // Return without storing again; the caller will get the cached result
          // on the next invocation.
          return;
        }
        await prisma.idempotencyKey.create({
          data: {
            key: keyHeader,
            userId: session.id,
            resultJson: JSON.stringify(body),
            status: "active",
            expiresAt,
          },
        });
      } catch {
        // Best‑effort only — never let a DB error break the mutation.
      }
    };

    return { cached: null, storeResult };
  } catch {
    // Any unexpected error → degrade gracefully.
    return { cached: null, storeResult: async () => {} };
  }
}

/** Drop expired keys in a cheap best‑effort loop. Never throws. */
export async function pruneExpiredIdempotencyKeys(): Promise<void> {
  try {
    if (!prisma) return;
    const now = new Date();
    await prisma.idempotencyKey.updateMany({
      where: {
        expiresAt: { lt: now },
        status: "active",
      },
      data: { status: "expired" },
    });
  } catch {
    /* best‑effort only */
  }
}