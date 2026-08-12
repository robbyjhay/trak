/**
 * Session cookie helpers + opaque-session validation (Phase 0+).
 * Cookie stores raw token; DB stores SHA-256 hash only.
 *
 * Edge middleware only checks cookie presence; full DB validation happens here
 * in server layouts, route handlers, and server actions.
 */
import "server-only";
import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/types";
import {
  validateSession,
  revokeSessionByToken,
  toSessionUser,
} from "@/lib/services/auth.service";
import { getEnv } from "@/lib/env";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";

/** Must match SESSION_COOKIE_NAME (used by WebSocket auth in server.ts). */
export const COOKIE_NAME = SESSION_COOKIE_NAME;

export async function readSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const result = await validateSession(token);
    if (!result) return null;
    return result.user;
  } catch (err) {
    console.error("[session] validate failed", err);
    return null;
  }
}

/** Raw cookie token (for logout revoke). */
export async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

export async function setSessionCookie(rawToken: string) {
  const env = getEnv();
  const jar = await cookies();
  jar.set(COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Revoke current session (if any) and clear cookie. */
export async function destroyCurrentSession() {
  const token = await getSessionToken();
  if (token) {
    try {
      await revokeSessionByToken(token);
    } catch {
      /* still clear cookie */
    }
  }
  await clearSessionCookie();
}

export { toSessionUser };
