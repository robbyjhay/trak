/**
 * Rate limiter — Redis when REDIS_URL is set, in-memory fallback for local dev.
 * Production should always configure REDIS_URL (AUDIT_03 / AUDIT_08).
 */
import "server-only";

type Bucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();
let warnedMemory = false;
let redisClient: import("ioredis").default | null | undefined;
let redisInitFailed = false;

function warnMemoryOnce() {
  if (warnedMemory) return;
  warnedMemory = true;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[trak] Using in-memory rate limiter — configure REDIS_URL for multi-instance production.",
    );
  }
}

async function getRedis(): Promise<import("ioredis").default | null> {
  if (redisInitFailed) return null;
  if (redisClient !== undefined) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) {
    redisClient = null;
    return null;
  }

  try {
    const Redis = (await import("ioredis")).default;
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    client.on("error", () => {
      /* avoid unhandled error spam; we fall back per call */
    });
    await client.connect().catch(() => undefined);
    redisClient = client;
    return client;
  } catch {
    redisInitFailed = true;
    redisClient = null;
    return null;
  }
}

function memoryCheck(
  key: string,
  max: number,
  windowSec: number,
): { allowed: boolean; retryAfterSec: number } {
  warnMemoryOnce();
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const existing = memoryBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= max) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000),
    );
    return { allowed: false, retryAfterSec };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * Sliding-window style counter using Redis INCR + EXPIRE, or in-memory fallback.
 * Async so callers can await Redis without blocking on every import.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSec: number,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const prefix = process.env.RATE_LIMIT_REDIS_PREFIX || "trak:rl:";
  const redisKey = `${prefix}${key}`;

  try {
    const redis = await getRedis();
    if (redis && redis.status === "ready") {
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, windowSec);
      }
      if (count > max) {
        const ttl = await redis.ttl(redisKey);
        return {
          allowed: false,
          retryAfterSec: ttl > 0 ? ttl : windowSec,
        };
      }
      return { allowed: true, retryAfterSec: 0 };
    }
  } catch {
    /* fall through to memory */
  }

  return memoryCheck(key, max, windowSec);
}

/** Sync wrapper for call sites that cannot await (prefer async checkRateLimit). */
export function checkRateLimitSync(
  key: string,
  max: number,
  windowSec: number,
): { allowed: boolean; retryAfterSec: number } {
  return memoryCheck(key, max, windowSec);
}

/** Periodic cleanup to avoid unbounded map growth (memory backend only). */
export function pruneRateLimits() {
  const now = Date.now();
  for (const [k, v] of memoryBuckets) {
    if (v.resetAt <= now) memoryBuckets.delete(k);
  }
}
