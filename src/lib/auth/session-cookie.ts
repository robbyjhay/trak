/**
 * Shared session cookie name — used by Next session helpers and WebSocket auth.
 * Keep free of server-only / Prisma so `server.ts` can import via ws-session.
 */
export const SESSION_COOKIE_NAME = "trak_session";
