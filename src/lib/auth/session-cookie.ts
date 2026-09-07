/**
 * Shared session cookie name — used by Next session helpers and WebSocket auth.
 * Keep free of server-only / Prisma so `server.ts` can import via ws-session.
 */
export const SESSION_COOKIE_NAME = "trak_session";

export const SESSION_COOKIE_SAMESITE = "lax" as const;
export const SESSION_COOKIE_PATH = "/" as const;

/** Seconds in one day — single place for TTL math (Next.js `maxAge` is seconds). */
export const SECONDS_PER_DAY = 24 * 60 * 60;

/**
 * Authoritative TTL math shared by DB + cookie layers.
 * Both `createSession()` (DB `expiresAt`, ms) and `setSessionCookie()`
 * (cookie `maxAge` in seconds + `expires` Date) must derive from the same
 * `SESSION_TTL_DAYS` value via these helpers — no second lifetime config.
 */
export function sessionMaxAgeSeconds(ttlDays: number): number {
  return ttlDays * SECONDS_PER_DAY;
}

export function sessionExpiryDate(
  ttlDays: number,
  nowMs: number = Date.now(),
): Date {
  return new Date(nowMs + ttlDays * SECONDS_PER_DAY * 1000);
}
